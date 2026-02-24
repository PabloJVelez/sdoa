# Enable Chef to Send Receipts to Host and Refactor Event Emails Progress Tracker

- Owner: PabloJVelez
- Last Updated: 2026-02-23
- Status: Draft
- Task Hub: `.devagent/workspace/tasks/active/2026-02-23_chef-receipt-to-host-and-email-refactor/`

## Summary
This project contains emails that get sent out during the event flow; the emails live in `apps/medusa/src/modules/resend/emails`. The project stems from another chef project (medusa2-chefV), where the ability for the chef to send receipts from the admin was implemented, including optional tip amount (e.g. when the customer tips by cash and the host needs an emailed receipt for expense reimbursement). This task adds that same capability here: enable chefs to send receipt emails to hosts for chef events (with optional tip amount), and refactor the existing event-flow emails to be displayed more like the receipt—i.e. a consistent, receipt-style layout across event emails. Reference materials from the other project include a full implementation plan (chef send receipt to host, tip fields, workflow, subscriber, receipt template, API route, SDK/hooks, admin UI, Resend registration), research packet (payment-reminder pattern, button enablement, event date validation, email history), and clarification packet (receipt contents, tip storage in chef event model, tip UI, multiple receipts with warning). Implementation in this codebase should follow the same architectural pattern (API route → workflow → subscriber → email template → admin UI) and the attached plan, adapted for this repo and with the additional goal of refactoring existing emails to a receipt-like display.

## Agent Update Instructions
- Always update "Last Updated" to today's date (ISO: YYYY-MM-DD) when editing this file. **Get the current date by explicitly running `date +%Y-%m-%d` first, then use the output for the "Last Updated" field.**
- Progress Log: Append a new entry at the end in the form `- [YYYY-MM-DD] Event: concise update, links to files`. Do not rewrite or delete prior entries. **Use the date retrieved from `date +%Y-%m-%d` for the date portion.**
- Implementation Checklist: Mark items as `[x]` when complete, `[~]` for partial with a short note. Add new items if discovered; avoid removing items—strike through only when obsolete.
- Key Decisions: Record important decisions as `- [YYYY-MM-DD] Decision: rationale, links`. **Use the date retrieved from `date +%Y-%m-%d` for the date portion.**
- References: Keep links current to latest spec, research, and tasks. Add additional references as they are created.
- Scope: Edits here should reflect coordination/progress only; do not include application code changes. Preserve history.

## Key Decisions
- (None yet.)

## Progress Log
- [2026-02-23] Event: Task hub created. Scope: add chef-send-receipt-to-host feature (with optional tip) and refactor existing event emails to receipt-style display; reference plan, research, and clarification from medusa2-chefV attached in task request.
- [2026-02-23] Event: Clarification completed. Scope: all five existing emails + new receipt use receipt-style layout (reference ReceiptEmailComponent: header, Bill To/meta, line items, totals, thank-you, footer). Order: receipt feature first, then refactor. Assume parity with medusa2-chefV. Packet: `clarification/2026-02-23_initial-clarification.md`.
- [2026-02-23] Event: Implementation plan created. Eleven tasks: 1 model+migration (tip fields), 2 GET availableTickets, 3 send-receipt workflow, 4 receipt subscriber, 5 receipt template, 6 send-receipt API route, 7 SDK+hook, 8 Resend registration, 9 admin UI (button+tip modal), 10 shared receipt layout/styles, 11 refactor five emails. Plan: `plan/2026-02-23_chef-receipt-and-email-refactor-implementation-plan.md`.

## Implementation Checklist
- [ ] Research: Confirm payment-reminder and chef-event patterns in this codebase (API route, workflow, subscriber, emails, admin UI).
- [ ] Research: Inventory existing emails in `apps/medusa/src/modules/resend/emails` and identify refactor scope for receipt-style layout.
- [x] Plan: Create implementation plan (tip fields on chef event, send-receipt workflow, subscriber, receipt template, API route, SDK/hooks, admin UI, template registration; plus email refactor tasks).
- [ ] Implement: Execute plan tasks in sequence (Tasks 1–9 receipt feature, then 10–11 email refactor). See `plan/2026-02-23_chef-receipt-and-email-refactor-implementation-plan.md`.
- [ ] Test: Verify receipt send with/without tip, button enablement, email history; verify refactored emails render correctly.

## Open Questions
- (None yet.)

## References
- Plan: `plan/2026-02-23_chef-receipt-and-email-refactor-implementation-plan.md` — implementation plan (11 tasks: receipt feature then email refactor); 2026-02-23.
- Clarification: `clarification/2026-02-23_initial-clarification.md` — scope, order (receipt first then refactor), receipt-style definition, parity assumption; 2026-02-23.
- Related task (React Email preview): `.devagent/workspace/tasks/completed/2026-02-15_react-email-preview-server/` — preview server and email templates; 2026-02-23.
- Current email location: `apps/medusa/src/modules/resend/emails` — event-flow emails; 2026-02-23.
- Reference implementation (external): medusa2-chefV `.devagent/workspace/tasks/completed/2026-01-15_chef-send-receipt-to-host/` — plan, research, clarification, AGENTS.md (attached in task request); use as pattern source.
- Product/memory: No matching files in `.devagent/workspace/product/` or `.devagent/workspace/memory/` as of 2026-02-23.

## Next Steps
- **Implement:** Execute tasks 1–11 from `plan/2026-02-23_chef-receipt-and-email-refactor-implementation-plan.md` in order; track progress in this AGENTS.md.
- **Review plan:** Share plan with stakeholders if needed; adjust tasks only if scope or assumptions change.
