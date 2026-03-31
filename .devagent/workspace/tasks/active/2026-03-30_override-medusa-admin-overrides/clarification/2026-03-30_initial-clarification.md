# Clarified Requirement Packet — Override Medusa Admin Base Page (sdoa)

- Requestor: PabloJVelez (DRI)
- Decision Maker: PabloJVelez
- Date: 2026-03-30
- Mode: Task Clarification
- Status: Complete
- Related Task Hub: `.devagent/workspace/tasks/active/2026-03-30_override-medusa-admin-overrides/`
- Notes: Incremental packet; updated after each Q&A turn. Parent reference implementation exists in `private-chef-template` and is the starting point for decisions here.

## Task Overview

### Context
- **Task name/slug:** `override-medusa-admin-overrides`
- **Business context:** Enable targeted admin UI customization while staying on upstream `@medusajs/dashboard` (no fork), using the proven parent-project pattern.
- **Stakeholders:** PabloJVelez (Requestor/Decision Maker)
- **Prior work:**
  - Research (this repo): `.devagent/workspace/tasks/active/2026-03-30_override-medusa-admin-overrides/research/2026-03-30_medusa-admin-overrides-vite-plugin-unlock.md`
  - Parent implementation docs: `@/Users/pablo/Personal/development/private-chef-template/private-chef-template/docs/medusa-admin-unlock-overrides.md`
  - Parent plan: `@/Users/pablo/Personal/development/private-chef-template/private-chef-template/.devagent/workspace/tasks/completed/2026-03-29_override-medusa-admin-overrides/plan/2026-03-29_medusa-admin-vite-unlock-overrides.md`

### Clarification Sessions
- Session 1: 2026-03-30 — Kickoff; validate intended scope and acceptance checks for `sdoa`.

---

## Clarified Requirements

### Scope & End Goal

**What needs to be done?**

- Add a supported mechanism to override selected Medusa admin (`@medusajs/dashboard`) modules in `sdoa` without forking, likely by integrating `@unlockable/vite-plugin-unlock` (Medusa preset) and maintaining overrides under `apps/medusa/src/admin/overrides/`.

**What's the end goal architecture or state?**

- `apps/medusa` admin build loads overrides in dev + prod; overrides are small and maintainable; we keep consuming upstream dashboard updates while selectively shadowing modules.

**In-scope (must-have):**
- Plugin wiring in `apps/medusa/medusa-config.ts` (or equivalent) to enable unlock overrides for admin.
- Bring over the parent project’s broader override set (parity approach), not just a minimal smoke test:
  - `login.tsx` (branding/copy)
  - `home.tsx` (default landing redirect)
  - `menu.config.ts` (sidebar customization)
  - `order-list-table.tsx` (orders list table behavior/fields/columns)
  - `order-detail.tsx` and `order-summary-section.tsx` (order detail + summary forks)
  - payout UI + shared lib (as in parent: `src/admin/components/*` + `src/lib/*`)
  - custom admin routes referenced by the above (notably `/chef-events`, `/menus`)
  - documentation mirroring parent operational guide
- Mirror parent TS/IDE shim support for `~dashboard` imports up-front (parallel `tsconfig` + `declare module` shims).

**Out-of-scope (won't-have):**
- Forking `@medusajs/dashboard`.
- Non-admin backend behavior changes (unless required to support an admin view).

**Nice-to-have (could be deferred):**
- Automated admin e2e coverage.

---

### Technical Constraints & Requirements

- Must work in **local dev** (HMR) and **production build** for admin.
- Prefer mirroring the parent project’s operational rules:
  - overrides matched by **basename**
  - `~dashboard` alias for upstream imports
  - relative imports between overridden siblings

---

### Dependencies & Blockers

- Requires clarity on which admin surfaces need overriding in `sdoa` vs which were parent-only.
- Depends on current `apps/medusa/medusa-config.ts` admin Vite configuration supporting extra plugins.

---

### Implementation Approach

- Use `@unlockable/vite-plugin-unlock` Medusa preset and an overrides directory (expected: `./src/admin/overrides`).
- Keep overrides thin wrappers where possible; avoid large forks unless necessary.
- Versioning: **force-match the parent versions** for the override stack (at minimum `@unlockable/vite-plugin-unlock`, and keep Medusa/dashboard versions aligned accordingly).

---

### Acceptance Criteria & Verification

- Admin builds and runs with overrides enabled.
- Selected override(s) demonstrably take effect (visible UI change) and do not regress core navigation/auth.
- Verification bar for this iteration: **manual smoke testing only** (no additional automated checks required beyond existing build/dev flows).

---

## Assumptions Log

| Assumption | Owner | Validation Required | Validation Method | Due Date | Status |
| --- | --- | --- | --- | --- | --- |
| `sdoa/apps/medusa` uses Medusa admin Vite config compatible with unlock plugin | PabloJVelez | Yes | Inspect `apps/medusa/medusa-config.ts` during planning | — | Pending |
| `sdoa` should target **parity with parent override set** (not a minimal subset) | PabloJVelez | No | Clarified in Session 1 (Q1) | 2026-03-30 | Validated |
| We should mirror parent TS/IDE shim setup up-front | PabloJVelez | No | Clarified in Session 1 (Q2) | 2026-03-30 | Validated |
| Verification is manual smoke only | PabloJVelez | No | Clarified in Session 1 (Q3) | 2026-03-30 | Validated |
| `sdoa` should include the full parent inventory of overrides/docs/routes/TS shim (no exclusions) | PabloJVelez | No | Clarified in Session 1 (Q4) | 2026-03-30 | Validated |
| `sdoa` default landing + sidebar should use `/chef-events` and we will port the needed custom routes | PabloJVelez | No | Clarified in Session 1 (Q5) | 2026-03-30 | Validated |
| `sdoa` should reuse parent login branding/copy verbatim | PabloJVelez | No | Clarified in Session 1 (Q6) | 2026-03-30 | Validated |

---

## Gaps Requiring Research

None identified yet (parent project provides a known-good approach). If `apps/medusa` config differs materially from parent, we may need targeted research/spike to map the wiring.

---

## Question Tracker

| # | Topic | Status |
| --- | --- | --- |
| Q1 | Which admin areas should be overrideable in `sdoa` for this iteration (minimum vs parity with parent)? | ✅ answered — Parity with parent (Option C) |
| Q2 | Should we mirror parent’s full TS/IDE setup for `~dashboard` imports immediately, or only if needed by chosen overrides? | ✅ answered — Mirror up-front (Option A) |
| Q3 | What’s the required verification bar (manual smoke only vs build + documented checklist vs automated)? | ✅ answered — Manual smoke only (Option A) |
| Q4 | Which specific parent overrides are required for `sdoa` day-1 (exact list + any exclusions)? | ✅ answered — Full inventory (Option A) |
| Q5 | Does `sdoa` have (or want) the same custom admin routes as parent (e.g. `/chef-events`, `/menus`), which the menu/home overrides reference? | ✅ answered — Keep `/chef-events` (Option A) |
| Q6 | Do we want parent branding/copy verbatim (login title/heading/subtitle), or `sdoa`-specific strings/assets? | ✅ answered — Reuse verbatim (Option A) |
| Q7 | Any `sdoa`-specific deviations from parent (routes, labels, features) we should *not* port even though we’re aiming for parity? | ✅ answered — No deviations (Option A) |
| Q8 | Should we pin the exact parent versions of `@unlockable/vite-plugin-unlock` and `@medusajs/dashboard` (or accept whatever `sdoa` currently has and adapt overrides)? | ✅ answered — Force-match parent versions (Option A) |
| Q9 | Manual smoke checklist: which flows must be verified (login, `/` redirect, sidebar, `/orders`, order detail summary payout)? | ⏭️ deferred — user ended session before selecting required flows |

---

## Clarification Session Log

### Session 1: 2026-03-30
**Participants:** PabloJVelez

**Questions Asked:**
1. Scope parity vs minimal: **C** — bring over broader parent set (PabloJVelez)
2. TS/IDE shim timing: **A** — mirror parent setup up-front (PabloJVelez)
3. Verification bar: **A** — manual smoke only (PabloJVelez)
4. Override inventory: **A** — port everything from parent plan/docs (PabloJVelez)
5. Default landing/routes: **A** — keep `/chef-events` and port needed custom routes (PabloJVelez)
6. Login branding: **A** — reuse verbatim (PabloJVelez)
7. Deviations: **A** — no deviations; copy parent behavior as-is (PabloJVelez)
8. Version pinning: **A** — force-match parent versions (PabloJVelez)

**Unresolved Items:** Q9 (deferred)

---

## Next Steps

### Spec Readiness Assessment
**Status:** ✅ Ready for Spec | ⬜ Research Needed | ⬜ More Clarification Needed

**Rationale:**
We have a proven reference implementation, full-scope parity, target routes/branding, and version pinning strategy. The manual smoke checklist specifics are deferred, but planning can proceed using the parent repo’s documented smoke flows as the default.

---

## Change Log

| Date | Change | Author |
| --- | --- | --- |
| 2026-03-30 | Initial packet created | Clarify workflow |
| 2026-03-30 | Captured Session 1 answers (scope parity, TS shim up-front, manual smoke verification) | Clarify workflow |
| 2026-03-30 | Captured Session 1 answers (full parent inventory, `/chef-events` landing, reuse login branding verbatim) | Clarify workflow |
| 2026-03-30 | Captured Session 1 answers (no deviations; force-match parent versions). Marked smoke checklist selection deferred and packet complete. | Clarify workflow |

