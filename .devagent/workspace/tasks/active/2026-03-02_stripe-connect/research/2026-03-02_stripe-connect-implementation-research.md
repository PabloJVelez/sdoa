# Stripe Connect Implementation Research

- **Date**: 2026-03-02
- **Classification**: Implementation design
- **Scope**: Payment provider customization for Stripe Connect (platform fee, destination charges) in this codebase; alignment with reference implementation from sibling project.
- **Task Hub**: `.devagent/workspace/tasks/active/2026-03-02_stripe-connect/`

---

## Inferred Problem Statement

What is required to implement Stripe Connect on this project, and how does the current codebase align with the reference implementation patterns (Medusa v2 payment provider, Stripe Connect destination charges, env vars, webhooks)?

**Assumptions [INFERRED]:**
- Implementation should mirror the sibling project’s Stripe Connect design (custom provider, configurable platform fee, destination charges, optional `on_behalf_of`).
- Reference materials from task intake (research, clarification, implementation plan, environment-variables doc) describe the target design; they are not in-repo but were provided by the owner.
- This repo currently has only the standard Stripe provider; no `stripe-connect` module exists yet.

---

## Research Plan (What Was Validated)

1. Current payment provider registration and usage (medusa-config, provider id format).
2. Frontend and backend coupling to payment provider id (`pp_stripe_stripe`).
3. Module layout in `apps/medusa/src/modules/` and pattern for adding a payment provider (custom resolve).
4. Environment variables: existing `.env.template` vs Connect-related vars.
5. Seed/scripts that reference payment provider id (regions, checkout).
6. Medusa v2 payment provider pattern (custom resolve + id → provider id; reference implementation uses `stripe-connect` → `pp_stripe-connect_stripe-connect`).

---

## Sources

### Internal (this repo)

- **Payment config**: `apps/medusa/medusa-config.ts` (lines 141–153) — `@medusajs/medusa/payment` with single provider `@medusajs/medusa/payment-stripe`, `id: 'stripe'`, options `{ apiKey: STRIPE_API_KEY }`. 2026-03-02.
- **Env template**: `apps/medusa/.env.template` — only `STRIPE_API_KEY`; no Connect vars. 2026-03-02.
- **Storefront provider id usage**: `apps/storefront/app/components/checkout/StripePayment/StripeElementsProvider.tsx` (line 18), `StripePaymentForm.tsx` (lines 26, 125), `CheckoutPayment.tsx` (lines 24, 34), `libs/util/server/data/cart.server.ts` (line 117), `app/routes/api.checkout.shipping-methods.ts` (line 57), `api.checkout.complete.ts` (lines 71–73) — all use `pp_stripe_stripe`. 2026-03-02.
- **Seed scripts**: `apps/medusa/src/scripts/seed.ts` (line 90, 96), `apps/medusa/src/scripts/seed-menus.ts` (line 137) — regions created with `payment_providers: ['pp_stripe_stripe']`. 2026-03-02.
- **Module pattern**: `apps/medusa/src/modules/file-b2/index.ts`, `resend/index.ts` — `ModuleProvider(Modules.FILE|NOTIFICATION, { services: [...] })`. Payment uses a different pattern: payment *module* with `providers: [{ resolve, id, options }]`; custom provider is a separate package or local path (e.g. `./src/modules/stripe-connect`) with `id: 'stripe-connect'`. 2026-03-02.

### Reference (from task intake; sibling project)

- Task AGENTS.md summary: custom Stripe Connect provider, destination charges, `application_fee_amount`, `transfer_data[destination]`, optional `on_behalf_of`, provider id `stripe-connect` (Medusa id `pp_stripe-connect_stripe-connect`), config-driven fee/refund/Stripe-fee pass-through, currency-aware amounts, webhook handling.
- Research/clarification/implementation-plan and environment-variables doc (content provided in new-task intake) — not duplicated here; see task References.

### External (authoritative)

- Medusa v2 payment provider: [Medusa docs – Payment Provider](https://docs.medusajs.com/resources/references/payment/provider) (implementation pattern).
- Stripe Connect: [Stripe Connect – Destination charges](https://docs.stripe.com/connect/destination-charges), [Application fees](https://docs.stripe.com/connect/marketplace/tasks/app-fees).

---

## Findings & Tradeoffs

### 1. Current state

- **Backend**: Single payment provider, `resolve: '@medusajs/medusa/payment-stripe'`, `id: 'stripe'`. Medusa exposes this as provider id `pp_stripe_stripe` (payment module + provider id).
- **Frontend**: Six+ places hardcode `pp_stripe_stripe` for session lookup, payment form, checkout completion, and shipping-methods API.
- **Seeds**: Two scripts create regions with `payment_providers: ["pp_stripe_stripe"]`.
- **Env**: `.env.template` has only `STRIPE_API_KEY`. No `STRIPE_CONNECTED_ACCOUNT_ID`, `PLATFORM_FEE_PERCENT`, `REFUND_APPLICATION_FEE`, `USE_STRIPE_CONNECT`, `STRIPE_WEBHOOK_SECRET`, or Stripe-fee pass-through vars.

### 2. Provider id and frontend impact

- If the new provider is registered with `id: 'stripe-connect'` and resolve `./src/modules/stripe-connect`, the effective provider id will be `pp_stripe-connect_stripe-connect` (per reference and Medusa’s `pp_<module>_<id>`-style naming).
- **Implication**: All references to `pp_stripe_stripe` must be updated to `pp_stripe-connect_stripe-connect` (or to a single constant/env) in:
  - Storefront: `StripeElementsProvider.tsx`, `StripePaymentForm.tsx`, `CheckoutPayment.tsx`, `cart.server.ts`, `api.checkout.shipping-methods.ts`, `api.checkout.complete.ts`.
  - Medusa: `seed.ts`, `seed-menus.ts`.
- **Alternative**: Keep provider `id: 'stripe'` and implement Connect in a custom provider that still resolves as the “stripe” provider (e.g. custom module that registers with id `stripe`). Then frontend and seeds need no id change, but the provider is conceptually “Stripe Connect” while still named “stripe”; reference project later switched to `stripe-connect` for clarity.

### 3. Module structure

- No `stripe-connect` directory under `apps/medusa/src/modules/`. Existing modules (e.g. `file-b2`, `resend`) use `ModuleProvider(Modules.FILE|NOTIFICATION, { services: [ServiceClass] })`.
- Payment is different: the payment *module* is `@medusajs/medusa/payment`; each provider is a separate “resolve” (package or path). So we add a **payment provider** (not a full Medusa “module” in the same sense as FILE). The reference implementation uses a local module at `src/modules/stripe-connect/` with a service extending `AbstractPaymentProvider` and an index that exports the provider for the payment module’s `providers` array. Pattern: `resolve: './src/modules/stripe-connect'`, `id: 'stripe-connect'`, `options: { apiKey, connectedAccountId, feePercent, ... }`.

### 4. Environment variables

- Add to `.env.template` and docs (aligned with reference env doc):
  - **When using Connect**: `USE_STRIPE_CONNECT`, `STRIPE_CONNECTED_ACCOUNT_ID` (required if Connect on), `PLATFORM_FEE_PERCENT`, `REFUND_APPLICATION_FEE`, `STRIPE_WEBHOOK_SECRET`.
  - **Optional**: `PASS_STRIPE_FEE_TO_CHEF`, `STRIPE_FEE_PERCENT`, `STRIPE_FEE_FLAT_CENTS`.
- Storefront already uses `STRIPE_PUBLIC_KEY` (publishable key); no change for Connect from customer’s perspective.

### 5. Webhooks

- Reference implementation implements `getWebhookActionAndData` with Connect-specific event handling and session correlation (e.g. `resource_id` → `session_id` → PaymentIntent id). Same webhook endpoint can be used; secret may need to be the Connect-enabled webhook secret in Stripe Dashboard.

### 6. Currency and amounts

- Reference uses a currency-aware smallest-unit helper (zero-/two-/three-decimal currencies). Medusa v2 may pass amounts in different units; the custom provider must convert to Stripe’s smallest unit (e.g. cents for USD) when creating PaymentIntents and application_fee_amount.

---

## Recommendation

1. **Add a custom Stripe Connect payment provider** (mirror reference): new code under `apps/medusa/src/modules/stripe-connect/` (e.g. `service.ts`, `types.ts`, `index.ts`, optional `utils/get-smallest-unit.ts`), implementing `AbstractPaymentProvider` with destination charges, `application_fee_amount`, optional `on_behalf_of`, config-driven refund and fee pass-through, and `getWebhookActionAndData`.
2. **Config**: In `medusa-config.ts`, either replace the existing Stripe provider with the new one or add it alongside and control usage via region. Recommended: replace with single provider `resolve: './src/modules/stripe-connect'`, `id: 'stripe-connect'`, and pass options from env (apiKey, connectedAccountId when `USE_STRIPE_CONNECT=true`, feePercent, refundApplicationFee, webhookSecret, etc.).
3. **Frontend and seeds**: Update all `pp_stripe_stripe` references to `pp_stripe-connect_stripe-connect` (or a shared constant) so checkout, payment session, and region seeding use the new provider id.
4. **Env and docs**: Extend `.env.template` and project docs with Connect-related variables and behavior (see reference environment-variables doc).
5. **Region payment_providers**: After rollout, ensure existing regions use `pp_stripe-connect_stripe-connect` (migration or re-seed/Admin update). Seed scripts should use the new id.

---

## Repo Next Steps (Checklist)

- [ ] Create `apps/medusa/src/modules/stripe-connect/` with types, service (initiatePayment with Connect params, authorize, capture, refund with config-driven `refund_application_fee`, cancel, delete, retrieve, update, getWebhookActionAndData), optional currency util, and index (payment provider export).
- [ ] Update `apps/medusa/medusa-config.ts`: payment module providers → single entry for `./src/modules/stripe-connect`, `id: 'stripe-connect'`, options from env.
- [ ] Add Connect-related env vars to `apps/medusa/.env.template` and document (platform/connected account, fee %, refund behavior, webhook secret, optional Stripe fee pass-through).
- [ ] Replace `pp_stripe_stripe` with `pp_stripe-connect_stripe-connect` (or shared constant) in storefront: `StripeElementsProvider.tsx`, `StripePaymentForm.tsx`, `CheckoutPayment.tsx`, `cart.server.ts`, `api.checkout.shipping-methods.ts`, `api.checkout.complete.ts`.
- [ ] Update `apps/medusa/src/scripts/seed.ts` and `seed-menus.ts`: `payment_providers: ['pp_stripe-connect_stripe-connect']`.
- [ ] Configure Stripe Dashboard: Connect, connected account, webhook endpoint and secret; set env in dev/staging/production.
- [ ] Test: create payment session, complete checkout in test mode, verify application fee and transfer to connected account; test refund with `REFUND_APPLICATION_FEE` false/true.

---

## Risks & Open Questions

| Item | Type | Note |
|------|------|------|
| Existing regions in DB | Risk | Regions may still have `pp_stripe_stripe`. Need migration or manual Admin update to add/switch to `pp_stripe-connect_stripe-connect`. |
| Frontend constant | Improvement | Centralize provider id in a shared constant (e.g. storefront + backend) to avoid repeated string literals. |
| Platform vs connected account | Open | Confirm for this project (same as reference: platform = developer, connected = single vendor). Owner: PabloJVelez. |
| Fee % and refund default | Open | Reuse reference defaults (e.g. 5%, no refund of platform fee) or customize. Owner: PabloJVelez. |
