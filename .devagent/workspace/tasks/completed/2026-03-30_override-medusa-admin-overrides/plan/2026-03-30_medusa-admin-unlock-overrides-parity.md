# Override Medusa Admin Overrides (Unlock parity) Plan

- Owner: PabloJVelez
- Last Updated: 2026-03-30
- Status: Draft
- Related Task Hub: `.devagent/workspace/tasks/completed/2026-03-30_override-medusa-admin-overrides/`
- Stakeholders: PabloJVelez (DRI)
- Notes: Source of truth for behavior and file inventory is the parent repo doc `@/Users/pablo/Personal/development/private-chef-template/private-chef-template/docs/medusa-admin-unlock-overrides.md`. Requirements locked in `.devagent/workspace/tasks/completed/2026-03-30_override-medusa-admin-overrides/clarification/2026-03-30_initial-clarification.md`.

---

## PART 1: PRODUCT CONTEXT

### Summary

Port the parent project’s Medusa admin override mechanism and override inventory into `sdoa`, so we can customize `@medusajs/dashboard` UI **without forking** it. The approach is `@unlockable/vite-plugin-unlock` (Medusa preset) wired into the admin Vite build and a set of basename-matched overrides under `apps/medusa/src/admin/overrides/`, plus TS/IDE shims and a repo doc describing how to maintain overrides.

### Context & Problem

We need branded/admin-tailored UX (navigation, orders UX, payout summary) while staying on the upstream dashboard upgrade path. The parent repo has a known-good implementation and operational guidance; this task ports it into `sdoa` with parity. Primary references:

- Clarification: `.devagent/workspace/tasks/completed/2026-03-30_override-medusa-admin-overrides/clarification/2026-03-30_initial-clarification.md`
- Research: `.devagent/workspace/tasks/completed/2026-03-30_override-medusa-admin-overrides/research/2026-03-30_medusa-admin-overrides-vite-plugin-unlock.md`
- Parent operational guide: `@/Users/pablo/Personal/development/private-chef-template/private-chef-template/docs/medusa-admin-unlock-overrides.md`
- Parent plan (inventory): `@/Users/pablo/Personal/development/private-chef-template/private-chef-template/.devagent/workspace/tasks/completed/2026-03-29_override-medusa-admin-overrides/plan/2026-03-29_medusa-admin-vite-unlock-overrides.md`

### Objectives & Success Metrics

- Ability to override selected admin modules **without** forking `@medusajs/dashboard`.
- Parity with parent behavior (login branding, `/` redirect to `/chef-events`, sidebar menu, orders list changes, order detail/summary changes, payout block in summary).
- Manual smoke checks pass in dev (and, implicitly, admin builds continue to work).

### Users & Insights

- Internal operators using admin to manage chef events/menus/orders and interpret payout/commission breakdowns.
- Key insight from parent: keep overrides small where possible; where large forks exist, expect periodic re-diff against upstream after dashboard upgrades.

### Solution Principles

- No fork of `@medusajs/dashboard`.
- Basename-matched overrides via unlock, stored at `apps/medusa/src/admin/overrides/`.
- Prefer reuse via `~dashboard/*` imports, but **use relative imports between overridden siblings** to ensure overrides compose correctly. (Parent doc)
- Versioning: **force-match parent versions** for the override stack (plugin + keep Medusa/dashboard aligned accordingly). (Clarification)

### Scope Definition

- **In Scope:** Parent-parity implementation: Vite unlock wiring, overrides (`login.tsx`, `home.tsx`, `menu.config.ts`, `order-list-table.tsx`, `order-detail.tsx`, `order-summary-section.tsx`), payout helper + shared lib, custom admin routes referenced (`/chef-events`, `/menus`), TS/IDE shim project, and documentation.
- **Out of Scope / Future:** Automated admin e2e; any `sdoa`-specific deviations (explicitly none for this pass).

### Functional Narrative

#### Flow: Sign-in (`/login`)
- Trigger: open admin app.
- Experience narrative: branded login (same as parent), auth flow unchanged.
- Acceptance criteria: branded copy present; login completes.

#### Flow: Default admin root (`/`)
- Experience narrative: redirect to `/chef-events` (same as parent).
- Acceptance criteria: hitting `/` lands on `/chef-events`.

#### Flow: Sidebar navigation
- Experience narrative: `menu.config.ts` customizes visible items, ordering, and promotes custom routes out of “Extensions”.
- Acceptance criteria: menu matches parent ordering/labels and links.

#### Flow: Orders list (`/orders`)
- Experience narrative: orders list table override extends fields and adjusts columns (event-oriented behavior, fulfillment hidden, etc.).
- Acceptance criteria: orders list renders; override columns/fields present as in parent.

#### Flow: Order detail
- Experience narrative: order detail override removes fulfillment block; summary override embeds payout breakdown.
- Acceptance criteria: order detail loads; breadcrumb/loader work; summary renders payout block when applicable.

### Technical Notes & Dependencies (Optional)

- Entry points: `apps/medusa/medusa-config.ts` and `apps/medusa/src/admin/**`.
- Dependency risk: override filenames/APIs drift when `@medusajs/dashboard` changes; require re-diff on upgrades.
- Local TS: `~dashboard/*` alias is Vite-only; requires declarations for IDE/`tsc -p`.

---

## PART 2: IMPLEMENTATION PLAN

### Scope & Assumptions

- Scope focus: Port parent unlock override system + full override inventory into `apps/medusa`.
- Key assumptions:
  - `apps/medusa` supports `admin.vite` plugin registration in `medusa-config.ts`.
  - We can pin/align versions to match parent as requested.
- Out of scope: automated e2e, non-admin backend changes unless required for admin views.

### Implementation Tasks

#### Task 1: Align versions and wire `@unlockable/vite-plugin-unlock` into admin Vite
- **Objective:** Match parent versions for unlock + dashboard/Medusa compatibility, and enable unlock overrides in `apps/medusa` admin build.
- **Impacted Modules/Files:**
  - `apps/medusa/package.json` (devDependency)
  - `apps/medusa/medusa-config.ts` (admin.vite wiring)
  - lockfile as applicable
- **References:**
  - Parent operational guide: `@/Users/pablo/Personal/development/private-chef-template/private-chef-template/docs/medusa-admin-unlock-overrides.md`
  - Parent plan Task 1: `@/Users/pablo/Personal/development/private-chef-template/private-chef-template/.devagent/workspace/tasks/completed/2026-03-29_override-medusa-admin-overrides/plan/2026-03-29_medusa-admin-vite-unlock-overrides.md`
- **Dependencies:** None.
- **Acceptance Criteria:**
  - Admin dev server/build recognizes overrides directory `./src/admin/overrides`.
  - In dev, debug logging can be enabled to confirm which files are overridden.
- **Testing Criteria:**
  - Run existing `apps/medusa` admin dev/build workflow (manual smoke is the required bar).

#### Task 2: Port overrides directory + core overrides (login/home/menu)
- **Objective:** Create `apps/medusa/src/admin/overrides/` and port parent overrides for `login.tsx`, `home.tsx`, and `menu.config.ts` with parity behavior and copy.
- **Impacted Modules/Files:**
  - `apps/medusa/src/admin/overrides/login.tsx`
  - `apps/medusa/src/admin/overrides/home.tsx`
  - `apps/medusa/src/admin/overrides/menu.config.ts`
  - any referenced static assets (as in parent)
- **References:** Parent operational guide (sections on login, home, menu).
- **Dependencies:** Task 1.
- **Acceptance Criteria:**
  - Login branding matches parent verbatim.
  - `/` redirects to `/chef-events`.
  - Sidebar menu matches parent behavior/order.
- **Testing Criteria:**
  - Manual: open admin, verify login branding, login success, and redirect/menu behavior.

#### Task 3: Port custom admin routes referenced by overrides (`/chef-events`, `/menus`)
- **Objective:** Add the custom admin routes used by the parent overrides so menu and default landing work.
- **Impacted Modules/Files:**
  - `apps/medusa/src/admin/routes/**` (route modules mirroring parent)
  - any supporting UI/components used by these routes (as in parent)
- **References:** Parent plan + parent operational guide notes on promoted paths and nesting.
- **Dependencies:** Task 2 (menu/home assume these routes).
- **Acceptance Criteria:**
  - `/chef-events` and `/menus` load in admin.
  - Menu links resolve to working pages (no 404 within admin router).
- **Testing Criteria:**
  - Manual navigation to each route from the sidebar.

#### Task 4: Port orders list override (`order-list-table.tsx`)
- **Objective:** Bring over parent orders list table override (fields + columns) with parity behavior.
- **Impacted Modules/Files:**
  - `apps/medusa/src/admin/overrides/order-list-table.tsx`
  - any supporting libs (e.g. `apps/medusa/src/lib/event-ticket.ts` if used by parent)
- **References:** Parent operational guide orders list section; parent plan Task 5.
- **Dependencies:** Task 1.
- **Acceptance Criteria:**
  - Orders list renders using override (debug logs or observed behavior).
  - Column behaviors match parent (event column / fulfillment hidden / exclusions).
- **Testing Criteria:**
  - Manual: visit `/orders` and confirm table renders and expected columns.

#### Task 5: Port order detail + summary overrides and payout UI/lib
- **Objective:** Bring over `order-detail.tsx` and `order-summary-section.tsx` forks and payout components/libs with parity behavior.
- **Impacted Modules/Files:**
  - `apps/medusa/src/admin/overrides/order-detail.tsx`
  - `apps/medusa/src/admin/overrides/order-summary-section.tsx`
  - `apps/medusa/src/admin/components/order-stripe-payout-breakdown.tsx`
  - `apps/medusa/src/lib/order-stripe-payout.ts`
  - any related types/helpers referenced by these modules (as in parent)
- **References:** Parent operational guide order detail/summary sections; parent plan Task 6.
- **Dependencies:** Task 1 (unlock + alias), Task 4 (if shared order-related helpers are reused).
- **Acceptance Criteria:**
  - Order detail page loads without breadcrumb/loader regressions.
  - Summary renders payout block when Stripe Connect payment data is present (same logic as parent).
  - Relative-import pitfall is avoided (order detail imports overridden summary via relative import).
- **Testing Criteria:**
  - Manual: open an order detail; verify the page loads and Summary shows the payout block in relevant cases.

#### Task 6: Port TypeScript/IDE shims for `~dashboard` imports
- **Objective:** Mirror parent “parallel TS project” so overrides that import `~dashboard/*` are manageable in-editor and optionally via `tsc -p`.
- **Impacted Modules/Files:**
  - `apps/medusa/tsconfig.json` (exclude overrides from main tsc if needed)
  - `apps/medusa/src/admin/tsconfig.json`
  - `apps/medusa/src/admin/dashboard-imports.d.ts`
  - `apps/medusa/src/admin/ambient.d.ts` (if used by parent)
- **References:** Parent operational guide “TypeScript, IDE, and tsc”.
- **Dependencies:** Tasks 2–5 (actual imports determine required `declare module` entries).
- **Acceptance Criteria:**
  - IDE stops reporting `TS2307` for known `~dashboard/*` imports used by overrides (after matching declarations are added).
- **Testing Criteria:**
  - Optional: run `tsc -p apps/medusa/src/admin/tsconfig.json` as a sanity check.

#### Task 7: Add `sdoa` operational doc for unlock overrides
- **Objective:** Port the parent operational guide into `sdoa`’s documentation (adjust paths only where repo differs, but keep behavior guidance).
- **Impacted Modules/Files:**
  - `docs/medusa-admin-unlock-overrides.md` (or equivalent agreed location in this repo)
- **References:** Parent operational guide: `@/Users/pablo/Personal/development/private-chef-template/private-chef-template/docs/medusa-admin-unlock-overrides.md`
- **Dependencies:** Tasks 1–6.
- **Acceptance Criteria:**
  - Doc explains wiring, basename matching, `menu.config.ts` rules, `~dashboard` alias behavior, and relative-import pitfall.
- **Testing Criteria:**
  - N/A (documentation).

### Implementation Guidance (Optional)

- **From `.devagent/workspace/tasks/completed/2026-03-30_override-medusa-admin-overrides/clarification/2026-03-30_initial-clarification.md`:**
  - Parity requirement, `/chef-events` default landing, verbatim branding, and force-match parent versions.
- **From parent operational guide `@/Users/pablo/Personal/development/private-chef-template/private-chef-template/docs/medusa-admin-unlock-overrides.md`:**
  - Basename matching, `~dashboard` alias, relative-import pitfall, TS shim patterns.

---

## Risks & Open Questions

| Item | Type (Risk / Question) | Owner | Mitigation / Next Step | Due |
| --- | --- | --- | --- | --- |
| Override drift on dashboard upgrades | Risk | PabloJVelez | Pin versions; re-diff overridden basenames on upgrades; keep forks minimal | — |
| `~dashboard` alias mismatch in TS/IDE | Risk | PabloJVelez | Mirror parent `declare module` shim approach; keep list updated | — |
| Manual smoke checklist exact scope | Question | PabloJVelez | Default to parent smoke flows (login, `/` redirect, menu, `/orders`, order detail + payout); refine later | — |

---

## Progress Tracking

Refer to `.devagent/workspace/tasks/completed/2026-03-30_override-medusa-admin-overrides/AGENTS.md` for progress logging instructions.

