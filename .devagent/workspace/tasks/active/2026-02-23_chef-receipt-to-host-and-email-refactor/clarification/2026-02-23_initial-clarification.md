# Clarified Requirement Packet — Enable Chef to Send Receipts to Host and Refactor Event Emails

- Requestor: PabloJVelez
- Decision Maker: PabloJVelez
- Date: 2026-02-23
- Mode: Task Clarification
- Status: Complete
- Related Task Hub: `.devagent/workspace/tasks/active/2026-02-23_chef-receipt-to-host-and-email-refactor/`
- Notes: Session 1 complete. All critical gaps addressed.

## Task Overview

### Context
- **Task name/slug:** 2026-02-23_chef-receipt-to-host-and-email-refactor
- **Business context:** Add chef-send-receipt-to-host (with optional tip) from reference project (medusa2-chefV); refactor existing event-flow emails to a receipt-style display. Emails live in `apps/medusa/src/modules/resend/emails`.
- **Stakeholders:** PabloJVelez (Owner/Decision Maker)
- **Prior work:** Task hub AGENTS.md; reference plan/research/clarification from medusa2-chefV `.devagent/workspace/tasks/completed/2026-01-15_chef-send-receipt-to-host/` (attached in new-task request).

### Clarification Sessions
- Session 1: 2026-02-23 — PabloJVelez; scope, order of work, codebase parity.

---

## Clarified Requirements

### Scope & End Goal

**What needs to be done?**
- Implement the chef-send-receipt-to-host feature (with optional tip amount/method) following the reference plan (medusa2-chefV): tip fields on chef event, send-receipt workflow, subscriber, receipt email template, API route, SDK/hooks, admin UI, Resend template registration.
- Refactor all five existing event emails to use a common receipt-style layout so they look consistent with the new receipt email.

**What's the end goal architecture or state?**
- Chefs can send receipt emails to hosts from the admin when conditions are met (event date passed or all tickets purchased), with optional tip.
- All event-flow emails (chef-event-accepted, chef-event-rejected, chef-event-requested, event-details-resend, order-placed) plus the new receipt share the same receipt-style layout: header (chef name + label), Bill To + receipt meta section, line-item-style content, totals where applicable, thank-you section, footer (chef contact). Layout and styling are defined by the reference receipt component (header table, info section with bill-to/meta, line items table, totals table, thank-you section, footer).

**Receipt-style definition (from reference code):**
- Header: dark bar with chef name (left) and label e.g. "RECEIPT" (right).
- Info section: left = "BILL TO" + customer name/email/phone (with green accent); right = Receipt #, Date, Status (e.g. PAID).
- Line items: description left, amount right; optional gratuity line.
- Totals: Subtotal, optional Gratuity, divider, Total (emphasized).
- Thank-you section: centered, light green background.
- Footer: contact link and phone, copyright.
- Shared styles: container, typography, colors (e.g. #16a34a green, #1a1a1a dark), spacing. Existing emails should adopt this structure and style system (shared layout component or design tokens) so they read like receipts.

**In-scope (must-have):**
- Receipt feature: model/migration (tipAmount, tipMethod), workflow, subscriber, receipt template, API route, SDK/hooks, admin UI (button + tip modal), Resend registration.
- Email refactor: all five existing templates (chef-event-accepted, chef-event-rejected, chef-event-requested, event-details-resend, order-placed) refactored to receipt-style layout/styling.

**Out-of-scope (won't-have):**
- Per reference plan: receipt numbering/ID system, tip analytics dashboard (deferred).
- Payment-reminder feature (not in scope for this task).

**Order of work (clarified):**
- Implement receipt feature first (full stack), then refactor existing emails to receipt-style.

---

### Technical Constraints & Requirements

**Platform/technical constraints:**
- Medusa v2 patterns (workflows, subscribers, API routes, Resend module).
- React Email components for all templates; styling consistent with reference receipt (inline styles / shared style object).

**Architecture requirements:**
- Receipt: API route → workflow → subscriber → email template → admin UI (per reference plan).
- Assume parity with medusa2-chefV for chef-event concepts, admin routes, and Resend setup; adapt only if differences are found during implementation.

**Quality bars:**
- Receipt template supports optional tip (amount + method); validation per reference clarification (numeric non-negative tip, method when tip provided).
- Refactored emails preserve current information and behavior; only layout and visual style change to match receipt-style.

---

### Dependencies & Blockers

**Technical dependencies:**
- Chef event model: add `tipAmount` (number, nullable) and `tipMethod` (string, nullable); migration required.
- Resend notification service and existing email send paths (available).
- Inventory/ticket availability for button enablement (existing).
- Reference: medusa2-chefV receipt implementation and provided ReceiptEmailComponent code as design/layout source.

**Assumption:** No known differences between sdoa and medusa2-chefV for this feature (admin, routes, Resend). Plan assumes parity; implementation can add a quick alignment check if desired.

**Blockers or risks:** None identified.

---

### Implementation Approach

**Implementation strategy:**
- Follow reference implementation plan (medusa2-chefV) for the receipt feature.
- Order: (1) Receipt feature end-to-end; (2) Refactor the five existing emails to receipt-style using the reference receipt component structure and styles (extract shared layout/components or replicate structure per template as appropriate).

**Patterns:**
- Receipt: same as reference (workflow updates emailHistory and tip fields, emits event; subscriber builds payload and sends via Resend).
- Email refactor: use reference ReceiptEmailComponent as the layout/style spec—header, Bill To + meta, line items, totals, thank-you, footer—adapted for each email’s content (event details, rejection, request, order placed, etc.).

---

### Acceptance Criteria & Verification

**How will we verify this works?**
- Receipt: Button appears when event is confirmed, has productId, and (event date passed OR availableTickets === 0). Tip modal allows optional amount and method (cash / other with custom text). Receipt email includes event details, pricing, optional gratuity; tip stored on chef event; email history updated.
- Refactor: All five existing emails render with receipt-style layout (header, bill-to/meta area, line-item-style body, totals if applicable, thank-you, footer); no regression in data or send behavior; preview/server still works.

**What does "done" look like?**
- [ ] Receipt feature implemented and usable from admin (button, modal, send, history).
- [ ] All five existing emails refactored to receipt-style; visual consistency with reference receipt.
- [ ] Tests/manual checks for receipt send (with/without tip) and email rendering.

---

## Question Tracker

| # | Question | Status |
|---|----------|--------|
| 1 | Which emails to refactor and what “receipt-style” means | ✅ answered |
| 2 | Order of work (receipt first vs refactor first) | ✅ answered |
| 3 | Known differences from reference project (sdoa vs medusa2-chefV) | ✅ answered |

---

## Clarification Session Log

### Session 1: 2026-02-23
**Participants:** PabloJVelez

**Questions Asked:**

**1. Which emails should be refactored to “receipt-style,” and what does that mean here?**
- **Answer: A** — All five existing emails should share a common receipt-like layout (e.g. shared header/sections/footer). Stakeholder also provided the reference receipt component code from the other project; receipt-style is defined by that component (header table, Bill To + receipt meta, line items, totals, thank-you section, footer, and associated styles).

**2. What order of work do you want for the plan?**
- **Answer: A** — Implement the receipt feature first (model, workflow, subscriber, receipt template, API, SDK/hooks, admin UI), then refactor existing emails to receipt-style.

**3. Are there any known differences in this repo (sdoa) vs medusa2-chefV we should explicitly account for in the plan?**
- **Answer: A** — No; assume parity (same chef-event concepts, admin routes, Resend setup). Adapt only if we find differences during implementation.

**Unresolved Items:** None.

---

## Assumptions Log

| Assumption | Owner | Validation Required | Validation Method | Status |
|------------|-------|---------------------|-------------------|--------|
| Receipt feature pattern from medusa2-chefV applies here (API → workflow → subscriber → template → admin UI). | PabloJVelez | No | Reference plan | Validated |
| Receipt-style = layout and styling from the provided ReceiptEmailComponent (header, Bill To/meta, line items, totals, thank-you, footer). | PabloJVelez | No | Clarification + reference code | Validated |
| Assume parity with medusa2-chefV for admin, routes, Resend; adapt on discovery. | PabloJVelez | No | Clarification | Validated |

---

## Gaps Requiring Research

None. All critical gaps addressed in clarification. Research (e.g. confirming payment-reminder/chef-event patterns in this repo and listing current email structures) can be done during plan creation if needed.

---

## Next Steps

### Spec Readiness Assessment
**Status:** ✅ Ready for Plan | ⬜ Research Needed | ⬜ More Clarification Needed

**Plan Readiness Assessment:**
- Critical gaps addressed: scope (receipt + refactor all five to receipt-style), receipt-style definition (reference component), order (receipt first, then refactor), parity assumption.
- No blockers; enough information to create an implementation plan.

**Rationale:** Scope, technical approach, order of work, and acceptance criteria are clear. Reference plan and receipt code provide a concrete implementation and design spec. Plan can list tasks for receipt feature then refactor, and can reference the provided receipt component for the shared layout/style.

### Recommended Actions

**If plan-ready:**
- [ ] Hand validated requirement packet to `devagent create-plan`.
- [ ] Provide link: `.devagent/workspace/tasks/active/2026-02-23_chef-receipt-to-host-and-email-refactor/clarification/2026-02-23_initial-clarification.md`.
- [ ] Highlight for plan: (1) Receipt feature first (reference plan + medusa2-chefV pattern), (2) Refactor all five emails to receipt-style using reference ReceiptEmailComponent structure/styles, (3) Assume parity with reference project; add alignment check in plan if desired.

**Reference for plan:** The receipt-style layout and styles are defined by the ReceiptEmailComponent code provided in the clarification session (header, info section with Bill To + meta, line items, totals, thank-you, footer; green accent #16a34a, dark #1a1a1a; shared typography and spacing). Existing templates should be adapted to this structure while preserving their current content and behavior.
