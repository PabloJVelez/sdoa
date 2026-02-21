# Clarified Requirement Packet — Set Up React Email Preview Server

- Requestor: PabloJVelez (Owner)
- Decision Maker: PabloJVelez
- Date: 2026-02-15
- Mode: Task Clarification
- Status: Complete
- Related Task Hub: `.devagent/workspace/tasks/completed/2026-02-15_react-email-preview-server/`
- Notes: Research already completed; reference project (medusa2-chefV) confirmed single-directory approach. Clarification session filling remaining gaps for plan readiness.

## Task Overview

### Context
- **Task name/slug:** Set up React Email preview server / react-email-preview-server
- **Business context:** Project uses React Email for transactional emails; developers need to preview emails locally instead of sending test emails. Same setup exists in branched-from project (medusa2-chefV); bring that approach here.
- **Stakeholders:** PabloJVelez (Owner, Decision Maker)
- **Prior work:** Task hub AGENTS.md; research packet `research/2026-02-15_react-email-preview-server-and-directory-research.md` (preview server discovery, export pattern, reference project confirmed: single dir, export default + PreviewProps in same files).

### Clarification Sessions
- Session 1: 2026-02-15 — Scope (follow reference project), scripts (include -p 3001 and dev:all), verification (preview + Resend still works).

---

## Clarified Requirements

### Scope & End Goal

**What needs to be done?**
- Follow the reference project (medusa2-chefV): single directory, no file or folder moves. Add to each template in `apps/medusa/src/modules/resend/emails/`: `export type XxxEmailProps`, `XxxComponent.PreviewProps = { ... }` with sample data, and `export default XxxComponent`; keep existing named exports for the Resend service.
- Add `-p 3001` to the `dev:email` script and add a `dev:all` script using `concurrently` to run Medusa and the preview server together. Add `concurrently` as a devDependency.

**What's the end goal architecture or state?**
- Running `yarn dev:email` from `apps/medusa` shows all email templates in the preview server sidebar (on port 3001) and renders them with sample data; Resend sending continues to work unchanged. Optionally, `yarn dev:all` runs both Medusa and the email preview server.

**In-scope (must-have):**
- Export convention changes in all five templates (chef-event-accepted, chef-event-rejected, chef-event-requested, event-details-resend, order-placed): export type, PreviewProps, export default; keep named exports.
- `dev:email` script updated to use port 3001.
- `dev:all` script and `concurrently` dependency.

**Out-of-scope (won't-have):**
- Moving or reorganizing email files/folders; receipt feature; new email templates.

**Nice-to-have (could be deferred):**
- None identified.

---

### Technical Constraints & Requirements

**Platform/technical constraints:**
- React Email CLI and existing `dev:email` script; Resend service must keep resolving templates by existing named exports.
- Run preview server from `apps/medusa` (e.g. `yarn dev:email`).

**Quality bars:**
- All current templates must appear in the preview sidebar and render without errors; sending emails via Resend must still work.

---

### Implementation Approach

**Implementation strategy:**
- Follow reference project (medusa2-chefV): single directory `./src/modules/resend/emails`, no directory refactor. Add default export and `Component.PreviewProps` in the same template files; keep named exports for Resend.
- Implementation to be executed via task workflow (create-plan → implement-plan), not ad-hoc.

**Existing patterns:**
- Reference: medusa2-chefV package.json script and template export pattern (confirmed by user).

---

### Acceptance Criteria & Verification

**How will we verify this works?**
- Run `yarn dev:email` from `apps/medusa`; open preview URL (port 3001); confirm all five templates appear in the sidebar and render with preview data.
- Confirm at least one flow that sends an email via Resend still works (no regression).

**What does "done" look like?**
- [ ] All five templates have export type, PreviewProps, and export default; named exports unchanged.
- [ ] `dev:email` uses `-p 3001`; `dev:all` and `concurrently` added.
- [ ] Preview server lists and renders all templates; Resend sending still works.

---

## Question Tracker

| # | Question | Status |
|---|----------|--------|
| 1 | Directory refactor = only export/convention changes or also folder layout? | ✅ answered — Follow other project (export/convention only, no file moves). |
| 2 | Include optional scripts (-p 3001, dev:all) in this task? | ✅ answered — A: Include both. |
| 3 | Any other verification beyond preview + Resend still works? | ✅ answered — A: No; that's enough. |

---

## Clarification Session Log

### Session 1: 2026-02-15
**Participants:** PabloJVelez

**Questions Asked:**

**1. The task summary mentions "refactoring the directory structure of the emails." Your research concluded the reference project uses the same path and no separate folder. For this task, should "directory refactor" mean only the export/convention changes (default export + PreviewProps in place), or do you also want any folder/layout changes?**
- **Answer:** Follow what the other project does (ignore the wording; no folder moves — export/convention only). (PabloJVelez)

**2. Should the first implementation include the optional scripts (port 3001 for dev:email, and/or dev:all with concurrently to run Medusa + preview server together), or leave those for later?**
- **Answer:** **A** — Include both in this task (add -p 3001 and dev:all with concurrently). (PabloJVelez)

**3. Besides "run yarn dev:email from apps/medusa and see all templates in the sidebar," is there anything else that must be true for you to consider this done (e.g. how preview data should look, or a quick check that sending still works)?**
- **Answer:** **A** — No; that plus "Resend sending still works" is enough. (PabloJVelez)

**Unresolved Items:** None.

---

## Assumptions Log

| Assumption | Owner | Validation Required | Validation Method | Status |
| --- | --- | --- | --- | --- |
| Reference project (medusa2-chefV) pattern is the source of truth for scope and approach | PabloJVelez | No | Confirmed in session | Validated |
| Resend service remains unchanged (same named imports) | PabloJVelez | No | Implementation must preserve named exports | Documented |

---

## Gaps Requiring Research

None. Research already completed; no further evidence needed for planning.

---

## Next Steps

### Plan Readiness Assessment
**Status:** ✅ Ready for Plan | ⬜ Research Needed | ⬜ More Clarification Needed

**Plan Readiness Assessment:**
- Critical gaps addressed: scope (follow reference, no folder moves), scripts (include both -p 3001 and dev:all), verification (preview + Resend unchanged).
- Blockers: None.
- Information status: Research and clarification complete.

**Rationale:** Scope, approach, and acceptance criteria are clear. create-plan can draft an implementation plan.

### Recommended Actions

**If spec-ready:**
- [x] Hand validated requirement packet to create-plan
- [ ] Provide link to this clarification packet when running `devagent create-plan`
- [ ] Key decisions: follow reference project (single dir, export conventions); include -p 3001 and dev:all with concurrently; done = preview works + Resend unchanged
