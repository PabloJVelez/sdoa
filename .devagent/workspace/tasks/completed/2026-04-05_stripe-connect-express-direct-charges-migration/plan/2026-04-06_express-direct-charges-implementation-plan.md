# Stripe Connect Express + Direct Charges — Implementation Plan

- Owner: PabloJVelez
- Last Updated: 2026-04-06
- Status: Complete
- Related Task Hub: `.devagent/workspace/tasks/completed/2026-04-05_stripe-connect-express-direct-charges-migration/`
- Stakeholders: PabloJVelez (DRI)

**Upstream artifacts:** [`clarification/2026-04-05_initial-clarification.md`](../clarification/2026-04-05_initial-clarification.md), [`research/2026-04-05_stripe-connect-express-direct-charges-migration.md`](../research/2026-04-05_stripe-connect-express-direct-charges-migration.md), parent checklist `/Users/pablo/Personal/development/private-chef-template/private-chef-template/docs/porting-express-direct-charges-sibling-project.md`.

---

## PART 1: PRODUCT CONTEXT

### Summary

**sdoa** currently uses Stripe Connect **Custom** accounts and **destination charges**, with optional gross-up of `application_fee_amount` (`PASS_STRIPE_FEE_TO_CHEF`) to approximate passing card fees to the chef. The platform still bears destination-charge balance risk. This plan migrates to **Express** connected accounts and **direct charges** so the **connected account** is the primary ledger for Stripe processing fees (under **Stripe handles pricing** in Dashboard), while the platform collects **`application_fee_amount`** as platform commission only. Legacy scope: a single existing Custom account will be **manually removed** by the operator—no dual payment-mode flag.

### Context & Problem

- **Current:** `apps/medusa/src/modules/stripe-connect-account/service.ts` creates `type: 'custom'`; `stripe-connect/service.ts` sets `transfer_data.destination`, `on_behalf_of`, and creates PIs on the platform account; refunds omit `reverse_transfer` (destination semantics).
- **Target:** Parity with **private-chef-template** after its migration—see porting doc §1–§5 and quick checklist.
- **Citations:** Task research packet; [Stripe Connect charges](https://docs.stripe.com/connect/charges); [direct charges](https://docs.stripe.com/connect/direct-charges); [Connect webhooks](https://docs.stripe.com/connect/webhooks).

### Objectives & Success Metrics

- New onboarding produces an **Express** `acct_` with existing Account Link flow.
- Checkout creates **PaymentIntents on the connected account** with **`application_fee_amount`** equal to computed platform fee (no processing-fee gross-up).
- Storefront confirms payment with **`loadStripe(pk, { stripeAccount })`**.
- **STRIPE_WEBHOOK_SECRET** is tied to a Dashboard endpoint that listens to **events on connected accounts** for `/hooks/payment/stripe-connect` (provider id `stripe-connect` in this repo).
- Admin payout UI shows **Charged to customer**, **Platform commission** (`application_fee_amount`), **Chef take-home**; **no** in-app “Stripe processing fees” estimate row (chefs use Express Dashboard for processor fees).

### Users & Insights

- **Chefs / operators:** Onboard via Medusa Admin; may use Stripe Express Dashboard for payouts and processor fees.
- **Developers:** Single code path (no legacy destination mode in scope).

### Solution Principles

- **Parity first:** Match parent **`porting-express-direct-charges-sibling-project.md`** unless sdoa naming differs (e.g. `PLATFORM_FEE_MODE_BENTO` vs template’s “products” wording—**behavior** must match).
- **Scoped Stripe API:** Any PI/refund/capture/retrieve/update for Connect payments uses `{ stripeAccount: connectedAccountId }` when `useStripeConnect` is true.
- **Remove dead config:** Delete gross-up env options, provider options, util, and payment `data` fields—avoid silent no-ops.

### Scope Definition

- **In scope:** Account type, payment provider, Medusa config + `.env.template`, storefront Elements, admin payout breakdown + `order-stripe-payout` lib, deletion of `estimate-stripe-processing-fee.ts`, type cleanup, comments/docs for two webhook URLs and secrets (`STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_WEBHOOK_SECRET`).
- **Out of scope:** Dual-mode (destination + direct) feature flag; fixing destination refunds for legacy (no legacy); Stripe Dashboard **Connect → Pricing** click-ops (document only); multi-chef / multi-account per store (existing single-row model unchanged).

### Functional Narrative

#### Onboarding

- **Trigger:** Admin completes Stripe Connect widget → Account Link.
- **Outcome:** Stripe creates **Express** account; `account.updated` webhook (existing `/webhooks/stripe-connect`) syncs DB.
- **Acceptance:** New accounts are `type: express` in Stripe; charges_enabled gating unchanged.

#### Checkout payment

- **Trigger:** Customer pays on storefront.
- **Outcome:** Backend creates PI with `stripe.paymentIntents.create(params, { stripeAccount })` and `application_fee_amount` when fee &gt; 0; frontend uses platform publishable key + `stripeAccount` from `payment_session.data.connected_account_id`.
- **Acceptance:** Test-mode payment succeeds; application fee appears on platform balance; PI exists on connected account in Stripe Dashboard.

#### Admin order payout

- **Trigger:** Order detail with Connect payment.
- **Outcome:** Payout block shows gross, full `application_fee_amount` as platform commission, take-home = gross − commission; no estimated processor fee row.

### Technical Notes & Dependencies

- **Webhooks:** sdoa already has `apps/medusa/src/api/webhooks/stripe-connect/route.ts` for `account.updated` + `STRIPE_CONNECT_WEBHOOK_SECRET`. Payment events use Medusa’s `/hooks/payment/stripe-connect` — **must** be configured in Stripe as a **Connect** endpoint (listen to connected accounts). See porting doc §1.
- **Raw body:** Existing comment on Connect account webhook remains relevant for signature verification.

---

## PART 2: IMPLEMENTATION PLAN

### Scope & Assumptions

- **Scope focus:** Single-environment code migration aligned with parent checklist; operator deletes lone Custom account before go-live.
- **Key assumptions:** Provider `id` stays `stripe-connect` in `medusa-config.ts` (path segment `/hooks/payment/stripe-connect`); `pp_stripe-connect_stripe-connect` unchanged on storefront.
- **Out of scope:** Automated migration scripts for Stripe account data.

### Implementation Tasks

#### Task 1: Express connected accounts (onboarding module)

- **Objective:** New Stripe accounts are **Express**, not Custom; module comments and any admin copy reference Express where appropriate.
- **Impacted modules/files:**
  - `apps/medusa/src/modules/stripe-connect-account/service.ts` — `type: 'express'`; update file header comment (“Custom” → “Express”).
  - `apps/medusa/src/admin/widgets/stripe-connect-store-widget.tsx` — user-facing strings if they say “Custom” (grep).
- **References:** Parent porting checklist §Quick implementation (express); clarification packet.
- **Dependencies:** None (can merge first).
- **Acceptance criteria:**
  - `accounts.create` uses `type: 'express'` with same `capabilities` pattern as today.
  - Account Links still work for onboarding new accounts.
- **Testing criteria:** `yarn workspace medusa typecheck` (and `build` if CI uses it); optional manual Stripe test-mode account create.
- **Validation plan:** Typecheck; spot-check Stripe Dashboard account type after onboarding.

#### Task 2: Payment provider — direct charges, scoped API, remove fee gross-up

- **Objective:** Implement **direct charges**; thread **`stripeAccount`** through all relevant Stripe calls; remove **`passStripeFeeToChef` / estimate / `payoutAdminFieldsForAmount`**; fix **`persistDataFromPaymentIntent`** to not depend on `transfer_data.destination`.
- **Impacted modules/files:**
  - `apps/medusa/src/modules/stripe-connect/service.ts` — core logic: `initiatePayment`, `authorizePayment`, `capturePayment`, `refundPayment`, `cancelPayment`, `deletePayment`, `retrievePayment`, `getPaymentStatus`, `updatePayment`; private helpers.
  - `apps/medusa/src/modules/stripe-connect/types.ts` — remove `passStripeFeeToChef`, `stripeFeePercent`, `stripeFeeFlatCents` from options/config/payment data types; keep `application_fee_amount`, `connected_account_id`.
  - `apps/medusa/src/modules/stripe-connect/utils/estimate-stripe-processing-fee.ts` — **delete**; remove all imports/usages.
  - `apps/medusa/src/modules/stripe-connect/index.ts` — only if exports reference removed symbols.
- **References:** Task research §C–D; parent porting §2, §3, §Quick checklist.
- **Dependencies:** Task 1 (conceptually independent but ship together for E2E).
- **Acceptance criteria:**
  - When `useStripeConnect` is true: `paymentIntents.create` uses `{ stripeAccount: connectedAccountId }`; **no** `transfer_data`, **no** `on_behalf_of` for destination pattern.
  - `application_fee_amount` on PI equals platform fee only (cart % or per-line from existing `getPlatformFeeConfigFromEnv` / `calculatePlatformFeeFromLines` / `calculateApplicationFee` **without** gross-up branches).
  - Every `paymentIntents.retrieve|update|capture|cancel` and `refunds.create` for that flow uses the same `{ stripeAccount }` (derive account id from payment `data.connected_account_id` or resolved DB id—same value as at create).
  - `persistDataFromPaymentIntent` persists `application_fee_amount` and `connected_account_id` without reading `transfer_data`.
  - Returned `data` for sessions no longer includes `pass_stripe_fee_to_chef` / `stripe_processing_fee_estimate`.
- **Testing criteria:** `yarn workspace medusa typecheck`; add or extend **unit tests** if practical (e.g. mock Stripe client and assert `create` called with `{ stripeAccount }` and without `transfer_data`); run existing `__tests__/platform-fee.unit.spec.ts` after fee helper changes.
- **Validation plan:** Test-mode: create PI, authorize/capture, partial refund; confirm in Stripe Dashboard PI is under connected account.

#### Task 3: Medusa config, env template, webhook documentation

- **Objective:** Remove gross-up from config; document **two** webhook endpoints and **Connect** listening for payment hook; align with `STRIPE_CONNECT_WEBHOOK_SECRET` already used by `api/webhooks/stripe-connect`.
- **Impacted modules/files:**
  - `apps/medusa/medusa-config.ts` — remove `PASS_STRIPE_FEE_TO_CHEF`, `STRIPE_FEE_PERCENT`, `STRIPE_FEE_FLAT_CENTS` constants and provider options; keep `refundApplicationFee`, `webhookSecret`, etc.
  - `apps/medusa/.env.template` — remove commented `PASS_STRIPE_FEE_*` / `STRIPE_FEE_*`; add short comment block: payment webhook URL must use **events on connected accounts**; reference `/hooks/payment/stripe-connect` and `/webhooks/stripe-connect`; `STRIPE_WEBHOOK_SECRET` vs `STRIPE_CONNECT_WEBHOOK_SECRET` (mirror porting doc §1, §Secrets summary).
  - Optional: `README` or `docs/` only if repo already documents Stripe—**do not** add new doc files unless one already exists for payments (per user preference to avoid extra markdown); prefer `.env.template` comments.
- **References:** Parent porting §1, §5; `apps/medusa/src/api/webhooks/stripe-connect/route.ts`.
- **Dependencies:** Task 2 (provider options must match config).
- **Acceptance criteria:** No references to removed env vars in config; `.env.template` explains Connect webhook requirement for direct charges.
- **Testing criteria:** Grep for `PASS_STRIPE_FEE|passStripeFeeToChef|STRIPE_FEE_PERCENT|STRIPE_FEE_FLAT` under `apps/medusa` (except historical `.devagent`); `yarn workspace medusa typecheck`.
- **Validation plan:** Engineer configures Stripe test Dashboard per comments and verifies webhook delivery.

#### Task 4: Storefront — `loadStripe` + `stripeAccount`

- **Objective:** Stripe.js runs in the **connected account** context for Connect payments so `client_secret` validates.
- **Impacted modules/files:**
  - `apps/storefront/app/components/checkout/StripePayment/StripeElementsProvider.tsx` — `loadStripe(env.STRIPE_PUBLIC_KEY, session.data.connected_account_id ? { stripeAccount: … } : undefined)`; ensure payment session type includes `connected_account_id` from API.
  - `apps/storefront/app/components/checkout/MedusaStripeAddress/MedusaStripeAddress.tsx` — if it uses `loadStripe` for the same checkout flow, apply the same pattern (grep `loadStripe` in storefront).
- **References:** Parent porting §4.
- **Dependencies:** Task 2 (provider must return `connected_account_id` on session `data`—already present today; verify after direct-charge changes).
- **Acceptance criteria:** With Connect enabled, Elements initializes with `stripeAccount` matching `acct_` on the payment session; payment confirmation succeeds in test mode.
- **Testing criteria:** `yarn workspace storefront` typecheck/lint if configured; manual E2E payment in test mode.
- **Validation plan:** Browser network/Stripe.js no account mismatch errors; successful `confirmPayment`.

#### Task 5: Admin payout UI and `order-stripe-payout` library

- **Objective:** Remove **estimated Stripe processing fee** row and **platform commission net-of-estimate** logic; simplify types to match parent: single **Platform commission** = `application_fee_amount`.
- **Impacted modules/files:**
  - `apps/medusa/src/lib/order-stripe-payout.ts` — remove `passStripeFeeToChef`, `stripeProcessingEstimateSmallest` from return type and JSON extraction paths.
  - `apps/medusa/src/admin/components/order-stripe-payout-breakdown.tsx` — remove `showStripeFeesRow`, **Stripe processing fees** row, and `platformNetSmallest`; show **Platform commission** as full `application_fee_amount`; adjust copy per parent §3.
- **References:** Parent porting §3; clarification (no in-app processor fee estimate).
- **Dependencies:** Task 2 (payment `data` no longer emits estimate fields—UI must not depend on them).
- **Acceptance criteria:** Payout block matches simplified economics; legacy orders with old keys in `payment.data` still render safely (missing fields → no crash; treat as no pass-through row).
- **Testing criteria:** Typecheck; manual admin order view with Connect payment.
- **Validation plan:** Visual check of order detail payout section.

### Implementation Guidance

- **Medusa payment providers:** Extend `AbstractPaymentProvider` patterns already in `apps/medusa/src/modules/stripe-connect/service.ts`; keep MedusaError handling and logging style.
- **TypeScript:** Strict typing for Stripe request options; avoid `any` (workspace rules).
- **Testing:** Prefer unit tests for fee calculation (`platform-fee.ts`) and, if added, mocked Stripe client for connect options; follow `.cursor/rules/testing-patterns-unit.mdc` for structure.

### Release & Delivery Strategy (Optional)

- Operator: delete Custom account + DB row; configure Stripe Connect pricing (**Stripe handles pricing**); add/update webhook endpoints per `.env.template`; deploy backend then storefront.

---

## Risks & Open Questions

| Item | Type | Owner | Mitigation / Next Step | Due |
|------|------|--------|-------------------------|-----|
| Medusa core forwards Connect `payment_intent.*` payloads to provider webhook unchanged | Question | Dev | Verify in test mode first webhook after Task 2; if broken, escalate to Medusa docs or custom middleware | Implementation |
| `updatePayment` still uses cart-level % only for fee | Risk | Dev | Accept parity with parent §2; document in code comment | Ship |
| Raw body for `/webhooks/stripe-connect` | Risk | Ops | Already documented in route; ensure hosting preserves raw body when secret set | Deploy |

---

## Progress Tracking

Update `.devagent/workspace/tasks/completed/2026-04-05_stripe-connect-express-direct-charges-migration/AGENTS.md` Implementation Checklist and Progress Log as tasks complete.

---

## Appendices & References

- Task hub `AGENTS.md` and clarification (complete).
- Research: `research/2026-04-05_stripe-connect-express-direct-charges-migration.md`.
- Parent: `private-chef-template/docs/porting-express-direct-charges-sibling-project.md`.
- Stripe: [Connect webhooks](https://docs.stripe.com/connect/webhooks), [Create direct charges](https://docs.stripe.com/connect/direct-charges).

---

## Change Log

- 2026-04-06 — Initial plan from clarification + research + parent porting checklist.
