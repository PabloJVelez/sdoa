# Clarified Requirement Packet — Configurable Platform Fee Mode for Tickets and Bento

- Requestor: PabloJVelez
- Decision Maker: PabloJVelez
- Date: 2026-03-07
- Mode: Task Clarification
- Status: In Progress
- Related Task Hub: `.devagent/workspace/tasks/completed/2026-03-07_configurable-platform-fee-mode-tickets-bento/`
- Notes: First session; capturing answers incrementally.

## Task Overview

### Context
- **Task name/slug:** 2026-03-07_configurable-platform-fee-mode-tickets-bento
- **Business context:** Storefront sells chef event tickets and delivered bento boxes. Commission is currently a single percentage of the cart (PLATFORM_FEE_PERCENT). Need config-driven behavior: for tickets, fee either per-ticket (fixed $ or % of ticket) or cart-level; for bento, fee either per-box (fixed $ or % of box) or cart-level.
- **Stakeholders:** PabloJVelez (owner, decision maker)
- **Prior work:** Task hub AGENTS.md; Stripe Connect already implemented (2026-03-02), fee calculated as percentage of total amount in stripe-connect service.

### Clarification Sessions
- Session 1: 2026-03-07 — In progress (config model, product distinction, mixed carts).

---

## Clarified Requirements

*(Filled incrementally as answers are received.)*

### Scope & End Goal
- **What needs to be done:** Introduce configuration so platform fee can be computed per product type (tickets vs bento) and per mode (per-unit vs percentage/cart). Current behavior: single `PLATFORM_FEE_PERCENT` applied to full cart amount.
- **In-scope (must-have):**
  - Separate config for tickets vs bento: e.g. `PLATFORM_FEE_MODE_TICKETS` and `PLATFORM_FEE_MODE_BENTO`, each with their own mode and amount (per-unit vs percentage).
  - When mode is per-unit, use new env vars: `PLATFORM_FEE_PER_TICKET_CENTS` and `PLATFORM_FEE_PER_BOX_CENTS`; when percentage, use existing or product-type-specific percentage envs.
- **Product-type distinction (current approach):** Treat a line as a **ticket** if the product variant’s SKU starts with `EVENT-`; everything else (including bento) is **bento/other**. Aligns with storefront `isEventProduct` (SKU prefix `EVENT-`). Bento products in seeds use SKU prefix `BENTO-` (see `apps/medusa/src/scripts/seed/bento-products.ts`); chef event products are created with SKU `EVENT-{id}-{date}-{type}` (see `accept-chef-event` workflow and `apps/medusa/src/scripts/seed/README-menus.md`, `experience-types.ts`).
- **Future improvement (note for later):** Prefer a more explicit way to distinguish product types (e.g. product tag, custom attribute like `product_type: ticket | bento`, or link to experience type) instead of inferring from SKU prefix. Seed scripts to reference: `apps/medusa/src/scripts/seed/bento-products.ts`, `apps/medusa/src/scripts/seed/experience-types.ts`, `apps/medusa/src/scripts/seed/menus.ts`, `apps/medusa/src/scripts/seed/README-menus.md`.
- **Out-of-scope / Nice-to-have:** TBD.

### Technical Constraints & Requirements
- Fee calculation must remain compatible with Stripe Connect (single `application_fee_amount` per PaymentIntent); provider will need to compute total fee from line-item-level rules and pass one aggregate amount.

### Dependencies & Blockers
- Stripe Connect provider already has `calculateApplicationFee(amount)` and uses cart total; fee is percentage-based only today. Provider receives payment context (amount, and can be extended with line items/variants for SKU inspection).

### Implementation Approach
- **Product-type detection:** In payment flow, treat variant SKU `EVENT-*` as ticket, else bento/other. Use seed scripts as reference for how bento and chef experiences are added (`bento-products.ts`, `experience-types.ts`, menus).
- **Config model:** Separate envs for tickets and bento (mode + amount per type). Research will determine exact env names and how payment provider receives line/item data to compute per-line fees.
- **Verification:** TBD.

### Acceptance Criteria & Verification
- TBD.

---

## Assumptions Log

| Assumption | Owner | Validation Required | Validation Method | Status |
| --- | --- | --- | --- | --- |
| Tickets = variants with SKU starting with `EVENT-`; bento/other = everything else. | PabloJVelez | No | Clarification answer 1 (A). | Validated |
| Separate config per product type: tickets and bento each have their own mode and amount envs. | PabloJVelez | No | Clarification answer 2 (B). | Validated |
| Per-unit dollar amounts from new env vars `PLATFORM_FEE_PER_TICKET_CENTS` and `PLATFORM_FEE_PER_BOX_CENTS`. | PabloJVelez | No | Clarification answer 3 (A). | Validated |
| A better long-term approach would use product tag/attribute or experience_type instead of SKU prefix. | — | Yes | Future work; document in spec/plan. | Noted |

---

## Gaps Requiring Research

### For devagent research

**Research Question 1:** In the Stripe Connect payment provider (initiate/authorize/update), what payment context is available—cart total only, or also line items with variant SKUs?  
- Context: Fee must be computed per line using SKU (EVENT-* = ticket, else bento) and mode/amount per type.  
- Evidence needed: Medusa payment provider API (InitiatePaymentInput, etc.) and current usage in `apps/medusa/src/modules/stripe-connect/service.ts`.  
- Priority: High.  
- Blocks: Implementing line-level fee aggregation in the provider.  
- **Resolved:** See `../research/2026-03-07_payment-provider-context-line-items.md`. Provider receives amount, currency_code, and context (PaymentProviderContext: no cart_id/line items in docs). Options: use context.resource_id if set to cart_id; custom workflow context; or precompute fee in workflow and pass to provider.

---

## Clarification Session Log

### Session 1: 2026-03-07
**Participants:** PabloJVelez

**Questions Asked:**

**1. For fee calculation, how should the system know which line items are "tickets" vs "bento"?**  
→ **A.** Use the same rule as the storefront: treat a line as a ticket if the product variant’s SKU starts with `EVENT-`; everything else is bento/other. (PabloJVelez)  
- Note: Add a note for a better way to handle this in the future; refer to seed scripts for how bento and chef experiences are added (`bento-products.ts`, `experience-types.ts`, `menus.ts`, `README-menus.md`).

**2. How do you want the fee mode configured?**  
→ **B.** Separate config for tickets vs bento (e.g. `PLATFORM_FEE_MODE_TICKETS` and `PLATFORM_FEE_MODE_BENTO`, each with their own amount). (PabloJVelez)

**3. When the mode is "per ticket" or "per box" (fixed amount per unit), where should that amount come from?**  
→ **A.** New env vars, e.g. `PLATFORM_FEE_PER_TICKET_CENTS` and `PLATFORM_FEE_PER_BOX_CENTS` (with percentage envs used when mode is percentage). (PabloJVelez)

**Question tracker:**
| # | Question (short) | Status |
|---|------------------|--------|
| 1 | How to distinguish tickets vs bento for fee logic? | ✅ answered |
| 2 | One global mode vs separate config per product type? | ✅ answered |
| 3 | When using per-unit fee, where do dollar amounts come from? | ✅ answered |

**Unresolved Items:** None.

---

## Next Steps

### Spec Readiness Assessment
**Status:** ☑ Ready for Spec | ⬜ Research Needed | ⬜ More Clarification Needed

**Rationale:** Scope, config model, and product-type distinction are clarified. Research may still be needed on how the payment provider receives line/item data (cart vs line items in Medusa payment flow) and exact env naming; that can be done in devagent research or create-plan.

### Recommended Actions
- Hand this packet to **devagent research** to confirm how payment context (amount, line items, variant SKUs) is available in the Stripe Connect provider and to propose exact env var names.
- Then run **devagent create-plan** to produce the implementation plan.

---

## Change Log

- 2026-03-07: Packet created; first batch of questions sent.
- 2026-03-07: Answers recorded (1: A + seed-script note; 2: B; 3: A). Scope, implementation approach, and assumptions updated. Plan readiness set to Ready for Spec.
