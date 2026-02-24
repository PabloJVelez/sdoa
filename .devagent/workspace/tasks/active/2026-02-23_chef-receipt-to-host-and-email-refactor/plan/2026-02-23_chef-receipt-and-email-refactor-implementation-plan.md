# Enable Chef to Send Receipts to Host and Refactor Event Emails — Implementation Plan

- Owner: PabloJVelez
- Last Updated: 2026-02-23
- Status: Draft
- Related Task Hub: `.devagent/workspace/tasks/active/2026-02-23_chef-receipt-to-host-and-email-refactor/`
- Stakeholders: PabloJVelez (Owner/Decision Maker)
- Notes: Receipt feature first (Tasks 1–9), then email refactor (Tasks 10–11). Reference: medusa2-chefV plan and clarification packet.

---

## PART 1: PRODUCT CONTEXT

### Summary
Chefs need to send receipt emails to hosts after chef events (when the event date has passed or all tickets are purchased), with optional tip amount for expense documentation. This project also needs all event-flow emails to use a consistent receipt-style layout (header, Bill To/meta, line items, totals, thank-you, footer) so communications look professional and consistent. The receipt feature is implemented first; then the five existing email templates are refactored to that layout.

### Context & Problem
- Event-flow emails live in `apps/medusa/src/modules/resend/emails` (chef-event-accepted, chef-event-rejected, chef-event-requested, event-details-resend, order-placed). There is no way for chefs to send a formal receipt to hosts after an event.
- Hosts may need receipts for expense reimbursement; chefs often receive tips (cash or other) and that amount should be includable in the receipt. Layout and styling currently vary by template; a unified receipt-style improves clarity and brand consistency.

### Objectives & Success Metrics
- **Primary:** Chefs can send receipt emails to hosts from the admin when conditions are met (event date passed or all tickets purchased), with optional tip.
- **Secondary:** All event emails share a common receipt-style layout and styling.
- **Success:** Receipt button visible when appropriate; tip optional; receipt and refactored emails render correctly and preserve existing behavior.

### Users & Insights
- **Primary:** Chefs using the admin to manage events.
- **Secondary:** Hosts receiving receipt emails (and existing event emails).
- **Insight:** Tip is often added after the event (cash/other); optional tip and method (cash / Venmo / Zelle / PayPal / Other) must be supported.

### Solution Principles
- Follow existing patterns: resend-event-email workflow and subscribers (e.g. `chef-event-accepted`) as the architectural model for send-receipt.
- Receipt-style layout is defined by the reference ReceiptEmailComponent: header, Bill To + meta, line items, totals, thank-you, footer; colors (#16a34a, #1a1a1a); shared typography and spacing.
- Assume parity with reference project (medusa2-chefV) for chef-event and Resend; adapt only when differences are found.

### Scope Definition
- **In scope:** Receipt feature (model/migration, workflow, subscriber, receipt template, API route, SDK/hooks, admin UI with button and tip modal, Resend registration). Extend GET chef-event by id to return `availableTickets` when `productId` is set. Refactor all five existing email templates to receipt-style layout.
- **Out of scope:** Receipt numbering/ID system, tip analytics dashboard, payment-reminder feature. No delivery dates or rollout process tasks.

### Functional Narrative

#### Flow: Send Receipt with Optional Tip
- **Trigger:** Chef clicks "Send Receipt" on the chef event detail page.
- **Preconditions:** Event status is `confirmed`, `productId` is set, and either the event date has passed (date-only comparison) or `availableTickets === 0`.
- **Experience:** Button opens a modal with optional tip amount (number) and tip method (Cash checkbox, or dropdown: Venmo / Zelle / PayPal / Other; if Other, text input). If a receipt was already sent for this event, show a warning/confirmation. On confirm, receipt email is sent to host; `emailHistory` is updated with type `"receipt"`; `tipAmount` and `tipMethod` are stored on the chef event when provided.
- **Acceptance:** Button visibility matches preconditions; tip is optional; validation: tip amount non-negative numeric when provided; method required when amount provided; email includes event details, pricing, optional gratuity; history and tip fields updated.

#### Flow: Receipt-Style Emails
- **Trigger:** Any existing flow that sends chef-event-requested, chef-event-accepted, chef-event-rejected, event-details-resend, or order-placed.
- **Experience:** Emails use the same receipt-style structure (header, Bill To/meta, body as line-item style, totals if applicable, thank-you, footer). Content and behavior (recipients, data) unchanged; only layout and styling align with the receipt template.
- **Acceptance:** All five templates render with the shared layout; no regression in data or send behavior; React Email preview server still works.

### Technical Notes & Dependencies
- **Data:** Add `tipAmount` (number, nullable) and `tipMethod` (string, nullable) to chef event model; migration required.
- **Receipt pipeline:** API route → send-receipt workflow (update emailHistory + tip fields, emit `chef-event.receipt`) → subscriber (build payload, send via notification with `receipt` template).
- **availableTickets:** Computed from inventory (stocked − reserved) for the product’s variant(s). GET `admin/chef-events/[id]` must return it when `productId` is set so the admin can show the receipt button.
- **Reference:** medusa2-chefV receipt implementation; ReceiptEmailComponent code provided in clarification defines layout and styles. Resend module: add `RECEIPT` to enum and template map; add subject for receipt.

---

## PART 2: IMPLEMENTATION PLAN

### Scope & Assumptions
- **Scope:** Full receipt feature then refactor of five emails to receipt-style.
- **Assumptions:** Parity with medusa2-chefV for chef-event and Resend; inventory module available for ticket availability; event date comparison is date-only (ignore time).
- **Out of scope:** Receipt numbering, tip analytics, payment-reminder.

### Implementation Tasks

#### Task 1: Add Tip Fields to Chef Event Model and Create Migration
- **Objective:** Add `tipAmount` and `tipMethod` to the chef event model and add a migration.
- **Impacted Modules/Files:**
  - `apps/medusa/src/modules/chef-event/models/chef-event.ts` — add tip fields to model and to `ChefEventType` if exported.
  - `apps/medusa/src/modules/chef-event/migrations/MigrationYYYYMMDDHHMMSS_add_tip_fields.ts` — new migration (use timestamp from migration generator).
  - `apps/medusa/src/sdk/admin/admin-chef-events.ts` — add `tipAmount?` and `tipMethod?` to `AdminChefEventDTO` (and related DTOs if used).
- **References:** Clarification packet (scope, tip storage); existing migration `Migration20251209010000_add_pickup_fields.ts` (pattern: addSql, up/down).
- **Dependencies:** None.
- **Acceptance Criteria:** Model has `tipAmount` (number, nullable) and `tipMethod` (text, nullable); migration adds columns and has reversible `down()`; SDK types include tip fields.
- **Testing Criteria:** Migration runs and rolls back cleanly; TypeScript compiles.
- **Subtasks:**
  1. Add `tipAmount: model.number().nullable()` and `tipMethod: model.text().nullable()` to model.
  2. Create migration that adds `tip_amount` (numeric) and `tip_method` (text) columns to `chef_event`; implement `down()` to drop them.
  3. Update `AdminChefEventDTO` (and `ChefEventType` in model file if used by SDK) with optional tip fields.
- **Validation Plan:** Run migration; run typecheck.

#### Task 2: Extend GET admin/chef-events/[id] to Return availableTickets
- **Objective:** When `productId` is set, compute and return `availableTickets` (inventory stocked − reserved for that product’s variant(s)) so the admin can show the receipt button when all tickets are sold or event has passed.
- **Impacted Modules/Files:**
  - `apps/medusa/src/api/admin/chef-events/[id]/route.ts` — in GET, after retrieving chef event, if `chefEvent.productId` exists, resolve inventory module and product/variants, sum (stocked_quantity − reserved_quantity) across levels, add `availableTickets` to response.
  - `apps/medusa/src/sdk/admin/admin-chef-events.ts` — add `availableTickets?: number` to `AdminChefEventDTO` (or document that API response includes it on the object).
- **References:** `apps/medusa/src/workflows/accept-chef-event.ts` (inventory module usage: listInventoryLevels, stocked_quantity, reserved_quantity); Medusa v2 inventory API.
- **Dependencies:** None.
- **Acceptance Criteria:** GET `admin/chef-events/:id` returns `chefEvent` with `availableTickets` when `productId` is set; when no product or no inventory, `availableTickets` can be 0 or omitted.
- **Testing Criteria:** For a confirmed event with productId and inventory, response includes numeric `availableTickets`.
- **Validation Plan:** Manual or integration test: create accepted event with product, call GET, assert `availableTickets` present.

#### Task 3: Create Send Receipt Workflow
- **Objective:** Workflow that updates email history with a receipt entry, updates tip fields when provided, and emits `chef-event.receipt` for the subscriber.
- **Impacted Modules/Files:**
  - `apps/medusa/src/workflows/send-receipt.ts` — new file.
- **References:** `apps/medusa/src/workflows/resend-event-email.ts` (updateEmailHistoryStep, emitEventStep, WorkflowResponse); clarification (recipients default to host email, tip optional).
- **Dependencies:** Task 1 (tip fields exist).
- **Acceptance Criteria:** Workflow input: `chefEventId`, optional `recipients`, `notes`, `tipAmount`, `tipMethod`. Steps: update `emailHistory` with type `"receipt"`; update `tipAmount`/`tipMethod` and `lastEmailSentAt` when provided; emit `chef-event.receipt` with data needed for email; return updated chef event and email-sent status.
- **Testing Criteria:** Workflow runs without error; emailHistory and tip fields updated; event emitted.
- **Subtasks:**
  1. Define `SendReceiptWorkflowInput` type.
  2. Create step to append receipt entry to `emailHistory` and update `lastEmailSentAt`; optionally update `tipAmount`/`tipMethod`.
  3. Use `emitEventStep` for `chef-event.receipt` with chefEventId, recipients, tipAmount, tipMethod, etc.
  4. Return `WorkflowResponse` with updated chef event.
- **Validation Plan:** Unit or integration run of workflow with mock container.

#### Task 4: Create Receipt Email Subscriber
- **Objective:** Subscriber that listens for `chef-event.receipt`, loads chef event and product, builds email payload (customer, booking, event, product, purchasedTickets, totalPurchasedPrice, tipAmount, tipMethod, chef, requestReference, receiptDate), and sends via notification service with template `receipt`.
- **Impacted Modules/Files:**
  - `apps/medusa/src/subscribers/chef-event-receipt.ts` — new file.
- **References:** `apps/medusa/src/subscribers/chef-event-accepted.ts` (resolve services, build emailData, createNotifications with template and data); clarification (receipt contents).
- **Dependencies:** Task 3 (workflow emits event); Task 5 (template exists) for send to succeed; Task 8 (template registered) for Resend to resolve template.
- **Acceptance Criteria:** Subscriber config listens for `chef-event.receipt`; handler fetches chef event and product; computes pricing and ticket info; builds payload matching ReceiptEmailProps; sends to host (or workflow-provided recipients) via notification with template `receipt`.
- **Testing Criteria:** Emit event; subscriber runs; notification created with correct template and data.
- **Validation Plan:** Trigger workflow and verify notification sent (or mock and assert payload).

#### Task 5: Create Receipt Email Template
- **Objective:** Add React Email receipt template matching the reference ReceiptEmailComponent (header, Bill To + meta, line items, totals, thank-you, footer; optional gratuity line; formatCurrency, formatDate helpers).
- **Impacted Modules/Files:**
  - `apps/medusa/src/modules/resend/emails/receipt.tsx` — new file.
- **References:** Clarification packet and ReceiptEmailComponent code provided by stakeholder (structure and styles); existing templates use `@react-email/components` and named export + default for preview.
- **Dependencies:** None.
- **Acceptance Criteria:** Template accepts ReceiptEmailProps (customer, booking, event, product, purchasedTickets, totalPurchasedPrice, tipAmount?, tipMethod?, chef, requestReference, receiptDate?, customNotes?); renders receipt layout; gratuity line only when tipAmount > 0; export default for React Email preview.
- **Testing Criteria:** Render with sample data; with and without tip; preview server shows correctly.
- **Validation Plan:** Use dev:email preview and/or unit render.

#### Task 6: Create Send Receipt API Route
- **Objective:** POST `admin/chef-events/[id]/send-receipt` that validates chef event (exists, has productId, status confirmed), validates body (recipients?, notes?, tipAmount?, tipMethod?; tip amount non-negative when provided; method when amount provided), defaults recipients to host email, runs send-receipt workflow, returns result.
- **Impacted Modules/Files:**
  - `apps/medusa/src/api/admin/chef-events/[id]/send-receipt/route.ts` — new file.
- **References:** `apps/medusa/src/api/admin/chef-events/[id]/resend-email/route.ts` (Zod schema, workflow run, error handling); clarification (validation rules).
- **Dependencies:** Task 3 (workflow).
- **Acceptance Criteria:** 404 if chef event not found or no productId; 400 if validation fails; 200 with success payload on success; tip validation per clarification.
- **Testing Criteria:** Valid request succeeds; invalid tip or missing event returns appropriate status.
- **Validation Plan:** Manual or integration tests for success and error cases.

#### Task 7: Add Send Receipt SDK Method and React Hook
- **Objective:** Expose send-receipt from SDK and admin UI via hook.
- **Impacted Modules/Files:**
  - `apps/medusa/src/sdk/admin/admin-chef-events.ts` — add `AdminSendReceiptDTO` and `sendReceipt(id, data)` calling POST `admin/chef-events/:id/send-receipt`.
  - `apps/medusa/src/admin/hooks/chef-events.ts` — add `useAdminSendReceiptMutation` (mutation calls sdk.admin.chefEvents.sendReceipt; invalidate chef-events queries on success).
- **References:** `admin-chef-events.ts` `resendEmail` and `useAdminResendEventEmailMutation` pattern.
- **Dependencies:** Task 6 (API route).
- **Acceptance Criteria:** SDK method and hook exist; hook invalidates queries so detail page refreshes after send.
- **Testing Criteria:** Call hook with valid data; verify API called and cache invalidated.
- **Validation Plan:** Use from UI and confirm receipt send and list refresh.

#### Task 8: Register Receipt Template in Resend Module
- **Objective:** Register receipt template so notification provider can resolve `receipt` and send HTML.
- **Impacted Modules/Files:**
  - `apps/medusa/src/modules/resend/service.ts` — add `RECEIPT = "receipt"` to enum; import receipt template (e.g. `receiptEmail` or default); add to `templates` map; add `getTemplateSubject` case for receipt (e.g. "Receipt" or "Your Receipt").
- **References:** Existing enum and template map in `service.ts`.
- **Dependencies:** Task 5 (template exists).
- **Acceptance Criteria:** Resend service resolves template `receipt` and returns subject for it.
- **Testing Criteria:** Send receipt notification; email received with correct subject and body.
- **Validation Plan:** End-to-end send from admin.

#### Task 9: Add Receipt Button and Tip Modal to Admin UI
- **Objective:** On chef event detail page, show "Send Receipt" button when `isConfirmed && productId && (hasEventTakenPlace || availableTickets === 0)`. Click opens modal: optional tip amount, Cash checkbox, or dropdown (Venmo/Zelle/PayPal/Other) with optional custom text; warning if receipt already sent. On confirm, call `useAdminSendReceiptMutation` with tip data; show toasts.
- **Impacted Modules/Files:**
  - `apps/medusa/src/admin/routes/chef-events/[id]/page.tsx` — receipt button, modal state, tip state, `hasEventTakenPlace` (date-only compare with requestedDate), use `availableTickets` from chefEvent (Task 2), useAdminSendReceiptMutation, toast success/error.
- **References:** Clarification (button visibility, tip UI, warning if previously sent); existing Accept/Reject modals and EmailManagementSection on same page.
- **Dependencies:** Task 2 (availableTickets in response); Task 7 (hook).
- **Acceptance Criteria:** Button visibility matches conditions; modal has tip amount and method UI; validation for tip; warning when emailHistory contains a receipt; send updates history and shows success/error toast.
- **Testing Criteria:** With confirmed event and productId, when date passed or availableTickets 0, button visible; send with/without tip; duplicate send shows warning.
- **Validation Plan:** Manual test on detail page.

#### Task 10: Extract Shared Receipt-Style Layout and Styles
- **Objective:** Extract from the receipt template (or reference code) a shared layout component and/or shared style constants so the five existing emails can reuse the same header, Bill To/meta block, line-item section, totals, thank-you, and footer without duplicating markup and styles.
- **Impacted Modules/Files:**
  - `apps/medusa/src/modules/resend/emails/` — add shared module: e.g. `receipt-layout.tsx` and/or `receipt-styles.ts` (or inline in a single layout component) with header, infoSection (Bill To + meta), divider, lineItemsSection, totalsTable, thankYouSection, footer; and style objects (main, container, headerTable, billToLabel, etc.). Receipt template refactored to use this shared layout.
- **References:** ReceiptEmailComponent structure and styles from clarification; existing emails for current content to preserve.
- **Dependencies:** Task 5 (receipt template exists).
- **Acceptance Criteria:** Shared layout/styles usable by receipt and by other templates; receipt template uses them; no visual change to receipt email.
- **Testing Criteria:** Receipt email still renders correctly after extraction.
- **Validation Plan:** Preview receipt email before/after.

#### Task 11: Refactor Five Email Templates to Receipt-Style
- **Objective:** Refactor chef-event-accepted, chef-event-rejected, chef-event-requested, event-details-resend, order-placed to use the shared receipt-style layout (header, Bill To/meta, body as line-item-style content, totals if applicable, thank-you, footer). Preserve all current data and behavior; only layout and styling change.
- **Impacted Modules/Files:**
  - `apps/medusa/src/modules/resend/emails/chef-event-accepted.tsx`
  - `apps/medusa/src/modules/resend/emails/chef-event-rejected.tsx`
  - `apps/medusa/src/modules/resend/emails/chef-event-requested.tsx`
  - `apps/medusa/src/modules/resend/emails/event-details-resend.tsx`
  - `apps/medusa/src/modules/resend/emails/order-placed.tsx`
- **References:** Task 10 (shared layout/styles); clarification (receipt-style definition); current content of each template.
- **Dependencies:** Task 10.
- **Acceptance Criteria:** Each template uses shared layout; content (customer, event, product, etc.) unchanged; visual consistency with receipt; named and default exports preserved for preview.
- **Testing Criteria:** Each email renders in preview; no regression in data passed to templates; existing send flows still work.
- **Validation Plan:** Preview all five; run existing flows that send each email.

### Implementation Guidance

- **From `.cursor/rules/medusa-development.mdc`:**
  - API routes: validate with Zod, resolve services from container, return appropriate status codes.
  - Workflows: use `createStep`, `createWorkflow`, `emitEventStep`, `WorkflowResponse`; steps can use `container.resolve()` for services.
  - Subscribers: `SubscriberArgs`, `SubscriberConfig` with `event: "chef-event.receipt"`; use `container.resolve(Modules.NOTIFICATION)` and `createNotifications` with `template` and `data`.
  - Model: `model.number().nullable()`, `model.text().nullable()` for new fields; migrations use MikroORM `Migration` with `addSql` and `up`/`down`.
  - Error handling: `MedusaError` with appropriate types.

- **From `.cursor/rules/typescript-patterns.mdc`:**
  - Use interfaces for DTOs and props; Zod for request validation; avoid `any` where possible.

- **From clarification packet:**
  - Receipt-style layout: header (chef name + label), info section (Bill To left, Receipt #/Date/Status right), line items, totals, thank-you section, footer (chef contact); colors #16a34a, #1a1a1a; shared typography and spacing.
  - Tip: optional; amount non-negative; method (cash or dropdown + optional custom) when amount provided; store in chef event and include in receipt email.

### Release & Delivery Strategy
- Implement in order: Tasks 1–9 (receipt feature), then 10–11 (refactor). No phased rollout or process tasks in this plan.
- Verification: receipt send (with/without tip), button visibility, email history; refactored emails in preview and in existing flows.

### Approval & Ops Readiness
- Code review for backend and admin changes. Manual verification of receipt send and email rendering before marking complete.

---

## Risks & Open Questions

| Item | Type | Owner | Mitigation / Next Step | Due |
|------|------|-------|------------------------|-----|
| Inventory API for product variants (stock levels) | Risk | Dev | Use Medusa v2 inventory module listInventoryLevels / product-variant link; if structure differs from accept-chef-event, adapt GET logic. | Impl |
| Event type enum (e.g. cooking_class in some files vs plated_dinner/buffet_style/pickup in model) | Question | Dev | Align receipt and subscriber with model enum; map to display labels. | Impl |
| Multiple receipts per event (warning only) | — | Clarified | Warning/confirmation in UI when emailHistory already has a receipt. | Done |

---

## Progress Tracking
Refer to the AGENTS.md file in the task directory for instructions on tracking and reporting progress during implementation.

---

## Appendices & References

- **Clarification:** `clarification/2026-02-23_initial-clarification.md` — scope, receipt-style definition, order of work, parity assumption.
- **Task hub:** `AGENTS.md` in same task directory.
- **Reference implementation:** medusa2-chefV `.devagent/workspace/tasks/completed/2026-01-15_chef-send-receipt-to-host/` (plan, research, clarification).
- **Codebase patterns:** `apps/medusa/src/workflows/resend-event-email.ts`, `apps/medusa/src/subscribers/chef-event-accepted.ts`, `apps/medusa/src/api/admin/chef-events/[id]/resend-email/route.ts`, `apps/medusa/src/modules/resend/service.ts`, `apps/medusa/src/admin/routes/chef-events/[id]/page.tsx`, `apps/medusa/src/admin/hooks/chef-events.ts`, `apps/medusa/src/sdk/admin/admin-chef-events.ts`.
- **Cursor rules:** `.cursor/rules/medusa-development.mdc`, `.cursor/rules/typescript-patterns.mdc`, `.cursor/rules/remix-storefront-components.mdc` (admin UI).
