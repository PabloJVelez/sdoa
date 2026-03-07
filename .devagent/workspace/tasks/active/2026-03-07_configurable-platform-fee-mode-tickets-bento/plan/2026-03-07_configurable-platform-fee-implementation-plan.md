# Configurable Platform Fee Mode for Tickets and Bento — Implementation Plan

- Owner: PabloJVelez
- Last Updated: 2026-03-07
- Status: Draft
- Related Task Hub: `.devagent/workspace/tasks/active/2026-03-07_configurable-platform-fee-mode-tickets-bento/`
- Stakeholders: PabloJVelez (Owner, Decision Maker)
- Notes: Plan assumes research and clarification are done; first implementation task verifies payment context and locks strategy (provider vs workflow).

---

## PART 1: PRODUCT CONTEXT

### Summary
The storefront sells chef event tickets and delivered bento boxes. Platform commission is currently a single percentage of the cart (`PLATFORM_FEE_PERCENT`). This work introduces config-driven commission modes: for tickets, fee can be a fixed dollar amount per ticket or a percentage of the ticket; for bento, a percentage of the box value or a set dollar amount per box. Product type is inferred from variant SKU (`EVENT-*` = ticket; everything else = bento/other). The implementation must remain compatible with Stripe Connect (single `application_fee_amount` per PaymentIntent) by aggregating per-line fees into one total.

### Context & Problem
- **Current state:** Stripe Connect provider in `apps/medusa/src/modules/stripe-connect/service.ts` applies one percentage to the full cart amount via `calculateApplicationFee(amountInCents)`. No line-item or product-type awareness.
- **User/business need:** Operator wants to charge tickets and bento differently (e.g. $X per ticket vs Y% of bento), driven by env/config without code changes.
- **Trigger:** Clarification packet and research (see References) validated scope: separate config per type, per-unit cents env vars, SKU-based distinction with a future note for tag/attribute.

### Objectives & Success Metrics
- **Product:** Platform fee is computed per line using ticket vs bento rules and config (per-unit or percentage per type). Single aggregate fee is sent to Stripe.
- **Technical:** Config is env-driven; provider (or a workflow step) has access to line-level data (cart_id or precomputed fee). Fallback when line data is unavailable: current percentage-of-cart behavior.
- **Validation:** Checkout with mixed cart (tickets + bento) produces the correct `application_fee_amount`; carts with only tickets or only bento respect their respective mode and amount.

### Users & Insights
- **Primary:** Internal operator/admin configuring commission (env vars or future admin UI). No end-customer-facing change.
- **Insight:** Clarification confirmed SKU prefix `EVENT-*` for tickets; bento/other = everything else. Future improvement: product tag or attribute for type.

### Solution Principles
- Config-driven: no code change required to switch between per-unit and percentage per product type.
- Preserve Stripe Connect contract: one `application_fee_amount` per PaymentIntent; fee logic produces a sum.
- Graceful fallback: if cart/line data is unavailable, use existing percentage-of-total behavior.
- Type-safe, testable fee calculation; follow Medusa v2 and project patterns (see Implementation Guidance).

### Scope Definition
- **In Scope:** Env vars for modes and amounts (tickets + bento); fee calculation that uses line items (via context.cart_id or precomputed fee); provider changes to read new config and apply new fee logic; unit and integration tests; .env.example and brief docs.
- **Out of Scope / Future:** Admin UI for fee config; product tag/attribute for type (document as future improvement); multi-currency or region-specific fee rules; changes to storefront checkout UX.

### Functional Narrative
- **Trigger:** Customer completes checkout; payment session is created (or updated).
- **Flow:** System resolves cart (if context provides cart_id) or receives precomputed fee (if workflow option chosen). For each line, variant SKU is checked: `EVENT-*` → ticket, else bento. Per line, fee = either (mode per_unit → fixed cents × quantity, or mode percent → line total × percent). Sum = `application_fee_amount`. If no line data, fee = cart total × current `PLATFORM_FEE_PERCENT`.
- **Acceptance:** Stripe PaymentIntent is created/updated with the computed `application_fee_amount`; logs or tests confirm correct classification and sum.

### Technical Notes & Dependencies
- **Research finding:** Provider receives only `amount`, `currency_code`, and `context` (documented: no cart_id/line items). Options: (A) use `context.resource_id` as cart_id if Medusa sets it and resolve cart → line items → SKU in provider; (B) custom workflow step adds cart_id or line summary to context; (C) workflow step precomputes fee and passes it in context; provider applies it. Task 1 verifies and selects.
- **Dependency:** Medusa payment module and (if needed) cart/link/query for line items. Existing Stripe Connect provider and `medusa-config` provider options.

---

## PART 2: IMPLEMENTATION PLAN

### Scope & Assumptions
- **Scope focus:** Medusa backend only: config, stripe-connect provider, and (if needed) one workflow step. No storefront or admin UI changes.
- **Key assumptions:** (1) `context` may include a resource id (e.g. cart_id) when session is created from cart—to be verified in Task 1. (2) When context does not provide line data, fallback to current percentage-of-total. (3) Refunds/updatePayment: fee recalculated from current amount or proportional; exact rule documented in code/tests.
- **Out of scope:** Delivery dates; rollout/process tasks; performance SLAs unless specified.

### Implementation Tasks

#### Task 1: Verify payment context and choose implementation strategy
- **Objective:** Determine what the payment provider receives in `input.context` when a session is created from a cart (e.g. `resource_id`, `cart_id`, `payment_collection_id`). Document finding and choose strategy: (A) provider resolves cart from context, (B) custom step adds cart_id/line_items to context, or (C) workflow step precomputes fee and passes it in context.
- **Impacted Modules/Files:** None (discovery). Output: update to `research/2026-03-07_payment-provider-context-line-items.md` or this plan’s “Technical Notes” / “Risks” with the finding and decision.
- **References:** Research packet `research/2026-03-07_payment-provider-context-line-items.md`; Medusa docs or source for `createPaymentSessionsWorkflow` / `createPaymentSessionStep` and the code that builds `InitiatePaymentInput`.
- **Dependencies:** None.
- **Acceptance Criteria:** (1) Documented what (if anything) is passed in `context` that identifies the cart or payment collection. (2) Decision recorded: A, B, or C with one-sentence rationale. (3) If A: confirm provider can resolve cart → line items → variant SKU via container (e.g. Query or cart module).
- **Testing Criteria:** N/A (discovery only). Optional: log `input.context` in provider in dev to capture a real payload.
- **Validation Plan:** Review of the updated research/plan by owner; no code merge until strategy is chosen.

#### Task 2: Add env vars and provider config shape
- **Objective:** Introduce environment variables and extend Stripe Connect provider options and internal config so fee logic can be mode- and amount-driven per type (tickets vs bento).
- **Impacted Modules/Files:** `apps/medusa/medusa-config.ts`, `apps/medusa/src/modules/stripe-connect/types.ts`, `apps/medusa/src/modules/stripe-connect/service.ts` (constructor only), `apps/medusa/.env.example` (or project .env template).
- **References:** Clarification packet (separate config per type; `PLATFORM_FEE_PER_TICKET_CENTS`, `PLATFORM_FEE_PER_BOX_CENTS` when per-unit).
- **Dependencies:** Task 1 (strategy may affect whether config is read in provider only or also in a workflow step).
- **Acceptance Criteria:** (1) New env vars: e.g. `PLATFORM_FEE_MODE_TICKETS`, `PLATFORM_FEE_MODE_BENTO` (values e.g. `per_unit` | `percent`), `PLATFORM_FEE_PER_TICKET_CENTS`, `PLATFORM_FEE_PER_BOX_CENTS`; optional `PLATFORM_FEE_PERCENT_TICKETS`, `PLATFORM_FEE_PERCENT_BENTO` (default to existing `PLATFORM_FEE_PERCENT` when in percent mode). (2) `StripeConnectProviderOptions` and `StripeConnectConfig` extended; constructor normalizes and validates. (3) Backward compatible: when new envs unset, behavior remains current (single `PLATFORM_FEE_PERCENT` on full amount). (4) .env.example updated with comments.
- **Testing Criteria:** Unit test: config builder produces correct modes and amounts from env; missing env falls back to percent and existing fee percent.
- **Validation Plan:** Unit tests; manual run with env set to per_unit and percent for each type.

#### Task 3: Implement per-line fee calculation and wire into provider (or workflow)
- **Objective:** Implement the fee calculation that, given line-level data (or precomputed fee), produces the platform fee: classify each line by SKU (`EVENT-*` = ticket, else bento), apply mode and amount per type, sum. Integrate into the provider’s `initiatePayment` (and `updatePayment` if applicable) or into a workflow step that passes the fee to the provider.
- **Impacted Modules/Files:** `apps/medusa/src/modules/stripe-connect/service.ts` (fee calculation, possibly cart resolution); optionally a new workflow/step under `apps/medusa/src/workflows/` or API route that builds context (if Option B or C).
- **References:** Clarification (SKU rule, modes, cents); Research (options A/B/C).
- **Dependencies:** Task 1 (strategy), Task 2 (config).
- **Acceptance Criteria:** (1) Pure function or class method that, given lines `{ sku, quantity, unit_price }` (or equivalent) and config, returns total fee in smallest currency unit. (2) Ticket = SKU starts with `EVENT-`; bento = rest. (3) Per-unit mode: fee = (per_ticket_cents × ticket_qty) + (per_box_cents × bento_qty). (4) Percent mode: fee = sum over lines of (line_total × percent for that type). (5) When no line data: use existing `calculateApplicationFee(amount)` (percentage of total). (6) Provider (or workflow) uses this to set `application_fee_amount` on PaymentIntent. (7) `updatePayment` behavior documented (e.g. recalc from new amount with same rules or proportional).
- **Testing Criteria:** Unit tests: (a) all tickets, per_unit and percent; (b) all bento, per_unit and percent; (c) mixed cart; (d) empty or missing line data → fallback. Integration: create payment session for a cart with mixed items and assert fee amount (or mock provider and assert call).
- **Subtasks (optional):**
  1. Extract or add `calculatePlatformFeeFromLines(lines, config)` (and optional `getCartLines(cartId)` if Option A) — validation: unit tests.
  2. In `initiatePayment`, if context has cart_id (or precomputed fee): compute fee and set `application_fee_amount`; else call existing `calculateApplicationFee(amount)` — validation: integration test.
- **Validation Plan:** Unit tests for fee function; integration test for payment session creation; manual checkout with mixed cart and Stripe dashboard check.

#### Task 4: Resolve cart to line items in provider (if Option A) or add workflow step (if B/C)
- **Objective:** If Task 1 chose Option A: from `context.cart_id` (or resource_id), resolve cart → line items → variant SKU via Medusa container (cart module, links, or Query). If Option B: add or override a step that injects `cart_id` or `line_items` into context before the provider is called. If Option C: add a step that computes platform fee and sets e.g. `context.platform_fee_amount`; provider reads it and uses it as `application_fee_amount`.
- **Impacted Modules/Files:** `apps/medusa/src/modules/stripe-connect/service.ts` (Option A: inject cart/link/query, get line items); or `apps/medusa/src/workflows/` / store API (Option B or C). Medusa core workflow override or custom route only if necessary.
- **References:** Research “Options A/B/C”; Medusa docs for Query, cart module, links.
- **Dependencies:** Task 1, Task 3.
- **Acceptance Criteria:** (1) For chosen option: provider receives either line-level data (A/B) or precomputed fee (C). (2) No regression: when context does not contain the new data, provider falls back to current percentage-of-total. (3) Errors (e.g. cart not found) handled and logged; fallback applied.
- **Testing Criteria:** Integration test: payment session created with cart containing ticket and bento; assert correct `application_fee_amount`. Optionally: test without cart_id → fallback behavior.
- **Validation Plan:** Integration test; manual run with mixed cart.

#### Task 5: Tests, env docs, and future-improvement note
- **Objective:** Add unit tests for fee calculation (all modes and line types); add integration test for payment session with mixed cart; update .env.example and any README or docs; add a short comment or doc note on future improvement (product tag/attribute for type).
- **Impacted Modules/Files:** `apps/medusa/src/modules/stripe-connect/` (tests next to service or in `__tests__`), `apps/medusa/.env.example`, `docs/` or README if present; plan or research doc for future-improvement note.
- **References:** Project testing patterns (`.cursor/rules/testing-patterns-unit.mdc`, `testing-patterns-integration.mdc`); clarification “future improvement”.
- **Dependencies:** Tasks 2–4.
- **Acceptance Criteria:** (1) Unit tests cover: per_unit and percent for ticket-only, bento-only, mixed; fallback when no lines. (2) At least one integration test: create payment session (or mock provider) and assert fee. (3) .env.example lists new vars with brief comments. (4) Future-improvement note (tag/attribute) in code or docs.
- **Testing Criteria:** All new tests pass; existing Stripe Connect tests still pass.
- **Validation Plan:** CI/local test run; reviewer check for coverage of modes and fallback.

### Implementation Guidance
- **From `.cursor/rules/medusa-development.mdc`:** Follow Medusa v2 patterns; use dependency injection; type safety and error handling; validate inputs. API routes use Zod where applicable. Use `MedusaError` for domain errors.
- **From `.cursor/rules/typescript-patterns.mdc`:** Prefer interfaces for object shapes; use type guards for validation; avoid `any`; document with JSDoc where helpful.
- **From `apps/medusa/src/modules/stripe-connect/service.ts`:** Fee is currently computed in `calculateApplicationFee(amount)`; `initiatePayment` and `updatePayment` use it. Preserve logging with `LOG_PREFIX` and existing Connect behavior (destination, on_behalf_of, refund_application_fee).
- **From `research/2026-03-07_payment-provider-context-line-items.md`:** If using context.resource_id as cart_id, document the contract and handle missing/invalid cart gracefully (fallback to percentage-of-total).

---

## Risks & Open Questions

| Item | Type | Owner | Mitigation / Next Step | Due |
|------|------|-------|------------------------|-----|
| Medusa core may not pass cart_id in context | Risk | Dev | Task 1 verifies; if not, implement Option B or C (custom context or precompute). | Before Task 3 |
| Refund/updatePayment fee semantics with per-line logic | Question | PabloJVelez | Define rule (proportional vs recompute); document in code and tests. | Task 3 |
| Reliance on undocumented context fields | Risk | Dev | Document “we require context.cart_id” (or equivalent) and add custom step if needed. | Task 1/4 |

---

## Progress Tracking
Refer to the AGENTS.md file in the task directory for instructions on tracking and reporting progress during implementation.

---

## Appendices & References
- **Clarification:** `clarification/2026-03-07_initial-clarification.md`
- **Research:** `research/2026-03-07_payment-provider-context-line-items.md`
- **Task hub:** `AGENTS.md` in this task directory
- **Code:** `apps/medusa/medusa-config.ts`, `apps/medusa/src/modules/stripe-connect/service.ts`, `apps/medusa/src/modules/stripe-connect/types.ts`
- **Cursor rules:** `.cursor/rules/medusa-development.mdc`, `.cursor/rules/typescript-patterns.mdc`, `.cursor/rules/testing-patterns-unit.mdc`, `.cursor/rules/testing-patterns-integration.mdc`
