# Set Up React Email Preview Server Progress Tracker

- Owner: PabloJVelez
- Last Updated: 2026-02-15
- Status: Draft
- Task Hub: `.devagent/workspace/tasks/active/2026-02-15_react-email-preview-server/`

## Summary
This project uses React Email for transactional emails (e.g. in `apps/medusa/src/modules/resend/emails/`). The goal is to set up the React Email preview server so emails can be previewed locally in the browser instead of having to send test emails to view formatting and layout. The same setup was implemented in another project this codebase branched from (medusa2-chefV); relevant changes from that implementation should be brought here. **Part of those changes in the other project was refactoring the directory structure of the emails**—this task includes bringing in that directory refactor so the email layout aligns with the preview-server setup and any future receipt/email work. Related context from that project includes the chef-send-receipt-to-host feature and its email structure; any receipt feature can be planned separately while respecting differences in this project.

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
- [2026-02-15] Event: Task hub created. Scope: set up React Email preview server for local email preview; reference implementation exists in branched-from project (medusa2-chefV).
- [2026-02-15] Event: Scope clarified: task includes refactoring the email directory structure (as done in the other project); Summary and Implementation Checklist updated.
- [2026-02-15] Event: Research completed. Preview server requires `export default` per template (current templates use named exports only); `dev:email` script already correct. Research packet: research/2026-02-15_react-email-preview-server-and-directory-research.md.
- [2026-02-15] Event: Clarification completed. Follow reference project (no file moves); include -p 3001 and dev:all with concurrently; done = preview works + Resend unchanged. Packet: clarification/2026-02-15_initial-clarification.md.
- [2026-02-15] Event: Implementation plan created. Two tasks: (1) package.json scripts + concurrently, (2) five email templates with export type, PreviewProps, export default. Plan: plan/2026-02-15_react-email-preview-server-implementation-plan.md.
- [2026-02-15] Event: Task 1 completed. Added dev:email -p 3001, dev:all with concurrently, and concurrently devDependency. File: apps/medusa/package.json.
- [2026-02-15] Event: Task 2 completed. Added export type, PreviewProps, and export default to all five email templates (chef-event-accepted, chef-event-rejected, chef-event-requested, event-details-resend, order-placed); named exports unchanged. Files: apps/medusa/src/modules/resend/emails/*.tsx. Note: yarn typecheck still reports pre-existing errors in admin modules (root.tsx, chef-event-form, EmailManagementSection); no errors in modified email files.

## Implementation Checklist
- [x] Research: Identify preview-server setup and email directory structure in branched-from project (scripts, config, entry points, folder layout).
- [x] Plan: Define steps per clarification (export type + PreviewProps + default in each template; dev:email -p 3001; dev:all + concurrently).
- [x] Implement: Execute tasks from plan (Task 1: package.json; Task 2: five email templates). See plan/2026-02-15_react-email-preview-server-implementation-plan.md.

## Open Questions
- (None yet.)

## References
- Plan: plan/2026-02-15_react-email-preview-server-implementation-plan.md — implementation tasks and acceptance criteria (2026-02-15).
- Clarification: clarification/2026-02-15_initial-clarification.md — scope (follow reference, no folder moves), scripts (-p 3001 + dev:all), verification (2026-02-15).
- Research: research/2026-02-15_react-email-preview-server-and-directory-research.md — preview server discovery (export default), current export pattern, Resend compatibility, reference project confirmed (2026-02-15).
- Internal: `apps/medusa/package.json` — existing `dev:email` script and `@react-email/preview-server`, `react-email` deps (2026-02-15).
- Internal: `apps/medusa/src/modules/resend/emails/` — React Email templates location (2026-02-15).
- External: Branched-from project (medusa2-chefV) — reference implementation (single dir, export conventions).

## Next Steps
- Run **research**: discover how the preview server is set up in the other project and what’s missing or different here (e.g. `devagent research` with task hub path).
- Run **implement-plan**: execute the two tasks in plan/2026-02-15_react-email-preview-server-implementation-plan.md (Task 1: package.json; Task 2: five email templates). Track progress in this AGENTS.md.