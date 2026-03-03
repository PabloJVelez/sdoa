# Stripe Connect Implementation Plan

- Owner: PabloJVelez
- Last Updated: 2026-03-02
- Status: Draft
- Related Task Hub: `.devagent/workspace/tasks/active/2026-03-02_stripe-connect/`
- Stakeholders: PabloJVelez (Owner, Decision Maker)
- Notes: Single provider with USE_STRIPE_CONNECT toggle; provider id stripe-connect (pp_stripe-connect_stripe-connect).

---

## PART 1: PRODUCT CONTEXT

### Summary

Implement Stripe Connect so the platform (developer's Stripe account) can collect a configurable 5% application fee on transactions, with the remainder transferred to a single connected account (vendor/chef). The implementation adds a custom Medusa v2 payment provider that supports both standard Stripe and Stripe Connect via an environment toggle (`USE_STRIPE_CONNECT`), enabling local development without a connected account. This project shares the same base as a sibling project where Stripe Connect is already implemented; the design follows that reference closely.

### Context & Problem

**Current state:** Medusa uses the standard Stripe provider (`@medusajs/medusa/payment-stripe`, `id: 'stripe'`) in `apps/medusa/medusa-config.ts`; all payments go to a single Stripe account with no platform fee or Connect. The storefront and seeds hardcode provider id `pp_stripe_stripe`.

**Business trigger:** The platform needs to collect a 5% commission on transactions while paying the remainder to a connected account (single vendor/chef). Local dev should still work without a connected account by using standard Stripe when `USE_STRIPE_CONNECT=false`.

**Evidence:** Research ([`research/2026-03-02_stripe-connect-implementation-research.md`](../research/2026-03-02_stripe-connect-implementation-research.md)); clarification ([`clarification/2026-03-02_initial-clarification.md`](../clarification/2026-03-02_initial-clarification.md)).

### Objectives & Success Metrics

| Objective | Metric |
|-----------|--------|
| Platform fee collection | Platform receives 5% (configurable) when Connect is on |
| Connected account payouts | Connected account receives remainder when Connect is on |
| Env-driven behavior | `USE_STRIPE_CONNECT` toggles standard Stripe vs Connect; fee %, refund behavior configurable via env |
| Checkout continuity | Storefront checkout works with new provider id; no regression when Connect off |

### Users & Insights

- **Platform (developer):** Collects application fee; uses own Stripe account as platform; manages one connected account.
- **Connected account (vendor/chef):** Receives remainder of each payment; single-account model.
- **Customers:** No visible change to checkout; payment still via Stripe.

### Solution Principles

- One custom payment provider; behavior branches on `USE_STRIPE_CONNECT` (standard Stripe vs destination charges + application fee).
- All Connect-specific values (connected account id, fee %, refund behavior, optional Stripe fee pass-through) from environment variables.
- Follow Medusa v2 payment provider interface and reference implementation patterns (destination charges, `application_fee_amount`, `transfer_data[destination]`, optional `on_behalf_of`).
- Provider identifier `stripe-connect` (Medusa provider id `pp_stripe-connect_stripe-connect`); frontend and seeds updated to use it.

### Scope Definition

- **In scope:** Custom Stripe Connect provider module; PaymentIntent creation with optional Connect params when `USE_STRIPE_CONNECT=true`; config-driven refund and optional Stripe fee pass-through; `getWebhookActionAndData` for Connect events; medusa-config update; env vars and `.env.template`; update all `pp_stripe_stripe` references to `pp_stripe-connect_stripe-connect` in storefront and seed scripts; currency-aware amount conversion.
- **Out of scope / future:** Multi-vendor (multiple connected accounts); connected account onboarding UI; rollout/process tasks (announcements, support windows).

### Functional Narrative

#### Payment flow (USE_STRIPE_CONNECT=true)

- **Trigger:** Customer completes checkout with Stripe payment.
- **Experience:** Storefront initiates payment session with provider id `pp_stripe-connect_stripe-connect`. Provider creates PaymentIntent with `application_fee_amount` (5%), `transfer_data.destination` (connected account), optional `on_behalf_of`. Customer pays; platform retains fee; remainder transfers to connected account.
- **Acceptance criteria:** PaymentIntent includes Connect params when Connect is on; payment succeeds; platform fee and transfer visible in Stripe Dashboard.

#### Payment flow (USE_STRIPE_CONNECT=false)

- **Trigger:** Same checkout; env has `USE_STRIPE_CONNECT=false` or unset.
- **Experience:** Provider creates standard PaymentIntent (no `application_fee_amount`, no `transfer_data`). Payment goes to platform account only.
- **Acceptance criteria:** Checkout completes; no Connect params; behavior matches current standard Stripe.

#### Refund flow

- **Trigger:** Admin initiates refund.
- **Experience:** Provider creates refund with `refund_application_fee` from env (default false: platform keeps fee).
- **Acceptance criteria:** Refund respects `REFUND_APPLICATION_FEE`; default keeps platform fee.

### Technical Notes & Dependencies

- **Stripe SDK:** Already available via Medusa stack.
- **Medusa v2:** AbstractPaymentProvider; payment module accepts custom resolve path and `id`.
- **Stripe Dashboard:** Connect enabled on platform account; connected account created; webhook endpoint and secret for Connect events.
- **Existing regions:** After switch, regions must have `payment_providers` including `pp_stripe-connect_stripe-connect` (seed scripts updated; existing DB may need Admin update or migration).

---

## PART 2: IMPLEMENTATION PLAN

### Scope & Assumptions

- **Scope focus:** Single custom payment provider in `apps/medusa/src/modules/stripe-connect/`; one medusa-config change; env and docs; storefront and seed provider-id updates.
- **Key assumptions:** Developer's Stripe = platform; single connected account; 5% fee default, no refund of platform fee (configurable); reference implementation (sibling project) is the pattern source.
- **Out of scope:** Multi-vendor; onboarding UI; delivery/rollout process tasks.

### Implementation Tasks

#### Task 1: Create Stripe Connect payment provider service and types

- **Objective:** Implement the core payment provider: types (options interface), service extending AbstractPaymentProvider with `USE_STRIPE_CONNECT` branching, and currency/smallest-unit helper.
- **Impacted Modules/Files:**
  - `apps/medusa/src/modules/stripe-connect/types.ts` (create)
  - `apps/medusa/src/modules/stripe-connect/service.ts` (create)
  - `apps/medusa/src/modules/stripe-connect/utils/get-smallest-unit.ts` (create, optional — currency-aware conversion)
- **References:** [Medusa Payment Provider](https://docs.medusajs.com/resources/references/payment/provider); [`research/2026-03-02_stripe-connect-implementation-research.md`](../research/2026-03-02_stripe-connect-implementation-research.md); [`reference/service-reference.ts`](../reference/service-reference.ts) (full service class to copy/adapt).
- **Dependencies:** None (first task).
- **Acceptance Criteria:**
  - Service extends AbstractPaymentProvider; static identifier `stripe-connect`.
  - Options include apiKey, useConnect (from USE_STRIPE_CONNECT), connectedAccountId, feePercent, refundApplicationFee, webhookSecret, optional passStripeFeeToChef and Stripe fee params.
  - When `useConnect` is false: initiatePayment creates standard PaymentIntent (no application_fee_amount, no transfer_data).
  - When `useConnect` is true: initiatePayment creates PaymentIntent with application_fee_amount, transfer_data.destination, optional on_behalf_of; amounts use currency-aware smallest unit.
  - authorizePayment, capturePayment, cancelPayment, retrievePayment, updatePayment, deletePayment implemented; refundPayment uses config-driven refund_application_fee.
  - getWebhookActionAndData handles Connect-relevant events and session correlation (e.g. resource_id → session_id → PaymentIntent id).
- **Testing Criteria:** Unit or integration tests for amount conversion and Connect vs non-Connect branching if project testing standards apply; otherwise manual verification in Task 5.
- **Validation Plan:** Medusa starts without errors with provider registered; create payment session in test mode with Connect on and off and verify PaymentIntent shape (Stripe Dashboard or logs).

#### Task 2: Create module provider definition and wire payment module

- **Objective:** Export the payment provider so the payment module can resolve it; ensure provider is registered under id `stripe-connect`.
- **Impacted Modules/Files:**
  - `apps/medusa/src/modules/stripe-connect/index.ts` (create)
- **References:** Research (module pattern for payment providers: resolve path + id in medusa-config); existing `file-b2/index.ts`, `resend/index.ts` for export style (payment provider export differs — export provider service/class for payment module).
- **Dependencies:** Task 1 (service and types exist).
- **Acceptance Criteria:**
  - Index exports the provider such that `resolve: './src/modules/stripe-connect'` and `id: 'stripe-connect'` in medusa-config register the provider; effective provider id is `pp_stripe-connect_stripe-connect`.
- **Testing Criteria:** Start Medusa; list payment providers for a region and confirm `pp_stripe-connect_stripe-connect` is present.
- **Validation Plan:** Run app; verify payment module loads provider; no runtime errors.

#### Task 3: Update Medusa configuration and environment variables

- **Objective:** Switch payment module to the new provider; pass options from env (apiKey, useConnect, connectedAccountId, feePercent, refundApplicationFee, webhookSecret, optional fee pass-through). Extend `.env.template` and document.
- **Impacted Modules/Files:**
  - `apps/medusa/medusa-config.ts` (modify payment module providers: replace payment-stripe with `./src/modules/stripe-connect`, id `stripe-connect`, options from env)
  - `apps/medusa/.env.template` (add USE_STRIPE_CONNECT, STRIPE_CONNECTED_ACCOUNT_ID, PLATFORM_FEE_PERCENT, REFUND_APPLICATION_FEE, STRIPE_WEBHOOK_SECRET; optional PASS_STRIPE_FEE_TO_CHEF, STRIPE_FEE_PERCENT, STRIPE_FEE_FLAT_CENTS)
  - Optional: `docs/environment-variables.md` or equivalent (document Connect vars and behavior)
- **References:** [`research/2026-03-02_stripe-connect-implementation-research.md`](../research/2026-03-02_stripe-connect-implementation-research.md); reference environment-variables doc from task intake.
- **Dependencies:** Task 2.
- **Acceptance Criteria:**
  - medusa-config payment providers array has single entry: resolve `./src/modules/stripe-connect`, id `stripe-connect`, options read from process.env (USE_STRIPE_CONNECT, STRIPE_CONNECTED_ACCOUNT_ID, PLATFORM_FEE_PERCENT, REFUND_APPLICATION_FEE, STRIPE_WEBHOOK_SECRET, etc.).
  - .env.template lists and comments all new vars; defaults where applicable (e.g. PLATFORM_FEE_PERCENT=5, REFUND_APPLICATION_FEE=false).
  - When USE_STRIPE_CONNECT is false or unset, connectedAccountId not required; provider behaves as standard Stripe.
- **Testing Criteria:** Start Medusa with only STRIPE_API_KEY and USE_STRIPE_CONNECT=false; create payment session and confirm standard PaymentIntent. With USE_STRIPE_CONNECT=true and STRIPE_CONNECTED_ACCOUNT_ID set, confirm Connect PaymentIntent.
- **Validation Plan:** Config load; env validation; manual run with both env combinations.

#### Task 4: Update storefront and seed scripts to use new provider id

- **Objective:** Replace every `pp_stripe_stripe` with `pp_stripe-connect_stripe-connect` so checkout and region seeding use the new provider.
- **Impacted Modules/Files:**
  - `apps/storefront/app/components/checkout/StripePayment/StripeElementsProvider.tsx` (provider_id check)
  - `apps/storefront/app/components/checkout/StripePayment/StripePaymentForm.tsx` (filter and providerId)
  - `apps/storefront/app/components/checkout/CheckoutPayment.tsx` (hasStripePaymentProvider, paymentOptions id)
  - `apps/storefront/libs/util/server/data/cart.server.ts` (provider_id in initiatePaymentSession)
  - `apps/storefront/app/routes/api.checkout.shipping-methods.ts` (provider_id if present)
  - `apps/storefront/app/routes/api.checkout.complete.ts` (providerId comparison)
  - `apps/medusa/src/scripts/seed.ts` (payment_providers array)
  - `apps/medusa/src/scripts/seed-menus.ts` (payment_providers array)
- **References:** Research (list of files and line references); grep results from research.
- **Dependencies:** Task 3 (provider registered as stripe-connect).
- **Acceptance Criteria:**
  - All occurrences of `pp_stripe_stripe` in the listed files are replaced with `pp_stripe-connect_stripe-connect`. Optionally introduce a shared constant (e.g. in storefront libs and backend) for the provider id to avoid magic strings.
  - Seed scripts create regions with `payment_providers: ['pp_stripe-connect_stripe-connect']`.
- **Testing Criteria:** Run seed (or ensure region has new provider); storefront checkout loads Stripe payment option and completes payment when Connect is on or off.
- **Validation Plan:** Grep for `pp_stripe_stripe` (should be zero in updated files); run seeds; smoke-test checkout.

#### Task 5: Verify payment flow and fee splitting (manual / E2E)

- **Objective:** Confirm end-to-end behavior: standard Stripe with USE_STRIPE_CONNECT=false; Stripe Connect with USE_STRIPE_CONNECT=true (platform fee, transfer to connected account); refund with REFUND_APPLICATION_FEE false/true; webhook handling.
- **Impacted Modules/Files:** None (verification only).
- **References:** [Stripe Connect Testing](https://docs.stripe.com/connect/testing); clarification packet (acceptance criteria).
- **Dependencies:** Tasks 1–4.
- **Acceptance Criteria:**
  - With USE_STRIPE_CONNECT=false: checkout completes; payment appears on platform account only; no transfer.
  - With USE_STRIPE_CONNECT=true and valid STRIPE_CONNECTED_ACCOUNT_ID: checkout completes; platform receives application fee; connected account receives transfer; webhook events process (e.g. payment_intent.succeeded).
  - Refund: platform keeps fee when REFUND_APPLICATION_FEE=false; optional test with true.
- **Testing Criteria:** Manual test in Stripe test mode with test card (e.g. 4242 4242 4242 4242); inspect Stripe Dashboard for PaymentIntent, application_fee_amount, and transfer.
- **Validation Plan:** Execute flows above; document outcome in AGENTS.md or plan progress.

### Implementation Guidance

- **From `.cursor/rules/medusa-development.mdc`:** Use TypeScript; follow Medusa v2 patterns; dependency injection; proper error handling (MedusaError); validate inputs (e.g. Zod at API boundaries). Payment provider is a service class, not a full Medusa module with models; extend AbstractPaymentProvider from `@medusajs/framework/utils`.
- **From research:** Provider id format is `pp_<module>_<id>`; with resolve `./src/modules/stripe-connect` and id `stripe-connect`, Medusa exposes `pp_stripe-connect_stripe-connect`. Use currency-aware smallest-unit conversion for amounts (zero-/two-/three-decimal currencies); reference implementation uses a small utility (e.g. getSmallestUnit). When USE_STRIPE_CONNECT is false, omit application_fee_amount and transfer_data from PaymentIntent.
- **From clarification:** Platform = developer's Stripe; connected = single vendor; 5% default, do not refund platform fee by default; support USE_STRIPE_CONNECT toggle for standard vs Connect.
- **External:** [Medusa v2 Payment Provider](https://docs.medusajs.com/resources/references/payment/provider); [Stripe Connect Destination Charges](https://docs.stripe.com/connect/destination-charges); [Stripe Application Fees](https://docs.stripe.com/connect/marketplace/tasks/app-fees).

---

## Risks & Open Questions

| Item | Type | Owner | Mitigation / Next Step | Due |
|------|------|--------|------------------------|-----|
| Existing regions in DB still have `pp_stripe_stripe` | Risk | PabloJVelez | After deployment: update regions via Admin (payment provider config) or one-time migration to add `pp_stripe-connect_stripe-connect`. Seed scripts already updated for new envs. | At rollout |
| Stripe webhook secret for Connect events | Risk | PabloJVelez | Configure webhook endpoint in Stripe Dashboard for Connect; use Connect-enabled secret in STRIPE_WEBHOOK_SECRET. | Before Task 5 |
| Reference code not in repo | Resolved | — | Full service class reference saved in task hub: `reference/service-reference.ts`. Copy/adapt into `apps/medusa/src/modules/stripe-connect/service.ts`; implement matching `types.ts` and `utils/get-smallest-unit.ts`. | — |

---

## Progress Tracking

Refer to the AGENTS.md file in the task directory (`.devagent/workspace/tasks/active/2026-03-02_stripe-connect/AGENTS.md`) for instructions on tracking and reporting progress during implementation.

---

## Appendices & References

- **Task hub:** `.devagent/workspace/tasks/active/2026-03-02_stripe-connect/`
- **Reference service (sibling project):** [`reference/service-reference.ts`](../reference/service-reference.ts) — full Stripe Connect provider service class to copy/adapt; implement matching `types.ts` and `utils/get-smallest-unit.ts` in the app.
- **Research:** [`research/2026-03-02_stripe-connect-implementation-research.md`](../research/2026-03-02_stripe-connect-implementation-research.md)
- **Clarification:** [`clarification/2026-03-02_initial-clarification.md`](../clarification/2026-03-02_initial-clarification.md)
- **Current payment config:** `apps/medusa/medusa-config.ts` (lines 141–153)
- **Cursor rules:** `.cursor/rules/medusa-development.mdc`, `.cursor/rules/typescript-patterns.mdc`
- **Medusa payment provider:** https://docs.medusajs.com/resources/references/payment/provider
- **Stripe Connect:** https://docs.stripe.com/connect/destination-charges, https://docs.stripe.com/connect/marketplace/tasks/app-fees, https://docs.stripe.com/connect/testing
