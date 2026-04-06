# Research — Stripe Connect Express + direct charges (sdoa repo)

- **Classification:** Implementation design — migrate from Custom + destination charges to Express + direct charges; chef as merchant of record where applicable.
- **Task hub:** `.devagent/workspace/tasks/active/2026-04-05_stripe-connect-express-direct-charges-migration/`
- **Storage path:** `.devagent/workspace/tasks/active/2026-04-05_stripe-connect-express-direct-charges-migration/research/2026-04-05_stripe-connect-express-direct-charges-migration.md`
- **Date:** 2026-04-05

## Inferred problem statement

The **sdoa** codebase implements Stripe Connect with **Custom** connected accounts and **destination charges**, plus optional **`passStripeFeeToChef`** gross-up of `application_fee_amount`. The goal is to **refactor** so new onboarding creates **Express** accounts and payments use **direct charges**, making the connected account the primary ledger for Stripe fees, refunds, and chargebacks while the platform collects **`application_fee_amount`**.

## Assumptions

- `[INFERRED]` Product accepts Express Dashboard visibility for chefs and Stripe-hosted onboarding (already used via Account Links).
- `[INFERRED]` Migration for **existing** Custom `acct_` rows is **out of scope** for a single PR: Stripe does not change account type after creation; strategy will be dual-path, re-onboarding, or new-instance only until clarified.
- `[INFERRED]` Platform publishable key remains the same; connected account context is supplied via Stripe.js `stripeAccount` and server-side `Stripe-Account` / request options.

## Research plan (validated)

1. Map **current** payment + onboarding code paths in **this repo** (account type, PI create, refunds, persisted `payment.data`, storefront Elements).
2. Confirm **Stripe** semantics: destination vs direct (fees, refunds, disputes, API scoping).
3. Identify **required code changes** for direct charges (server: scoped requests; client: `loadStripe` options).
4. Identify **webhook** implications (account vs Connect webhooks, `event.account`).
5. Flag **admin/reporting** dependencies (`transfer_data`, platform-level PI visibility).
6. Cross-check with **sibling template** research where overlap is high.

## Sources (authoritative)

1. [Stripe — Understand how charges work in Connect](https://docs.stripe.com/connect/charges) — charge types, refunds/disputes by type, SaaS recommendation for direct charges. Accessed 2026-04-05.
2. [Stripe — Create direct charges](https://docs.stripe.com/connect/direct-charges) — `Stripe-Account` header, `application_fee_amount`, limited platform visibility, client patterns. Accessed 2026-04-05.
3. [Stripe — Connect webhooks](https://docs.stripe.com/connect/webhooks) — Connect vs account webhooks; `payment_intent.*` on connected accounts includes top-level `account`; Dashboard/API `connect: true`. Accessed 2026-04-05.
4. [Stripe — Connect authentication](https://docs.stripe.com/connect/authentication) — requesting as connected account (header). Accessed 2026-04-05 (linked from direct-charges doc).
5. **Internal (this repo):** `apps/medusa/src/modules/stripe-connect/service.ts`, `apps/medusa/src/modules/stripe-connect-account/service.ts`, `apps/storefront/app/components/checkout/StripePayment/StripeElementsProvider.tsx`, `apps/medusa/medusa-config.ts`. Reviewed 2026-04-05.
6. **Sibling artifact (external path):** `/Users/pablo/Personal/development/private-chef-template/private-chef-template/.devagent/workspace/tasks/completed/2026-04-05_stripe-connect-express-direct-charges-migration/research/2026-04-05_express-direct-charges-migration-research.md` — detailed migration notes aligned with this effort. Accessed 2026-04-05.

## Findings and tradeoffs

### A. Current implementation (sdoa)

| Area | Behavior | Primary references |
|------|----------|-------------------|
| Account type | `accounts.create` with `type: 'custom'` | ```65:79:apps/medusa/src/modules/stripe-connect-account/service.ts``` |
| PaymentIntent | Platform `paymentIntents.create` with `on_behalf_of`, `transfer_data.destination`, optional `application_fee_amount` | ```338:354:apps/medusa/src/modules/stripe-connect/service.ts``` |
| Refunds | `refunds.create({ payment_intent, refund_application_fee, amount? })` — **no** `reverse_transfer` | ```502:521:apps/medusa/src/modules/stripe-connect/service.ts``` |
| Persisted Connect fields | `application_fee_amount` + `connected_account_id` from **`transfer_data.destination`** | ```227:241:apps/medusa/src/modules/stripe-connect/service.ts``` |
| Storefront | `loadStripe(STRIPE_PUBLIC_KEY)` **without** `stripeAccount` | ```15:15:apps/storefront/app/components/checkout/StripePayment/StripeElementsProvider.tsx``` |
| Webhooks (provider) | `getWebhookActionAndData` handles `payment_intent.*` / `charge.refunded` on **platform-signed** events | ```737:856:apps/medusa/src/modules/stripe-connect/service.ts``` |
| Separate route | `api/webhooks/stripe-connect` for **account.updated** (onboarding status) | `apps/medusa/src/api/webhooks/stripe-connect/route.ts` (pattern noted, not fully re-audited here) |

**Stripe doc alignment:** For **destination** charges, refunds and disputes debit the **platform** balance; recovering funds from the connected account requires **transfer reversal** flows ([Stripe — Connect charges: Refunds / Disputes](https://docs.stripe.com/connect/charges)). The current refund path does not set `reverse_transfer`, which is a **liability** for remaining destination flows (called out in task `AGENTS.md` open questions).

### B. Express vs Custom (API)

- Replace `type: 'custom'` with `type: 'express'` in `Stripe.AccountCreateParams`; capabilities requested today (`card_payments`, `transfers`) remain the norm for card acceptance + payouts.
- Hosted **Account Links** (`type: 'account_onboarding'`) already used in ```109:114:apps/medusa/src/modules/stripe-connect-account/service.ts``` — same pattern applies to Express.
- **Product tradeoff:** Chefs get an **Express Dashboard** (Stripe-hosted) vs Custom’s typical white-label / no-dashboard posture.

### C. Direct charges — server

- Create PaymentIntents **on the connected account**: `stripe.paymentIntents.create(params, { stripeAccount: connectedAccountId })`.
- Set **`application_fee_amount`** on that PI when platform commission (and any gross-up policy) applies; **omit** `transfer_data` and **`on_behalf_of`** for the destination-charge pattern (charge already lives on the connected account).
- **All subsequent** PI operations used by the provider today (`retrieve`, `update`, `capture`, `cancel`, `refunds.create` for the PI) must use the same **`{ stripeAccount }`** request option when Connect + direct-charge mode is active. Otherwise the platform account will not find the object or will act on the wrong account.

### D. Direct charges — storefront (Stripe.js)

- Stripe docs: direct charge objects exist on the connected account; client integration must use the connected account context (see [Create direct charges](https://docs.stripe.com/connect/direct-charges) — Stripe.js `stripeAccount` / Elements).
- **Gap:** `StripeElementsProvider` only passes `clientSecret`; for direct charges, **`loadStripe(publishableKey, { stripeAccount: connectedAccountId })`** is required so `confirmPayment` targets the correct account.
- **`connected_account_id`** is already returned in provider `data` at initiate time (```361:368:apps/medusa/src/modules/stripe-connect/service.ts```). The payment session exposed to the storefront must continue to include it (or an equivalent) so the provider can initialize Stripe.js correctly.

### E. Persisted `payment.data` and admin UI

- `persistDataFromPaymentIntent` today derives `connected_account_id` from **`transfer_data.destination`**, which **disappears** on direct charges. Persist **`connected_account_id`** from the known connected account id used at create time (or from PI fields Stripe exposes — do not rely on `transfer_data`).
- **`pass_stripe_fee_to_chef`** / `stripe_processing_fee_estimate` are **economic** overlays; with direct charges, **who pays Stripe processing** is governed by Connect **fee billing** settings ([fee payer behavior](https://docs.stripe.com/connect/direct-charges-fee-payer-behavior)). The gross-up may become **redundant** or **misleading** if fees are already debited from the connected account — product should decide whether to simplify config after migration.

### F. Webhooks and Medusa

- Stripe states **account webhooks** exclude charges created **directly on connected accounts**; **Connect webhooks** (`connect: true` / “Events on Connected accounts”) deliver those events and include a top-level **`account`** property ([Connect webhooks](https://docs.stripe.com/connect/webhooks)).
- **Implication:** Medusa’s payment module webhook listener (configured with `STRIPE_WEBHOOK_SECRET`) must receive **Connect**-delivered `payment_intent.*` events if fulfillment still depends on `getWebhookActionAndData`. `[NEEDS CLARIFICATION]` exact Dashboard endpoint configuration vs Medusa docs for payment webhooks in this deployment, and whether one secret can cover both account and Connect endpoints or if routing must be unified.

### G. Reporting and ops

- Direct charges: platform has **limited visibility**; queries need **`Stripe-Account`** scoping ([direct charges doc — Platform visibility limitations](https://docs.stripe.com/connect/direct-charges)).
- Any future automation that listed PIs from the platform secret alone will miss direct charges unless Connect reporting or account-scoped APIs are used.

## Recommendation

1. **Phase 1 (design):** Decide **charge model flag** (`destination` vs `direct`) and **account type** for **new** accounts only; document **Custom + destination** deprecation path and **refund/dispute** ownership messaging for chefs.
2. **Phase 2 (backend):** Implement direct-charge PI create + **thread `stripeAccount` through every** Stripe call in `StripeConnectProviderService` when in direct mode; fix **`persistDataFromPaymentIntent`** to not depend on `transfer_data`.
3. **Phase 3 (frontend):** Pass **`stripeAccount`** into `loadStripe` (from payment session `data.connected_account_id`).
4. **Phase 4 (webhooks):** Configure Stripe **Connect webhook** to hit the Medusa payment webhook URL (or approved proxy) and validate signature + `event.account` handling if Medusa core does not surface `account` to the provider — **verify against Medusa v2 payment webhook pipeline** during `devagent create-plan`.
5. **Parallel hardening:** For any retained destination flows, evaluate **`reverse_transfer`** on refunds per [destination charge refunds](https://docs.stripe.com/connect/destination-charges#issue-refunds).

## Repo next steps (checklist)

- [ ] Run `devagent clarify-task` — fee billing (“Stripe handles pricing”), dual-path vs cutover, webhook strategy.
- [ ] Run `devagent create-plan` — file-level tasks, env flags (`CHARGE_TYPE=direct|destination`), migration playbook for existing `acct_` rows.
- [ ] Spike: Medusa payment webhook + Connect webhook **end-to-end in test mode** (single event path for `payment_intent.succeeded`).
- [ ] Audit admin widgets (`order-commission-widget`, `order-stripe-payout`) for assumptions about `transfer_data` / platform-visible PIs.
- [ ] Re-read sibling template `stripe-connect-custom-to-express-migration.md` and completed plan for reusable task breakdown.

## Risks and open questions

- **Webhook dual delivery:** Account vs Connect endpoints and signing secrets — risk of **missed** `payment_intent.succeeded` if only platform (non-Connect) webhooks are configured after switching to direct charges.
- **Medusa provider contract:** Whether `getWebhookActionAndData` receives Connect events unchanged; if not, custom middleware or extended listener may be required.
- **`updatePayment`:** Today recalculates fees; must use scoped PI update and align **per-line fee** + `passStripeFeeToChef` with direct mode (same caveats as current cart-line path).
- **Express compliance / capabilities:** Confirm country-specific requirements for `express` vs `custom` for your supported regions.
- **Existing chefs:** Re-onboarding creates **new** `acct_` — DB row and env `STRIPE_CONNECTED_ACCOUNT_ID` (if used) need a defined migration.
