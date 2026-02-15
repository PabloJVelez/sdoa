# Research Packet — React Email Preview Server and Email Directory Refactor

- Mode: Task
- Requested By: PabloJVelez
- Last Updated: 2026-02-15
- Related Task Hub: `.devagent/workspace/tasks/active/2026-02-15_react-email-preview-server/`
- Storage Path: `.devagent/workspace/tasks/active/2026-02-15_react-email-preview-server/research/2026-02-15_react-email-preview-server-and-directory-research.md`
- Notes: Problem statement inferred from task AGENTS.md (no explicit input). Reference project (medusa2-chefV) was later confirmed by user: single directory, same path as this repo; implementation approach documented below. Implementation must be done via the task workflow (e.g. create-plan → implement-plan), not ad-hoc.

## Inferred Problem Statement

[INFERRED] Enable local preview of React Email templates in this project (sdoa) by setting up the React Email preview server and, where applicable, refactoring the email directory structure to match the approach used in the branched-from project (medusa2-chefV), so developers can preview email formatting without sending test emails.

**Assumptions:** (1) The existing `dev:email` script and `@react-email/preview-server` dependency are the intended entry point. (2) Directory refactor refers to folder layout and/or export conventions that work with the preview server. (3) Resend service in `apps/medusa` must continue to resolve and render the same templates after any refactor.

## Request Overview

- **Goal:** Preview React Email templates locally via the React Email preview server; align email directory and conventions with the reference implementation (medusa2-chefV) where that refactor was part of the same change set.
- **Constraints:** No access to the other project’s repo in this run; recommendations rely on this codebase and official React Email documentation.
- **Consumers:** Implementation plan (create-plan), developer implementing the task.

## Research Questions

| ID | Question | Status | Notes |
| --- | --- | --- | --- |
| RQ1 | How does the React Email preview server discover and list templates? | Answered | Requires `export default` and .tsx/.jsx/.js; see Findings. |
| RQ2 | What is the current email layout and export pattern in this repo? | Answered | Flat dir; named exports only—preview server will not list them. |
| RQ3 | What does the existing `dev:email` script do and is it sufficient? | Answered | Runs `email dev --dir ./src/modules/resend/emails`; sufficient once exports fixed. |
| RQ4 | How does the Resend service resolve templates and what must stay stable? | Answered | Imports by path and named export; default export can be added in parallel. |
| RQ5 | What directory/convention changes did the reference project use? | Answered | Single directory: `--dir ./src/modules/resend/emails`; no separate `emails/` folder. Add export default + PreviewProps in same template files. |

## Key Findings

1. **Preview server only shows files with `export default`.** Current templates use only named exports (`export const orderPlacedEmail = ...`), so they do not appear in the preview sidebar. Adding a default export (and optionally `*.PreviewProps`) per template is required for preview to work.
2. **`dev:email` is already wired.** The script `email dev --dir ./src/modules/resend/emails` and the `react-email` / `@react-email/preview-server` dev deps are in place; the blocker is the export convention, not the script.
3. **Resend service uses named imports.** It imports specific names (e.g. `orderPlacedEmail`) from each file; adding a default export that points to the same component does not break this.
4. **Port and directory:** Default port is 3000; if Medusa dev uses 9000, no change needed; otherwise use `--port` to avoid clashes. Static assets go in `<emails-dir>/static` and are served at `/static/...`.
5. **Reference project (medusa2-chefV) confirmed by user:** Uses **Option A — single directory**. Preview server script: `"dev:email": "email dev --dir ./src/modules/resend/emails"`. Templates live only in `apps/medusa/src/modules/resend/emails/`; there is no separate top-level `emails/` folder. Implementation: add `export default` and `Component.PreviewProps = { ... }` (and `export type XxxProps`) in the same template files; keep existing named exports for the Resend service. Optional: add `-p 3001` to avoid port clash; optional `dev:all` with `concurrently` to run Medusa and preview server together.

## Detailed Findings

### RQ1: How the preview server discovers templates

- **Summary:** The preview server includes a file in the sidebar only if (1) it has an `export default` and (2) its extension is `.js`, `.jsx`, or `.tsx`.
- **Source:** [React Email CLI docs](https://react.email/docs/cli) — “The heuristics for files to be considered emails”: regex `/\bexport\s*default\b/gm` and file extension.
- **Implication:** Current templates in `apps/medusa/src/modules/resend/emails/` use only named exports (e.g. `export const chefEventAcceptedEmail = ...`) and therefore are not listed by the preview server. Adding `export default ChefEventAcceptedEmailComponent` (or a wrapper that uses the same component) is necessary for them to appear.

### RQ2: Current email layout and export pattern

- **Summary:** Single flat directory; five templates; all use named export only; no default export; no `*.PreviewProps`.
- **Evidence:** `apps/medusa/src/modules/resend/emails/`: `order-placed.tsx`, `event-details-resend.tsx`, `chef-event-requested.tsx`, `chef-event-rejected.tsx`, `chef-event-accepted.tsx`. Each defines a `*Component` and exports a named function that returns `<*Component {...props} />` (e.g. `export const orderPlacedEmail = (props) => (...)`). No `export default` in any of them.
- **Freshness:** 2026-02-15.

### RQ3: Existing `dev:email` script

- **Summary:** Script and dependencies are already set up; only export convention and optional port/refactor are missing.
- **Evidence:** `apps/medusa/package.json`: `"dev:email": "email dev --dir ./src/modules/resend/emails"`; devDependencies include `"@react-email/preview-server": "4.2.4"`, `"react-email": "^4.2.4"`. The `email` CLI is provided by `react-email` and supports `--dir` and `--port`.
- **Recommendation:** Run from `apps/medusa` (e.g. `yarn dev:email`). If port 3000 is already in use, add e.g. `--port 3001` to the script.

### RQ4: Resend service template resolution

- **Summary:** Service imports by path and by named export; adding a default export does not conflict.
- **Evidence:** `apps/medusa/src/modules/resend/service.ts` imports e.g. `import { orderPlacedEmail } from "./emails/order-placed"` and uses `templates[template]` as a function called with `notification.data`. The template is rendered with `@react-email/render`. Adding `export default OrderPlacedEmailComponent` (or a thin default that forwards props) keeps the named export unchanged, so the service continues to work.
- **Implication:** Refactor can add default export (and `PreviewProps`) per file without changing Resend service imports.

### RQ5: Reference project directory refactor (confirmed by user)

- **Status:** Answered. User confirmed from medusa2-chefV: `package.json` has `"dev:email": "email dev --dir ./src/modules/resend/emails"` and the file tree shows templates only under `apps/medusa/src/modules/resend/emails/` (chef-event-accepted, chef-event-rejected, chef-event-requested, event-details-resend, order-placed, etc.). No separate `apps/medusa/emails/` directory.
- **Implementation approach:** Use the **same single-directory approach** in this repo: (1) Keep templates in `apps/medusa/src/modules/resend/emails/`. (2) In each template file add `export type XxxEmailProps`, `XxxComponent.PreviewProps = { ... }` with sample data, and `export default XxxComponent`; keep the existing named export (e.g. `chefEventAcceptedEmail`) for the Resend service. (3) Optionally add `-p 3001` to `dev:email` and/or a `dev:all` script with `concurrently` to run Medusa and the preview server together.
- **Freshness:** 2026-02-15 (user confirmation).

## Comparative / Alternatives Analysis

| Approach | Pros | Cons |
| --- | --- | --- |
| Add default export only (keep flat dir) | Minimal change; preview works; Resend unchanged | No structural alignment with reference project yet |
| Add default + PreviewProps only | Realistic preview data per template | Same as above; refactor still deferred |
| Full directory refactor first (from reference) | Aligns with other project; may improve grouping | Requires reference layout; more import path and service changes |
| Hybrid: default + PreviewProps now; directory refactor after reference is available | Preview usable immediately; refactor when informed | Two small steps instead of one |

**Recommendation:** Follow the **reference project’s pattern (Option A):** single directory `./src/modules/resend/emails`, no directory move. Implement default export and `*.PreviewProps` in each template file so the preview server works; keep named exports for Resend. No separate `emails/` folder or import-path changes needed.

## Implications for Implementation

- **Scope (to be executed via task workflow, e.g. create-plan → implement-plan):** (1) Add `export type XxxEmailProps`, `XxxComponent.PreviewProps = { ... }`, and `export default XxxComponent` to each template in `apps/medusa/src/modules/resend/emails/`; keep existing named exports. (2) Optionally add `-p 3001` to `dev:email` and/or `dev:all` with `concurrently`. No directory refactor or `service.ts` import changes required—reference project uses the same single directory.
- **Acceptance criteria:** Running `yarn dev:email` from `apps/medusa` shows all current email templates in the sidebar and renders them with preview data; Resend sending still works.
- **Validation:** Run `yarn dev:email`, open the preview URL, confirm each template appears and renders; run an existing flow that sends an email and confirm delivery and content.

## Risks & Open Questions

| Item | Type | Owner | Mitigation / Next Step | Due |
| --- | --- | --- | --- | --- |
| ~~Reference project directory layout unknown~~ | — | — | Resolved: user confirmed single dir `./src/modules/resend/emails`, no separate emails/ folder. | 2026-02-15 |
| Port 3000 vs Medusa default port | Risk | Developer | Add `--port 3001` (or other free port) to `dev:email` if needed | During implementation |
| PreviewProps for complex templates | Question | Developer | Add PreviewProps with sample data per template so preview is useful; can be incremental | During implementation |

## Recommended Follow-ups

1. **Create plan:** Run `devagent create-plan` for this task using this research. Plan should include: (a) add `export type`, `Component.PreviewProps`, and `export default` to each template in `src/modules/resend/emails/`; (b) optional `-p 3001` and/or `dev:all` with `concurrently`. No directory refactor needed (reference uses same single directory).
2. **Implement via workflow:** Execute implementation only via the task workflow (e.g. `devagent implement-plan`), not ad-hoc edits.
3. **Verify preview:** After implementation, run `yarn dev:email` from `apps/medusa` and confirm every template appears and renders.

## Sources

| Reference | Type | Freshness | Access Notes |
| --- | --- | --- | --- |
| [React Email CLI](https://react.email/docs/cli) | External | 2026-02-15 | Official docs: `email dev`, --dir, --port, export default heuristic, PreviewProps, _prefix, static/ |
| `apps/medusa/package.json` | Internal | 2026-02-15 | dev:email script; react-email and @react-email/preview-server versions |
| `apps/medusa/src/modules/resend/service.ts` | Internal | 2026-02-15 | Template enum, imports by path and named export |
| `apps/medusa/src/modules/resend/emails/*.tsx` | Internal | 2026-02-15 | Named exports only; no default export |
| medusa2-chefV (branched-from project) | External | 2026-02-15 | Confirmed by user: `dev:email` = `email dev --dir ./src/modules/resend/emails`; templates in `src/modules/resend/emails/` only; no separate `emails/` folder. Implementation = add export default + PreviewProps in same files. |
