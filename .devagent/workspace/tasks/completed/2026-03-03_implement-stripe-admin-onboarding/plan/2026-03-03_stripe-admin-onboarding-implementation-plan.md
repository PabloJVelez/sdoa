# Implement Stripe Admin Onboarding — Plan

- Owner: PabloJVelez
- Last Updated: 2026-03-03
- Status: Draft
- Related Task Hub: `.devagent/workspace/tasks/completed/2026-03-03_implement-stripe-admin-onboarding/`
- Stakeholders: Pablo (Developer/Owner, Decision Maker)
- Notes: Plan derived from research packet and clarification packet; no production env yet—greenfield migration.

---

## PART 1: PRODUCT CONTEXT

### Summary
Replace the static `STRIPE_CONNECTED_ACCOUNT_ID` environment variable with a DB-backed, admin-driven Stripe Connect onboarding flow. Admins configure the connected account via a dedicated Medusa admin page and Stripe’s hosted onboarding; the payment provider resolves the connected account from the database at payment time. This removes redeploys for onboarding changes and fails checkout clearly when Connect is enabled but no account is onboarded.

### Context & Problem
- **Current state:** Stripe Connect is implemented (`2026-03-02_stripe-connect`) with a custom payment provider that reads `STRIPE_CONNECTED_ACCOUNT_ID` from env. Changing or setting the connected account requires editing `.env` and redeploying.
- **User pain:** Operators cannot onboard or update the connected account without code/deploy access; misconfiguration (e.g. Connect enabled but missing env var) causes opaque payment failures.
- **Business trigger:** Desire to configure Stripe Connect through the admin UI in all environments (local, staging, and future production) without env-based account IDs.

Sources: [research/2026-03-03_stripe-admin-onboarding-research.md](../research/2026-03-03_stripe-admin-onboarding-research.md), [clarification/2026-03-03_initial-clarification.md](../clarification/2026-03-03_initial-clarification.md).

### Objectives & Success Metrics
- **Primary:** A customer checkout using the `stripe-connect` provider succeeds and splits fees as before, with **no reliance** on `STRIPE_CONNECTED_ACCOUNT_ID` (clarified must-have acceptance criterion).
- **Secondary:** Admin can onboard a connected account via `/app/stripe-connect`; status reflects `active` when `charges_enabled`; when no account is onboarded, checkout fails with a generic customer message and a clear server-side “no account onboarded” error for operators.

### Users & Insights
- **Primary user:** Internal admin/operator configuring Stripe Connect for the single-vendor (SDOA) platform.
- **Secondary:** End customer checking out; must see generic payment error (not internal messaging) when Connect is enabled but not onboarded.

### Solution Principles
- Single-vendor: at most one row in `stripe_connect_account`.
- Preserve `USE_STRIPE_CONNECT` and existing fee/refund semantics.
- No production migration path for existing env var required for this phase (no production env yet).
- Admin UI shows rich status (account id, key flags, selected business profile fields).

### Scope Definition
- **In Scope:** DB model and migration; `stripe-connect-account` Medusa module; admin API (GET status, POST account-link, optional DELETE); webhook for `account.updated`; payment provider updated to resolve connected account from DB; admin settings page at `/app/stripe-connect` with four states; env template updates (remove `STRIPE_CONNECTED_ACCOUNT_ID`, add `STRIPE_CONNECT_WEBHOOK_SECRET`, `MEDUSA_ADMIN_URL`).
- **Out of Scope / Future:** Multi-vendor connected accounts; vendor self-serve onboarding; auto-migration of existing `STRIPE_CONNECTED_ACCOUNT_ID` into DB; dev-only shortcuts for local onboarding (start with real Stripe test flow).

### Functional Narrative
- **Admin onboarding:** Admin opens `/app/stripe-connect`. If not connected, enters business name/email (optional), clicks “Connect with Stripe”; backend creates or reuses Stripe Custom account and returns Account Link URL; admin is redirected to Stripe hosted onboarding, then back to `/app/stripe-connect`. Webhook `account.updated` syncs `details_submitted` and `charges_enabled` to DB. Page shows status: `not_connected` | `onboarding_incomplete` | `pending_verification` | `active` with rich details when active.
- **Checkout:** When `USE_STRIPE_CONNECT` is true, provider calls account module `getConnectedAccountId()`; if none or not `charges_enabled`, throws `MedusaError.NOT_ALLOWED` with message for admins and generic failure for customer; otherwise creates PaymentIntent with `on_behalf_of`, `transfer_data.destination`, `application_fee_amount` as today.

### Technical Notes & Dependencies
- New Medusa module must be registered in `medusa-config.ts` so routes and payment provider can resolve the account service (e.g. `stripeConnectAccountModuleService`).
- Stripe Account Link `refresh_url` and `return_url` require `MEDUSA_ADMIN_URL` (e.g. `http://localhost:9000/app` for local).
- Second webhook endpoint in Stripe Dashboard for `account.updated`; signing secret stored in `STRIPE_CONNECT_WEBHOOK_SECRET`. Raw body handling for signature verification may require middleware or route-specific config (documented as open question in research).

---

## PART 2: IMPLEMENTATION PLAN

### Scope & Assumptions
- **Scope focus:** Full migration in one implementation phase (model → module → API → webhook → provider → admin UI → env cleanup).
- **Key assumptions:** Single-vendor; no production env yet; `USE_STRIPE_CONNECT` and fee env vars unchanged; AbstractPaymentProvider receives container and can resolve other services.
- **Out of scope:** Multi-vendor, vendor self-serve, auto-seed from env, delivery dates.

### Implementation Tasks

#### Task 1: Data model and migration for Stripe Connect account
- **Objective:** Add a `stripe_connect_account` table and migration so the connected account id and status can be stored in the DB.
- **Impacted Modules/Files:**
  - **New:** `apps/medusa/src/modules/stripe-connect-account/models/stripe-account.ts` — model with `id`, `stripe_account_id`, `details_submitted`, `charges_enabled`.
  - **New:** Migration file generated under `apps/medusa/src/migrations/` (or project migration directory) after running `npx medusa db:generate stripe_connect_account` (or equivalent for this model).
- **References:** Research packet §2 (Target Model); migration doc §1; [.cursor/rules/medusa-development.mdc](.cursor/rules/medusa-development.mdc) (model definition).
- **Dependencies:** None (first step).
- **Acceptance Criteria:**
  - Model defines `stripe_connect_account` with `stripe_account_id` (text), `details_submitted` (boolean, default false), `charges_enabled` (boolean, default false).
  - `npx medusa db:migrate` (or equivalent) runs successfully and creates the table.
- **Testing Criteria:** Run migration in a clean DB; verify table exists and columns match.
- **Validation Plan:** Migration runs without errors; schema matches design.

#### Task 2: Stripe Connect account module and registration
- **Objective:** Implement the `stripe-connect-account` Medusa module with a service that creates Stripe accounts, generates Account Links, syncs status from Stripe, and exposes `getConnectedAccountId()`. Register the module so it is resolvable from the container.
- **Impacted Modules/Files:**
  - **New:** `apps/medusa/src/modules/stripe-connect-account/models/stripe-account.ts` (if not created in Task 1; otherwise Task 1 delivers it).
  - **New:** `apps/medusa/src/modules/stripe-connect-account/service.ts` — `StripeConnectAccountModuleService` extending `MedusaService({ StripeAccount })` with custom methods: `getOrCreateStripeAccount(businessName?, email?, country?)`, `getAccountLink()`, `syncAccountStatus(stripeAccountId)`, `getConnectedAccountId()` (returns `stripe_account_id` only when `charges_enabled`). Use Stripe SDK and `MEDUSA_ADMIN_URL` for Account Link URLs.
  - **New:** `apps/medusa/src/modules/stripe-connect-account/index.ts` — export `Module("stripe-connect-account", { service: StripeConnectAccountModuleService })` (or equivalent so container resolves as `stripeConnectAccountModuleService`).
  - **Edit:** `apps/medusa/medusa-config.ts` — add `{ resolve: './src/modules/stripe-connect-account' }` to `modules` array (with other custom modules).
- **References:** Research packet §3; migration doc §2–3; Medusa v2 Module/MedusaService patterns in [.cursor/rules/medusa-development.mdc](.cursor/rules/medusa-development.mdc).
- **Dependencies:** Task 1 (model and migration) must be done so the service can use the model.
- **Acceptance Criteria:**
  - Module loads; server starts without errors.
  - From a test or script, resolving `stripeConnectAccountModuleService` and calling `listStripeAccounts({}, { take: 1 })` works; `getOrCreateStripeAccount` creates a Stripe Custom account and a DB row when none exists; `getAccountLink()` returns a Stripe Account Link object with `url`.
- **Testing Criteria:** Unit or integration test that resolves the service and calls `getOrCreateStripeAccount` + `getAccountLink` (or manual verification).
- **Validation Plan:** Server starts; service is resolvable; create account + get link flow works against Stripe test mode.

#### Task 3: Admin API routes for Stripe Connect status and account link
- **Objective:** Expose GET (account status) and POST (account-link URL) so the admin UI can show status and redirect to Stripe onboarding.
- **Impacted Modules/Files:**
  - **New:** `apps/medusa/src/api/admin/stripe-connect/route.ts` — GET: resolve `stripeConnectAccountModuleService`, list at most one record, optionally call `syncAccountStatus` with Stripe, return `{ account, stripe_account?, status }` with status one of `not_connected` | `onboarding_incomplete` | `pending_verification` | `active`. DELETE (optional): delete the single local record if present.
  - **New:** `apps/medusa/src/api/admin/stripe-connect/account-link/route.ts` — POST: read optional `business_name`, `email`, `country` from body; call `getOrCreateStripeAccount(...)` then `getAccountLink()`; return `{ url }` or 400 if link creation fails.
- **References:** Research packet §4; migration doc §4.
- **Dependencies:** Task 2 (module and service).
- **Acceptance Criteria:**
  - `GET /admin/stripe-connect` returns `{ account: null, status: "not_connected" }` when no record exists.
  - After at least one account exists, GET returns account + derived status; response includes rich Stripe account snapshot when retrievable (e.g. `details_submitted`, `charges_enabled`, `payouts_enabled`, `business_profile` for admin UI).
  - `POST /admin/stripe-connect/account-link` with optional body creates or reuses account and returns `{ url }` for Stripe hosted onboarding.
- **Testing Criteria:** Call GET and POST with admin auth; verify response shapes and that POST returns a valid Stripe URL.
- **Validation Plan:** Manual or automated API tests; admin UI can consume these endpoints.

#### Task 4: Webhook route for Connect account.updated
- **Objective:** Add a dedicated webhook endpoint that receives Stripe `account.updated` events and syncs DB state via the account module.
- **Impacted Modules/Files:**
  - **New:** `apps/medusa/src/api/webhooks/stripe-connect/route.ts` — POST: read `stripe-signature` header and body; if `STRIPE_CONNECT_WEBHOOK_SECRET` is set, verify with `stripe.webhooks.constructEvent` (raw body required—see Risks); on `account.updated`, resolve `stripeConnectAccountModuleService` and call `syncAccountStatus(account.id)`; return 200.
- **References:** Research packet §4, §Risks (raw body); migration doc §5.
- **Dependencies:** Task 2 (module). Stripe Dashboard must have a second webhook endpoint pointing to this URL with `account.updated` selected; secret stored in env as `STRIPE_CONNECT_WEBHOOK_SECRET`.
- **Acceptance Criteria:**
  - Webhook endpoint responds 200 for `account.updated` when signature is valid (or when secret is unset, accept for local testing if documented).
  - After Stripe sends `account.updated`, the corresponding `stripe_connect_account` row has updated `details_submitted` and `charges_enabled`.
- **Testing Criteria:** Send test `account.updated` from Stripe Dashboard or Stripe CLI; confirm DB row updated.
- **Validation Plan:** Stripe webhook test event succeeds; real onboarding flow updates DB after Stripe redirect.

#### Task 5: Payment provider — resolve connected account from DB
- **Objective:** Remove constructor requirement for `STRIPE_CONNECTED_ACCOUNT_ID`; resolve connected account id at payment time from the account module; fail with clear message when Connect is enabled but no active account.
- **Impacted Modules/Files:**
  - **Edit:** `apps/medusa/src/modules/stripe-connect/service.ts` — Remove throw when `useStripeConnect && !connectedAccountId`. Store container reference (AbstractPaymentProvider receives dependencies; ensure container is available). Add private async `getConnectedAccountId(): Promise<string | null>` that resolves `stripeConnectAccountModuleService` and returns `await service.getConnectedAccountId()`. In `initiatePayment`, `updatePayment`, `capturePayment`, `refundPayment`: replace uses of `this.config_.connectedAccountId` with `await this.getConnectedAccountId()` when Connect is enabled; if null, throw `MedusaError(MedusaError.Types.NOT_ALLOWED, "Stripe Connect is enabled but no account has been onboarded. Complete onboarding in the admin first.")`. Adjust `isConnectEnabled()` to be async or keep sync and rely on null check at use site.
  - **Edit:** `apps/medusa/src/modules/stripe-connect/types.ts` — `StripeConnectConfig`: make `connectedAccountId` optional or remove from config (provider no longer stores it; resolve at runtime). Keep `connectedAccountId` in options for backward compatibility if desired but not required when using DB.
  - **Edit:** `apps/medusa/medusa-config.ts` — Stop passing `connectedAccountId: STRIPE_CONNECTED_ACCOUNT_ID` (or pass undefined); keep other Stripe options.
- **References:** Research packet §5; migration doc §6.
- **Dependencies:** Task 2 (account module must be registered so provider can resolve it).
- **Acceptance Criteria:**
  - With `USE_STRIPE_CONNECT=true` and no row in `stripe_connect_account` (or `charges_enabled` false), initiating a payment throws the NOT_ALLOWED error and a generic payment failure is shown to the customer; server logs the clear “no account onboarded” message.
  - With an active connected account in DB, checkout succeeds and fee splitting behaves as before (no reliance on env var).
  - With `USE_STRIPE_CONNECT=false`, behavior unchanged (standard Stripe, no Connect).
- **Testing Criteria:** Unit or integration test for provider: (1) Connect enabled + no account → throw; (2) Connect enabled + account with charges_enabled → success path uses DB id; (3) Connect disabled → no DB call.
- **Validation Plan:** E2E: complete onboarding in admin, then run a storefront checkout with Connect; confirm payment and fee split. Then delete or disable account row and confirm checkout fails with expected error.

#### Task 6: Admin UI — Stripe Connect settings page
- **Objective:** Add a settings page at `/app/stripe-connect` that shows status, drives onboarding via Account Link, and displays rich account details when active.
- **Impacted Modules/Files:**
  - **New:** `apps/medusa/src/admin/routes/stripe-connect/config.ts` or inline in page — `defineRouteConfig({ label: "Stripe Connect", icon: CreditCard })`.
  - **New:** `apps/medusa/src/admin/routes/stripe-connect/page.tsx` — Fetch `GET /admin/stripe-connect`; render four states: `not_connected` (form + “Connect with Stripe” button), `onboarding_incomplete` (“Complete Stripe Setup” button), `pending_verification` (message), `active` (rich view: account id, `charges_enabled`, `payouts_enabled`, selected `business_profile` fields + “Update Account Details” button). On Connect/Complete/Update, POST to `/admin/stripe-connect/account-link` and redirect to `url`.
- **References:** Research packet §6; migration doc §7; existing admin routes pattern in `apps/medusa/src/admin/routes/experience-types/page.tsx`, `defineRouteConfig`.
- **Dependencies:** Task 3 (admin API).
- **Acceptance Criteria:**
  - Route appears in admin nav with label “Stripe Connect”.
  - Not connected: form (business name, email) and button lead to Stripe hosted onboarding.
  - Onboarding incomplete / pending / active: appropriate copy and actions; active state shows rich details (ID, flags, business profile) and Update button.
- **Testing Criteria:** Manual: open page, complete flow to Stripe and back; verify status updates after webhook.
- **Validation Plan:** Full flow: not_connected → Connect → Stripe → return → status active with details visible.

#### Task 7: Environment and documentation cleanup
- **Objective:** Remove `STRIPE_CONNECTED_ACCOUNT_ID` from code and env template; add new env vars and document both webhook secrets.
- **Impacted Modules/Files:**
  - **Edit:** `apps/medusa/medusa-config.ts` — Remove `STRIPE_CONNECTED_ACCOUNT_ID` from env reads and from provider options (already done in Task 5 if fully removed).
  - **Edit:** `apps/medusa/.env.template` (or equivalent) — Remove `STRIPE_CONNECTED_ACCOUNT_ID`; add `STRIPE_CONNECT_WEBHOOK_SECRET`, `MEDUSA_ADMIN_URL` with short comments.
  - **Docs/README:** If present, document that two webhook endpoints are needed (payment + Connect account) and their env secrets.
- **References:** Migration doc §8.
- **Dependencies:** Task 4 (webhook secret in use), Task 5 (provider no longer uses env var).
- **Acceptance Criteria:**
  - No references to `STRIPE_CONNECTED_ACCOUNT_ID` remain in code or template.
  - `.env.template` includes `STRIPE_CONNECT_WEBHOOK_SECRET` and `MEDUSA_ADMIN_URL`.
- **Testing Criteria:** Grep for `STRIPE_CONNECTED_ACCOUNT_ID` returns no matches in app code/template.
- **Validation Plan:** New clone follows template and can run Connect flow with new vars only.

### Implementation Guidance

- **From `.cursor/rules/medusa-development.mdc` — Module & Service:**
  - Use `Module("moduleName", { service: ServiceClass })` and `MedusaService({ Model })` for the account module; generated methods follow `{operation}_{ModelName}` (e.g. `createStripeAccounts`, `listStripeAccounts`, `updateStripeAccounts`). Custom methods (e.g. `getOrCreateStripeAccount`, `getAccountLink`, `syncAccountStatus`, `getConnectedAccountId`) live on the same service class.
  - API routes use `req.scope.resolve("stripeConnectAccountModuleService")` (or the exact token returned by the framework for the registered module).

- **From `.cursor/rules/medusa-development.mdc` — Validation & Errors:**
  - Use `MedusaError(MedusaError.Types.NOT_ALLOWED, "…")` for “onboarding not complete” in the payment provider; validate request body in API routes (e.g. Zod) where applicable.

- **From `.cursor/rules/typescript-patterns.mdc` (workspace):**
  - Prefer interfaces for object shapes; use type inference where clear; avoid `any`; use Zod for runtime validation at API boundaries if the project uses it elsewhere.

- **From research packet — Implementation order:**
  - Implement in task order (1 → 7). Migration must run before module; module before API and webhook; API before admin UI; provider change after module registration; env cleanup after provider and webhook are in place.

### Release & Delivery Strategy
- Single implementation phase; no phased rollout required. After all tasks: run migration, set `STRIPE_CONNECT_WEBHOOK_SECRET` and `MEDUSA_ADMIN_URL` in each environment, add Connect webhook in Stripe Dashboard, then use admin UI to onboard. No delivery dates in scope.

---

## Risks & Open Questions

| Item | Type | Owner | Mitigation / Next Step | Due |
| --- | --- | --- | --- | --- |
| Raw body for Stripe webhook signature verification | Risk | Dev | Confirm Medusa v2 way to get raw body for `/webhooks/stripe-connect`; add middleware or route config if needed. Research packet flagged this. | During Task 4 |
| Exact container token for account module service | Question | Dev | Use Medusa convention (e.g. `stripeConnectAccountModuleService`) and verify in Task 2 that routes and provider resolve the same name. | Task 2 |
| MEDUSA_ADMIN_URL per environment | Question | Dev | Document in .env.template: local `http://localhost:9000/app`, staging/prod use actual admin base URL. | Task 7 |

---

## Progress Tracking
Refer to the AGENTS.md file in the task directory for instructions on tracking and reporting progress during implementation.

---

## Appendices & References

- **Research:** [research/2026-03-03_stripe-admin-onboarding-research.md](../research/2026-03-03_stripe-admin-onboarding-research.md)
- **Clarification:** [clarification/2026-03-03_initial-clarification.md](../clarification/2026-03-03_initial-clarification.md)
- **External design doc:** User-provided `stripe-connect-onboarding-migration.md` (path in task Summary).
- **Prior Stripe Connect task:** `.devagent/workspace/tasks/completed/2026-03-02_stripe-connect/` (provider baseline).
- **Cursor rules:** `.cursor/rules/medusa-development.mdc`, `.cursor/rules/typescript-patterns.mdc`
- **Codebase entry points:** `apps/medusa/src/modules/stripe-connect/`, `apps/medusa/medusa-config.ts`, `apps/medusa/src/api/admin/`, `apps/medusa/src/admin/routes/`
