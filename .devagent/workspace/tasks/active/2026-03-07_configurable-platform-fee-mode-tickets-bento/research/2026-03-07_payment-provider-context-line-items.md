# Payment Provider Context: Line Items and Variant SKU Access

- **Date:** 2026-03-07
- **Task Hub:** `.devagent/workspace/tasks/active/2026-03-07_configurable-platform-fee-mode-tickets-bento/`
- **Related clarification:** `clarification/2026-03-07_initial-clarification.md` (Gaps Requiring Research)

---

## Classification & Assumptions

- **Classification:** Implementation design — what payment context the Stripe Connect provider receives and how to obtain line-level data for fee calculation.
- **Assumptions [INFERRED]:**
  - Research question inferred from the task’s clarification packet (research gap 1).
  - Goal: compute platform fee per line (ticket vs bento via SKU `EVENT-*`) and pass a single aggregate `application_fee_amount` to Stripe.
  - Medusa v2 payment module and store checkout flow are the authority for what the provider receives.

---

## Research Plan (What Was Validated)

1. What does `InitiatePaymentInput` contain when the provider’s `initiatePayment` is called?
2. Does `context` (PaymentProviderContext) include cart_id, payment_collection_id, or line items?
3. How does the store create a payment session (SDK → API → workflow) and what is passed to the provider?
4. Can the provider obtain cart line items (and variant SKUs) via the container if context includes a resource id?
5. If the framework does not pass line items or cart id, what customization options exist?

---

## Sources (Links and Versions)

- **Internal**
  - `apps/medusa/src/modules/stripe-connect/service.ts` — current use of `input.amount`, `input.currency_code`, `input.context` (session_id, resource_id only). 2026-03-07.
  - `apps/storefront/libs/util/server/data/cart.server.ts` — `sdk.store.payment.initiatePaymentSession(cart, data, ...)`; full cart passed to API. 2026-03-07.
  - `.devagent/workspace/tasks/active/2026-03-07_configurable-platform-fee-mode-tickets-bento/clarification/2026-03-07_initial-clarification.md` — requirement: per-line fee by SKU (EVENT-* = ticket, else bento). 2026-03-07.
- **External**
  - [IPaymentProvider – initiatePayment](https://docs.medusajs.com/resources/references/types/interfaces/types.IPaymentProvider) — parameters: idempotency_key, customer, account_holder, **context** (PaymentProviderContext), data, currency_code, amount. No line items or cart_id in the documented signature. 2026-03-07.
  - [PaymentProviderContext](https://docs.medusajs.com/resources/references/types/interfaces/types.PaymentProviderContext) — properties: idempotency_key, customer, account_holder. No cart_id or line items. 2026-03-07.
  - [createPaymentSession](https://docs.medusajs.com/resources/references/payment/createPaymentSession) — CreatePaymentSessionDTO: provider_id, currency_code, amount, data, **context** (PaymentProviderContext). 2026-03-07.
  - [createPaymentSessionStep](https://docs.medusajs.com/resources/references/medusa-workflows/steps/createPaymentSessionStep) — step input: payment_collection_id, provider_id, amount, currency_code, context. Context type is PaymentProviderContext. 2026-03-07.
  - [Accept Payment in Checkout Flow](https://docs.medusajs.com/resources/commerce-modules/payment/payment-flow) — payment collection is created for cart (`createPaymentCollectionForCartWorkflow(cart_id)`); session created with `createPaymentSessionsWorkflow` (payment_collection_id, provider_id). 2026-03-07.

---

## Findings & Tradeoffs

### 1. What the provider currently receives

- In this codebase, `initiatePayment(input)` uses only:
  - `input.amount` — single amount (cart total).
  - `input.currency_code`
  - `input.context` — only `session_id` and `resource_id` are read and forwarded to Stripe metadata.
- So today: **no line items, no variant SKUs, no cart_id** are used. Fee is `calculateApplicationFee(amountInCents)` = percentage of total.

### 2. Documented payment provider API

- **InitiatePaymentInput** (from Medusa docs): amount, currency_code, context, plus customer/account_holder in the full provider interface. **Context** is typed as **PaymentProviderContext**.
- **PaymentProviderContext** (docs): idempotency_key, customer, account_holder. **No cart_id, payment_collection_id, or line items** in the documented type.
- **createPaymentSession / CreatePaymentSessionDTO**: amount, currency_code, provider_id, data, context (PaymentProviderContext). So at the API boundary, only that context is documented.

### 3. Where amount and context come from

- Storefront calls `sdk.store.payment.initiatePaymentSession(cart, { provider_id, data })`. The cart is sent to the Medusa store API; the **backend** (or core workflow) creates the payment collection/session and calls the provider. The **provider** is invoked by the Payment Module with whatever the workflow passes. The step input for `createPaymentSessionStep` includes `payment_collection_id`; the **payment collection** is linked to the cart when created via `createPaymentCollectionForCartWorkflow(cart_id)`. So the workflow has access to payment_collection and thus (via link) to cart, but the **documented** contract to the provider is only amount, currency_code, and PaymentProviderContext (customer, account_holder, idempotency_key).

### 4. Whether context is extended in practice

- This codebase already puts custom keys in context: `session_id`, `resource_id`. So the **framework or app** may populate `context.resource_id` (e.g. with cart_id or payment_collection_id). That was **not** confirmed in Medusa core source in this research; docs do not promise it.
- **Conclusion:** Out of the box, the **documented** API does **not** give the provider line items or cart_id. Whether `context.resource_id` (or similar) is set to cart_id or payment_collection_id when the session is created from a cart must be verified in the Medusa core workflow that builds the provider input.

### 5. Options to get line-level data for fee calculation

| Option | Description | Tradeoff |
|--------|-------------|----------|
| **A. Use context.resource_id if it is cart_id** | If the core flow sets `context.resource_id` to cart_id (or we add it via custom workflow), the provider can resolve the cart module from the container, load the cart, then load line items and variant SKUs (e.g. via Query or cart/link APIs), compute per-line fee (EVENT-* vs other), and sum to one `application_fee_amount`. | Depends on framework or custom step actually passing cart_id. Provider needs access to cart + line item + variant (product) data. |
| **B. Custom workflow step passes cart_id or line summary in context** | Override or wrap the step that creates the payment session so that the payload to the provider includes e.g. `context.cart_id` or `context.line_items` (e.g. array of { sku, quantity, unit_price }) so the provider does not need to load the cart. | Requires customizing Medusa core flow or the store API that builds the session. More control; avoids provider depending on cart module. |
| **C. Precompute fee in a step that has cart access** | A workflow step (with access to cart/line items) computes the platform fee and passes it (e.g. in context or in session data). The provider only applies that amount as `application_fee_amount` and does not need line items. | Fee logic lives outside the provider; provider stays a thin wrapper. Requires workflow customization and a clear contract (e.g. context.platform_fee_amount in smallest unit). |

---

## Recommendation

1. **Verify in Medusa core** whether, when creating a payment session from a cart, the workflow passes **cart_id** or **payment_collection_id** in `context` (e.g. `resource_id`) to the provider. Inspect the implementation of `createPaymentSessionsWorkflow` / `createPaymentSessionStep` (or equivalent) in `@medusajs/medusa` or the repo used by this project.
2. **If context includes cart_id (or payment_collection_id that can be resolved to cart):**
   - In the Stripe Connect provider, use it to load cart → line items → variants (SKU). Implement the clarified fee rules (per-ticket vs per-bento, percentage vs fixed cents) and set `application_fee_amount` to the sum. Document dependency on cart/link/query resolution and error handling when context is missing or resolution fails.
3. **If context does not include cart_id or payment_collection_id:**
   - Prefer **Option C** (precompute fee in a workflow step that has cart access) so the provider stays simple and the fee logic is testable with full cart data. Alternatively implement **Option B** (custom context with cart_id or line_items) and have the provider compute the fee from that.
4. **Env and config:** Align with the clarification packet: separate config for tickets vs bento (e.g. `PLATFORM_FEE_MODE_TICKETS`, `PLATFORM_FEE_MODE_BENTO`), and when mode is per-unit use `PLATFORM_FEE_PER_TICKET_CENTS` and `PLATFORM_FEE_PER_BOX_CENTS`. Exact env names can be finalized in the implementation plan.

---

## Repo Next Steps (Checklist)

- [ ] Inspect Medusa core (or local override) for the step/workflow that calls the payment provider’s `initiatePayment`: confirm what is passed in `input.context` (e.g. resource_id, cart_id, payment_collection_id). Add finding to this doc or the implementation plan.
- [ ] If context includes a cart or collection id: implement in the Stripe Connect provider the resolution of cart → line items → variant SKU; then implement per-line fee (EVENT-* = ticket, else bento) and sum; add tests and fallback when context/resolution is missing (e.g. fall back to current percentage-of-total behavior).
- [ ] If context does not: implement either (a) a custom workflow/step that passes cart_id or line summary in context and keep fee logic in the provider, or (b) a workflow step that precomputes platform fee and passes it in context/session data and have the provider use it as `application_fee_amount`.
- [ ] Add env vars and config (modes + per-ticket/per-box cents) per clarification; wire them in the provider (or in the precompute step if Option C).
- [ ] Update AGENTS.md and the clarification packet with the research artifact link and the “context verified” or “custom flow chosen” decision.

---

## Risks & Open Questions

- **Risk:** Reliance on undocumented or implementation-specific `context` fields (e.g. `resource_id`) may break on Medusa upgrades. Prefer documenting the contract (e.g. “we require context.cart_id”) and, if needed, a small custom step that sets it.
- **Open:** Exact Medusa version and the exact file path of the workflow step that builds `InitiatePaymentInput` for the provider were not inspected in-repo (node_modules/core-flows); a quick grep or look at the Medusa GitHub repo for `createPaymentSession` / `initiatePayment` is recommended before implementing.
- **Open:** Refunds and `updatePayment`: today the provider recalculates fee from the new amount on update. With per-line fee, partial refunds or amount changes would need a consistent rule (e.g. proportional fee reduction or recompute from cart state if still available).
