# Stripe Admin Onboarding — Research Packet

## Classification & Assumptions

- **Classification:** Implementation design / migration research for Stripe Connect onboarding.
- **Inferred Problem Statement:** Migrate the existing Stripe Connect implementation in SDOA from using a static `STRIPE_CONNECTED_ACCOUNT_ID` environment variable to a dynamic, admin-driven onboarding flow, so connected accounts are created and managed via the Medusa admin UI without requiring redeploys.
- **Assumptions:**
  - [INFERRED] The prior task `2026-03-02_stripe-connect` has already implemented a working Stripe Connect payment provider (`stripe-connect` module, env vars, storefront wiring) and is the current baseline.
  - [INFERRED] SDOA is single-vendor for now (one connected account), matching the completed Stripe Connect task and the migration document.
  - [INFERRED] We should preserve the `USE_STRIPE_CONNECT` feature flag and the existing application fee / refund configuration semantics.
  - [INFERRED] Admin onboarding should be accessible only to authenticated admins via a dedicated settings page in the Medusa admin.

## Research Plan (What to Validate)

1. Confirm current Stripe Connect implementation and configuration in this repo, including env variables and provider wiring.
2. Understand the proposed migration from env-based `STRIPE_CONNECTED_ACCOUNT_ID` to admin onboarding + DB-backed storage, as described in the user document.
3. Validate the recommended Medusa v2 patterns for:
   - A dedicated Stripe Connect account module/service and model.
   - Admin API routes and webhooks for account status and onboarding.
   - Admin UI route for managing onboarding state.
4. Identify required changes to the existing Stripe Connect payment provider to resolve the connected account dynamically from the DB rather than from env.
5. Enumerate environment variable and Stripe Dashboard changes (webhooks, secrets, admin URL) and their impact on existing deployments.
6. Surface key risks and open questions to address in the implementation plan.

## Sources

1. `.devagent/workspace/tasks/completed/2026-03-02_stripe-connect/AGENTS.md`  
   - Completed task hub describing the existing Stripe Connect implementation (custom provider, env vars, storefront wiring, reference service).
2. `.devagent/workspace/tasks/completed/2026-03-02_stripe-connect/clarification/2026-03-02_initial-clarification.md`  
   - Clarified requirements for Stripe Connect in SDOA (single vendor, 5% platform fee, `USE_STRIPE_CONNECT` toggle, no refund of platform fee by default).
3. `/Users/pablo/Downloads/stripe-connect-onboarding-migration.md` — “Stripe Connect: Env Var → Admin Onboarding Migration”  
   - Detailed design document outlining model, module, API, webhook, payment provider, admin UI, env, and Stripe Dashboard changes to move from env-based connected account ID to admin-driven onboarding.

## Findings & Tradeoffs

### 1. Current Stripe Connect Baseline (from completed task)

- The completed task `Implement Stripe Connect` (`2026-03-02_stripe-connect`) added:
  - A custom Stripe Connect payment provider module with provider id `stripe-connect` (Medusa provider ID `pp_stripe-connect_stripe-connect`).
  - Env-driven configuration including `STRIPE_CONNECTED_ACCOUNT_ID`, `USE_STRIPE_CONNECT`, `PLATFORM_FEE_PERCENT`, `REFUND_APPLICATION_FEE`, `STRIPE_WEBHOOK_SECRET`, and fee pass-through envs.
  - Storefront and seed scripts updated to use the new provider id.
- Business rules:
  - Platform (developer’s Stripe account) collects a configurable platform fee (e.g. 5%), connected account receives the remainder.
  - Single connected account, no multi-vendor support.
  - `USE_STRIPE_CONNECT` env toggles between standard Stripe and Connect behavior.
- **Tradeoff:** This design is simple to configure in code but couples onboarding to deployment: setting up or changing the connected account requires updating `.env` and redeploying. It also makes it easy to end up in a broken state if Connect is enabled but `STRIPE_CONNECTED_ACCOUNT_ID` is missing or invalid.

### 2. Target Model — DB-Backed Connected Account

- The migration document proposes introducing a `stripe_connect_account` model with fields:
  - `stripe_account_id` (the Stripe `acct_xxx` id),
  - `details_submitted` (boolean),
  - `charges_enabled` (boolean).
- For a single-vendor system, this table is expected to contain **at most one row**, representing the single connected account.
- A migration is generated and applied using `npx medusa db:generate` + `db:migrate`.
- **Tradeoffs:**
  - **Pros:** Centralizes onboarding state in the DB; supports dynamic onboarding and status tracking; decouples from env; prepares for future multi-vendor extension.
  - **Cons:** Adds a new table and migration to maintain; requires extra logic to keep DB state in sync with Stripe (webhooks).

### 3. Stripe Connect Account Module & Service

- The proposal introduces a `stripe-connect-account` module powered by `MedusaService` with:
  - A `StripeAccount` model (the DB entity).
  - A module service (`StripeConnectAccountModuleService`) that:
    - Creates a Stripe Custom account via `stripe.accounts.create(...)` when no record exists.
    - Stores the resulting `stripe_account_id`, `details_submitted`, and `charges_enabled` in `stripe_connect_account`.
    - Generates Account Links via `stripe.accountLinks.create(...)` with `refresh_url` and `return_url` derived from `MEDUSA_ADMIN_URL`.
    - Syncs account status from Stripe using `account.updated` events (via `syncAccountStatus`).
    - Exposes a `getConnectedAccountId` method that returns `stripe_account_id` only when `charges_enabled` is true.
- The module is registered in `medusa-config.ts` as a regular Medusa module so that:
  - API routes and webhooks can resolve `stripeConnectAccountModuleService` from the container.
  - The payment provider can also resolve this service at runtime.
- **Tradeoffs:**
  - **Pros:** Clean separation between payment provider and account lifecycle; leverages Medusa module/service patterns; re-usable across routes and webhooks.
  - **Cons:** Introduces another Stripe client instance and module; care must be taken to avoid duplicative Stripe configuration or inconsistent API versions.

### 4. Admin API & Webhook Surface

- **Admin API routes (under `/admin/stripe-connect`)**:
  - `GET /admin/stripe-connect`:
    - Returns current DB record (if any), live Stripe account snapshot (if retrievable), and a derived `status`:
      - `not_connected`, `onboarding_incomplete`, `pending_verification`, or `active`.
  - `POST /admin/stripe-connect/account-link`:
    - Calls `getOrCreateStripeAccount(...)` to ensure there is a Stripe account + DB row.
    - Calls `getAccountLink()` to generate a hosted onboarding/update URL, and returns `{ url }` to the admin.
  - `DELETE /admin/stripe-connect` (optional):
    - Deletes the local Stripe account record, effectively “disconnecting” (does not delete the Stripe account itself).
- **Webhook route `POST /webhooks/stripe-connect`**:
  - Separate from payment webhooks; listens for `account.updated` events.
  - Uses `STRIPE_CONNECT_WEBHOOK_SECRET` to verify signatures when set.
  - Calls `syncAccountStatus(account.id)` on the account module service to keep DB flags aligned with Stripe.
- **Tradeoffs:**
  - **Pros:** Clear separation of concerns (account vs payment webhooks); robust status syncing; admin can always see up-to-date status.
  - **Cons:** Requires raw body handling for Stripe signature verification; adds another webhook endpoint in Stripe Dashboard and more secrets to manage.

### 5. Payment Provider Changes — Dynamic Account Resolution

- The current provider likely:
  - Reads `connectedAccountId` from config/env.
  - Validates it eagerly in the constructor (throwing when `USE_STRIPE_CONNECT=true` but the env var is missing).
  - Uses `connectedAccountId` in `initiatePayment` and related methods to set:
    - `on_behalf_of`,
    - `transfer_data.destination`,
    - `application_fee_amount`,
    - and potentially `refund_application_fee`.
- The migration design:
  - Removes the constructor hard requirement on `STRIPE_CONNECTED_ACCOUNT_ID`.
  - Introduces an internal helper on the provider:
    - `getConnectedAccountId()` that resolves `stripeConnectAccountModuleService` from the Medusa container and returns the DB-backed `stripe_account_id` (or `null`).
  - Updates `initiatePayment` (and other relevant methods) to:
    - When `useStripeConnect` is true:
      - Attempt to obtain `connectedAccountId` via `getConnectedAccountId()`.
      - If not available or not `charges_enabled`, throw a `MedusaError.NOT_ALLOWED` with a clear message like: “Stripe Connect is enabled but no account has been onboarded. Complete onboarding in the admin first.”
      - Otherwise, apply Connect-specific fields (`on_behalf_of`, `transfer_data.destination`, `application_fee_amount`).
  - Optionally makes `isConnectEnabled()` async or keeps it sync but defers failing to the point where the account ID is required.
- **Tradeoffs:**
  - **Pros:** Payments are blocked with a clear, actionable error when onboarding isn’t complete, instead of failing cryptically; no redeploy needed when the connected account changes; safer for environments where admins might forget to set env vars.
  - **Cons:** Payment provider becomes dependent on another module via the container; more error paths; requires careful handling to avoid circular dependencies.

### 6. Admin UI — Stripe Connect Settings Page

- The migration doc describes a dedicated admin route `/app/stripe-connect` configured via `defineRouteConfig` and implemented as a React page.
- The page:
  - Calls `GET /admin/stripe-connect` to retrieve current status.
  - Renders different UI states based on `status`:
    - `not_connected`: business name/email form + “Connect with Stripe” button, which POSTs to `/admin/stripe-connect/account-link` and redirects to Stripe’s hosted onboarding.
    - `onboarding_incomplete`: message + “Complete Stripe Setup” button that also hits the account-link route.
    - `pending_verification`: informational copy about Stripe review.
    - `active`: success state with account id and an “Update Account Details” button that re-opens the Stripe hosted flow.
- **Tradeoffs:**
  - **Pros:** Puts all Stripe Connect setup into a discoverable admin settings page; simplifies support; aligns UX with other SaaS products.
  - **Cons:** Introduces frontend work in the admin app; must keep admin route configuration and API endpoints in sync; needs testing for different states and error flows.

### 7. Environment & Stripe Dashboard Changes

- **Env var changes:**
  - Remove `STRIPE_CONNECTED_ACCOUNT_ID` in favor of DB-backed storage.
  - Keep existing Stripe env vars:
    - `STRIPE_API_KEY`, `STRIPE_PUBLIC_KEY`, `USE_STRIPE_CONNECT`, `PLATFORM_FEE_PERCENT`, `REFUND_APPLICATION_FEE`, `STRIPE_WEBHOOK_SECRET`, `PASS_STRIPE_FEE_TO_CHEF`, `STRIPE_FEE_PERCENT`, `STRIPE_FEE_FLAT_CENTS`.
  - Add:
    - `STRIPE_CONNECT_WEBHOOK_SECRET` — used for `account.updated` webhooks.
    - `MEDUSA_ADMIN_URL` — used to construct Stripe Account Link `refresh_url` and `return_url` (e.g. `https://admin.yourdomain.com/app`).
- **Stripe Dashboard:**
  - Requires two webhook endpoints:
    - Existing payments webhook (e.g. `/webhooks/stripe`).
    - New connect-status webhook (`/webhooks/stripe-connect`) listening to `account.updated`.
  - Ensure Connect is enabled and Custom accounts are allowed; configure branding appropriately.
- **Tradeoffs:**
  - **Pros:** Cleaner separation of payment vs account lifecycle; more secure secret management; clearer env surface.
  - **Cons:** Additional secret to manage and rotate; more complex deployment configuration (admin URL must be correct per environment).

## Recommendation

- **Adopt the admin onboarding design from the migration document largely as-is**, with the following emphasis for SDOA:
  - Use a **single-row `stripe_connect_account` model** for the single-vendor case, keeping the schema exactly as described to allow easy future extension.
  - Implement a **dedicated `stripe-connect-account` Medusa module** that:
    - Encapsulates Stripe account creation, Account Link generation, status syncing, and `getConnectedAccountId`.
    - Is registered in `medusa-config.ts` alongside the existing `stripe-connect` payment module.
  - **Update the existing `stripe-connect` payment provider** to:
    - Remove any constructor-time dependence on `STRIPE_CONNECTED_ACCOUNT_ID`.
    - Resolve the connected account id dynamically from the account module before applying Connect-specific fields.
    - Throw a clear `MedusaError.NOT_ALLOWED` when Connect is toggled on but no active connected account exists.
  - **Implement the admin API and UI flows** for onboarding exactly as described:
    - `GET /admin/stripe-connect`, `POST /admin/stripe-connect/account-link`, and optional `DELETE /admin/stripe-connect`.
    - Admin page at `/app/stripe-connect` with four distinct states and a clear “Connect with Stripe” primary action.
  - **Introduce a dedicated Connect webhook** at `/webhooks/stripe-connect` with `STRIPE_CONNECT_WEBHOOK_SECRET` and raw-body handling to sync `details_submitted` and `charges_enabled`.
  - Keep `USE_STRIPE_CONNECT` and fee-related env vars, so environments can still run in non-Connect mode easily.

This approach aligns with Medusa v2 patterns (modules, services, typed models), keeps Connect logic cohesive, and removes the env-var coupling that currently forces redeploys for onboarding changes.

## Repo Next Steps (Checklist for Planning)

- [ ] **Data model & migration**
  - [ ] Add `stripe_connect_account` model under `apps/medusa/src/modules/stripe-connect-account/models/stripe-account.ts` (or equivalent location).
  - [ ] Generate and apply a migration that creates the table in the project’s DB.
- [ ] **Stripe Connect account module**
  - [ ] Implement `StripeConnectAccountModuleService` using `MedusaService` with methods: `getOrCreateStripeAccount`, `getAccountLink`, `syncAccountStatus`, `getConnectedAccountId`.
  - [ ] Register the module in `medusa-config.ts` so it’s available via DI as `stripeConnectAccountModuleService` (or similar token).
- [ ] **Admin API routes**
  - [ ] Implement `GET /admin/stripe-connect` to return DB and Stripe account status.
  - [ ] Implement `POST /admin/stripe-connect/account-link` to create or reuse the account and return a Stripe Account Link URL.
  - [ ] Optionally implement `DELETE /admin/stripe-connect` to clear the local account record.
- [ ] **Webhook route**
  - [ ] Implement `/webhooks/stripe-connect` for `account.updated` events, using `STRIPE_CONNECT_WEBHOOK_SECRET` and raw body handling as required.
  - [ ] Add Stripe Dashboard webhook configuration to point to this route and store the secret in env.
- [ ] **Payment provider updates**
  - [ ] Remove direct reliance on `STRIPE_CONNECTED_ACCOUNT_ID` from the `stripe-connect` payment provider.
  - [ ] Add a helper that resolves the account id from the account module and updates `initiatePayment`, `updatePayment`, `refundPayment`, and `capturePayment` as needed.
  - [ ] Ensure behavior is unchanged for non-Connect (`USE_STRIPE_CONNECT=false`) flows.
- [ ] **Admin UI**
  - [ ] Register an admin route at `/app/stripe-connect` with route config and navigation label.
  - [ ] Implement the page component to handle the four main states (`not_connected`, `onboarding_incomplete`, `pending_verification`, `active`) and to drive the onboarding flow.
- [ ] **Env & config cleanup**
  - [ ] Remove `STRIPE_CONNECTED_ACCOUNT_ID` from `apps/medusa/.env.template` and any code references.
  - [ ] Add `STRIPE_CONNECT_WEBHOOK_SECRET` and `MEDUSA_ADMIN_URL` to env templates and documentation.
  - [ ] Verify that both webhook endpoints and secrets (`STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_WEBHOOK_SECRET`) are documented.
- [ ] **Testing considerations**
  - [ ] Plan E2E flow: admin onboarding → webhook sync → checkout using Connect.
  - [ ] Add regression tests (if feasible) for error paths when Connect is enabled but not fully onboarded.

## Risks & Open Questions

- **Raw body handling for Stripe webhooks:**  
  - [NEEDS CLARIFICATION] Confirm how Medusa v2 exposes raw request bodies for specific routes and whether additional middleware is required for `/webhooks/stripe-connect`.
- **Service wiring and container tokens:**  
  - [NEEDS CLARIFICATION] Decide the exact registration name for the account module service (e.g. `"stripeConnectAccountModuleService"`) and ensure that both routes and the payment provider resolve it consistently.
- **Multi-environment admin URL configuration:**  
  - [NEEDS CLARIFICATION] Define how `MEDUSA_ADMIN_URL` should be set for local, staging, and production so that Stripe Account Link return/refresh URLs are correct in each environment.
- **Error UX in storefront when onboarding incomplete:**  
  - [NEEDS CLARIFICATION] Decide how the “no account onboarded yet” error from the payment provider should surface to end users (e.g. generic payment error vs. admin-only log/alert).
- **Future multi-vendor support:**  
  - While out of scope, confirm whether the `stripe_connect_account` schema and module design should anticipate multi-vendor expansion (e.g. storing a `vendor_id` later) to avoid breaking changes.

