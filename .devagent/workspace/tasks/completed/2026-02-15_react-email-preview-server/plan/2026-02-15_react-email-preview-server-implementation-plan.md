# Set Up React Email Preview Server — Implementation Plan

- Owner: PabloJVelez
- Last Updated: 2026-02-15
- Status: Draft
- Related Task Hub: `.devagent/workspace/tasks/completed/2026-02-15_react-email-preview-server/`
- Stakeholders: PabloJVelez (Owner, Decision Maker)
- Notes: Plan derived from research and clarification packets; implementation via implement-plan workflow.

---

## PART 1: PRODUCT CONTEXT

### Summary
This project uses React Email for transactional emails in `apps/medusa/src/modules/resend/emails/`. Developers currently must send test emails to verify formatting. The goal is to enable local preview via the React Email preview server, matching the approach used in the branched-from project (medusa2-chefV): same directory, no file moves; add export conventions (default export + PreviewProps) so the preview server discovers and renders templates; optionally run Medusa and the preview server together. Resend sending must continue to work unchanged.

### Context & Problem
- **Current state:** Five React Email templates (chef-event-accepted, chef-event-rejected, chef-event-requested, event-details-resend, order-placed) use only named exports; the React Email preview server requires `export default` to list a file. The `dev:email` script exists and points to the correct directory.
- **Pain:** No way to preview email layout locally without sending real emails.
- **Trigger:** Align with reference project and improve developer experience for email work.

**References:** `research/2026-02-15_react-email-preview-server-and-directory-research.md`, `clarification/2026-02-15_initial-clarification.md`.

### Objectives & Success Metrics
- **Primary:** Running `yarn dev:email` from `apps/medusa` shows all five templates in the preview server sidebar (port 3001) and renders them with sample data.
- **Constraint:** Resend notification service continues to resolve and send emails using existing named exports; no changes to `service.ts` import paths or template names.
- **Secondary:** Optional `yarn dev:all` runs Medusa and the email preview server together via `concurrently`.

### Users & Insights
- **Primary user:** Developers working on email templates or flows that trigger them.
- **Insight:** Reference project (medusa2-chefV) already uses single-directory approach with export default + PreviewProps; follow that pattern.

### Solution Principles
- Follow reference project (medusa2-chefV): single directory `./src/modules/resend/emails`, no file or folder moves.
- Preserve existing named exports so Resend service remains unchanged.
- Implementation executed via task workflow (implement-plan), not ad-hoc.

### Scope Definition
- **In Scope:** Export convention changes in all five templates (export type, PreviewProps, export default); `dev:email` with `-p 3001`; `dev:all` script and `concurrently` devDependency.
- **Out of Scope / Future:** Moving or reorganizing email files; receipt feature; new email templates.

### Functional Narrative

#### Flow: Preview emails locally
- **Trigger:** Developer runs `yarn dev:email` from `apps/medusa`.
- **Experience:** Preview server starts on port 3001; sidebar lists all five email templates; selecting one renders it with sample data from `PreviewProps`.
- **Acceptance criteria:** All five templates appear and render without errors; Resend sending still works when triggered by app flows.

### Technical Notes & Dependencies
- **React Email CLI:** Requires `export default` and `.tsx`/`.jsx` for file to appear in sidebar; supports `Component.PreviewProps = { ... }` for sample data. See [React Email CLI](https://react.email/docs/cli).
- **Resend service:** `apps/medusa/src/modules/resend/service.ts` imports by path and named export (e.g. `orderPlacedEmail`). Adding default export in the same file does not break these imports.
- **Dependency:** Add `concurrently` (e.g. `^9.2.1`) as devDependency in `apps/medusa/package.json`.

---

## PART 2: IMPLEMENTATION PLAN

### Scope & Assumptions
- **Scope focus:** apps/medusa only: package.json scripts and dependency; five files in `src/modules/resend/emails/`.
- **Key assumptions:** Reference project pattern is authoritative; no directory refactor; Resend service is not modified.
- **Out of scope:** Changes to Resend service, new templates, receipt feature.

### Implementation Tasks

#### Task 1: Add preview server scripts and dependency
- **Objective:** Enable `yarn dev:email` to run on port 3001 and add `yarn dev:all` to run Medusa and the preview server together.
- **Impacted Modules/Files:**
  - `apps/medusa/package.json` — scripts and devDependency
- **References:** Clarification packet (include -p 3001 and dev:all); research (port 3001 avoids clash).
- **Dependencies:** None (can be done first).
- **Acceptance Criteria:**
  - `dev:email` script is `email dev --dir ./src/modules/resend/emails -p 3001`.
  - `dev:all` script runs `concurrently -n medusa,email -c blue,green "medusa develop" "yarn dev:email"` (or equivalent so both processes run from apps/medusa context).
  - `concurrently` is listed in devDependencies (e.g. `^9.2.1`).
- **Testing Criteria:** Run `yarn dev:email` from `apps/medusa`; confirm server starts and listens on 3001. Run `yarn dev:all`; confirm both Medusa and email preview start (manual check).
- **Validation Plan:** After Task 2, full verification: preview lists all templates and Resend still works.

#### Task 2: Add export type, PreviewProps, and default export to all five email templates
- **Objective:** Make each template discoverable by the React Email preview server and renderable with sample data, without changing how the Resend service imports them.
- **Impacted Modules/Files:**
  - `apps/medusa/src/modules/resend/emails/chef-event-accepted.tsx`
  - `apps/medusa/src/modules/resend/emails/chef-event-rejected.tsx`
  - `apps/medusa/src/modules/resend/emails/chef-event-requested.tsx`
  - `apps/medusa/src/modules/resend/emails/event-details-resend.tsx`
  - `apps/medusa/src/modules/resend/emails/order-placed.tsx`
- **References:** Research (export default heuristic, PreviewProps); clarification (follow reference, keep named exports); [React Email CLI](https://react.email/docs/cli) (PreviewProps).
- **Dependencies:** None (can run in parallel with Task 1; verification after both).
- **Acceptance Criteria:**
  - Each file has `export type XxxEmailProps` (or equivalent; type is exportable).
  - Each file has `XxxComponent.PreviewProps = { ... }` with sample data matching the component’s props shape (use `as XxxEmailProps` if needed for type safety).
  - Each file has `export default XxxComponent` at the end.
  - Existing named export (e.g. `chefEventAcceptedEmail`) is unchanged so `service.ts` imports continue to work.
- **Testing Criteria:** Run `yarn dev:email` from `apps/medusa`; open http://localhost:3001; confirm all five templates appear in the sidebar; open each and confirm it renders. Trigger at least one flow that sends an email via Resend and confirm delivery/content unchanged.
- **Subtasks:**
  1. chef-event-accepted.tsx — Add export type, PreviewProps (customer, booking, event, product, chef, requestReference, acceptanceDate, chefNotes, emailType), export default.
  2. chef-event-rejected.tsx — Add export type, PreviewProps (customer, booking, rejection, chef, requestReference, rejectionDate, emailType), export default.
  3. chef-event-requested.tsx — Add export type, PreviewProps (customer, booking, event, requestReference, chefContact, emailType), export default.
  4. event-details-resend.tsx — Add export type, PreviewProps (customer, booking, event, product, chef, requestReference, emailType), export default.
  5. order-placed.tsx — Add export type, PreviewProps (order with minimal shape: id, display_id, currency_code, customer, shipping_address, items, item_total, shipping_methods, tax_total, total), export default.
- **Validation Plan:** Manual: `yarn dev:email` → all five in sidebar, each renders. Manual: send one email via app flow → Resend still works. TypeScript build passes (`yarn typecheck` or equivalent from apps/medusa if available).

### Implementation Guidance

- **From research packet** (`research/2026-02-15_react-email-preview-server-and-directory-research.md`): Preview server includes a file only if it has `export default` and extension .tsx/.jsx/.js. Use `ComponentName.PreviewProps = { ... }` for sample data; React Email uses this when rendering the preview.
- **From `.cursor/rules/typescript-patterns.mdc`:** Prefer type safety; export types for reuse. Use interfaces or exported types for props; avoid `any` for template props.
- **From clarification:** Do not change `service.ts` or move any files; keep named exports (e.g. `export const chefEventAcceptedEmail = ...`) exactly as used by Resend.
- **Resend service** (`apps/medusa/src/modules/resend/service.ts`): Imports `orderPlacedEmail`, `chefEventRequestedEmail`, `chefEventAcceptedEmail`, `chefEventRejectedEmail`, `eventDetailsResendEmail` from `./emails/<name>`. Do not remove or rename these exports.

### Release & Delivery Strategy
- Single implementation phase; no phased rollout. Verification: developer runs `yarn dev:email` and `yarn dev:all` locally; no production behavior change (preview is dev-only).

### Approval & Ops Readiness
- No formal approval gates specified. Owner (PabloJVelez) sign-off sufficient. No ops checklist (dev tooling only).

---

## Risks & Open Questions

| Item | Type | Owner | Mitigation / Next Step | Due |
| --- | --- | --- | --- | --- |
| Port 3001 in use on dev machine | Risk | Developer | Use different port in dev:email if needed; document in README or task | During implementation |
| order-placed.tsx uses Medusa types (OrderDTO, etc.) | Question | Developer | PreviewProps can use a minimal mock shape that satisfies the template’s usage (id, display_id, currency_code, customer, items, totals); no need to import full DTOs for preview | During Task 2 |

---

## Progress Tracking
Refer to the AGENTS.md file in the task directory for instructions on tracking and reporting progress during implementation.

---

## Appendices & References

- **Research:** `research/2026-02-15_react-email-preview-server-and-directory-research.md`
- **Clarification:** `clarification/2026-02-15_initial-clarification.md`
- **React Email CLI:** https://react.email/docs/cli
- **Resend service:** `apps/medusa/src/modules/resend/service.ts`
- **Cursor rules:** `.cursor/rules/typescript-patterns.mdc`, `.cursor/rules/medusa-development.mdc`
