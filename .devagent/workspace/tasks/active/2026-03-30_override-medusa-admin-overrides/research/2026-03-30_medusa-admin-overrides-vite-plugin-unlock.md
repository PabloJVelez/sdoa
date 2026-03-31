# Research Packet — Override Medusa Admin Base Page (Unlock overrides)

- Mode: Task
- Requested By: PabloJVelez
- Last Updated: 2026-03-30
- Related Plan: `.devagent/workspace/tasks/active/2026-03-30_override-medusa-admin-overrides/plan/<file>.md` (not yet created)
- Storage Path: `.devagent/workspace/tasks/active/2026-03-30_override-medusa-admin-overrides/research/2026-03-30_medusa-admin-overrides-vite-plugin-unlock.md`
- Stakeholders: PabloJVelez (DRI)

## Request Overview

### Inferred Problem Statement

We need a maintainable way to override selected parts of the Medusa admin UI (backed by `@medusajs/dashboard`) in this repo **without forking** the dashboard package, reusing an approach that’s already implemented in a parent project.

### Assumptions

- [INFERRED] The target approach is to use `@unlockable/vite-plugin-unlock` (Medusa preset) to load overrides from `apps/medusa/src/admin/overrides/`.
- [INFERRED] The desired end state is “small, targeted overrides” that survive upstream dashboard upgrades with minimal churn (but require periodic re-diffing).
- [NEEDS CLARIFICATION] Which specific admin areas must be overrideable in `sdoa` (login copy/branding only, sidebar/menu, orders pages, etc.). The parent project expanded scope beyond “two strings”.

## Research Questions

| ID | Question | Status (Planned / Answered / Follow-up) | Notes |
| --- | --- | --- | --- |
| RQ1 | What mechanism did the parent project use to override Medusa admin modules without forking `@medusajs/dashboard`? | Answered | `@unlockable/vite-plugin-unlock` + Medusa preset. |
| RQ2 | What are the key “gotchas” and rules for overrides (matching, imports, exports)? | Answered | Basename matching; `~dashboard` alias; relative-import pitfall between overridden siblings; route export shape. |
| RQ3 | What is the recommended file/dir structure and TS setup to make overrides workable in dev + build? | Answered | Dedicated overrides folder; plugin wired in `admin.vite`; TS shim project for `~dashboard`. |
| RQ4 | What is the minimum viable override to validate wiring in this repo? | Follow-up | Parent suggests login + home/menu/orders are common smoke points. |

## Key Findings

- The parent project achieved admin UI customization **without forking** `@medusajs/dashboard` by wiring `@unlockable/vite-plugin-unlock` (Medusa preset) into Medusa’s admin Vite config and supplying overrides under `apps/medusa/src/admin/overrides/`. (`docs/medusa-admin-unlock-overrides.md`)
- Overrides are matched by **basename** against `@medusajs/dashboard/src/**`, so only filenames matter; override files can be nested arbitrarily under the overrides directory. (Parent plan + docs)
- The plugin provides a `~dashboard` alias to import **original** dashboard sources, but when one override depends on another override, you must use **relative imports** to pull your overridden sibling (not `~dashboard`). (Parent `AGENTS.md` key decision + docs)
- Route/page overrides may need to export `Component` (lazy route pattern) and sometimes also a default export depending on the dashboard route entry expectations. (Parent docs; parent plan login example)
- TypeScript/IDE support requires extra setup because `~dashboard/*` is a Vite-only alias; the parent repo uses a separate `tsconfig` + `declare module` shims for imports used by overrides. (Parent docs)

## Detailed Findings

### RQ1 — Mechanism used in parent project

- The parent project uses `@unlockable/vite-plugin-unlock` with the Medusa preset, configured in `apps/medusa/medusa-config.ts` under `admin.vite`, with overrides directory `./src/admin/overrides` and `debug` enabled in development. (Parent docs `docs/medusa-admin-unlock-overrides.md`; parent plan `2026-03-29_medusa-admin-vite-unlock-overrides.md`)

### RQ2 — Key rules & gotchas (matching, imports, exports)

- **Basename matching**: any override file whose filename matches a file in `@medusajs/dashboard/src/**` replaces that module. Folder path does not need to mirror upstream; only the basename matters. (Parent docs)
- **`~dashboard` alias**: use it to import the original dashboard sources when you want to wrap instead of copy. (Parent docs)
- **Sibling override imports**: if override A imports module B that is also overridden, import B via a **relative path** so Vite resolves your override, not the upstream dashboard module. (Parent `AGENTS.md` key decision; parent docs)
- **Route exports**: for route modules, keep parity with upstream exports (e.g. `Component`, `loader`, `Breadcrumb`). A missing re-export can break shell features (breadcrumbs/route loaders). (Parent docs, Order detail example)

### RQ3 — Structure & TypeScript

- The parent project keeps all overrides in `apps/medusa/src/admin/overrides/` and uses `yarn build` in `apps/medusa` as the authoritative check for override resolution and build correctness. (Parent docs)
- For IDE / `tsc`, the parent project excludes overrides from the primary Medusa `tsc` run and creates a dedicated TS project for overrides with `declare module` shims for each `~dashboard/...` import used. (Parent docs)

### RQ4 — Minimal validation override

- Parent’s operational guide suggests validating wiring by adding a small override (e.g. `login.tsx` branding or `home.tsx` redirect) and confirming plugin debug logs show the module replacement. (Parent docs; parent plan tasks 2–3)
- For this repo, the exact “minimal override” should be chosen based on which admin surface we most urgently need to customize, but **login** and **home** are the fastest smoke tests. (Parent clarification + docs)

## Comparative / Alternatives Analysis (Optional)

- **Fork `@medusajs/dashboard`**:
  - Pros: total control.
  - Cons: high maintenance burden; difficult upgrades.
- **Medusa admin extension points only (widgets/zones)**:
  - Pros: low risk; no module replacement.
  - Cons: cannot override core route chrome/labels in many cases; limited to provided zones.
- **Unlock overrides (recommended)**:
  - Pros: targeted module replacement, no fork, good dev experience.
  - Cons: drift risk on upgrades; filename/API changes can break silently without debug/smoke tests.

## Implications for Implementation

- The plan for `sdoa` should mirror the parent project’s proven setup: plugin wiring in `apps/medusa/medusa-config.ts`, an overrides directory, and TS ergonomics for `~dashboard`.
- Acceptance criteria should include a **post-upgrade regression ritual**: on each dashboard bump, confirm the basenames still exist and re-diff larger forks.
- Decide early whether we want only the minimum “base page” override(s) (e.g. login branding) or the broader set (menu, orders list/detail) since the TS and docs pieces become more important as overrides grow.

## Risks & Open Questions

| Item | Type (Risk / Question) | Owner | Mitigation / Next Step | Due |
| --- | --- | --- | --- | --- |
| Upstream dashboard file renames break overrides | Risk | PabloJVelez | Enable debug in dev; add smoke checklist; re-diff on upgrades | — |
| Wrong import path causes “override not applied” | Risk | PabloJVelez | Enforce relative imports between overridden siblings; document pitfall | — |
| Which admin surfaces are required in `sdoa` vs parent | Question | PabloJVelez | Run `devagent clarify-task` for `sdoa`-specific scope | — |
| TS/IDE friction for `~dashboard` imports | Risk | PabloJVelez | Mirror parent TS shim approach if we use `~dashboard` imports | — |

## Recommended Follow-ups

- Run `devagent clarify-task` to pin `sdoa` scope (minimum override(s) vs full navigation/orders flow customizations).
- Run `devagent create-plan` using the parent docs as the reference baseline; include a minimal smoke-test override as Task 0/1.

## Sources

| Reference | Type | Freshness | Access Notes |
| --- | --- | --- | --- |
| `@/Users/pablo/Personal/development/private-chef-template/private-chef-template/docs/medusa-admin-unlock-overrides.md` | Internal (parent repo doc) | 2026-03-29 | Local path |
| `@/Users/pablo/Personal/development/private-chef-template/private-chef-template/.devagent/workspace/tasks/completed/2026-03-29_override-medusa-admin-overrides/plan/2026-03-29_medusa-admin-vite-unlock-overrides.md` | Internal (parent repo plan) | 2026-03-29 | Local path |
| `@/Users/pablo/Personal/development/private-chef-template/private-chef-template/.devagent/workspace/tasks/completed/2026-03-29_override-medusa-admin-overrides/AGENTS.md` | Internal (parent repo task hub) | 2026-03-29 | Local path |
| `@/Users/pablo/Personal/development/private-chef-template/private-chef-template/.devagent/workspace/tasks/completed/2026-03-29_override-medusa-admin-overrides/clarification/2026-03-29_initial-clarification.md` | Internal (parent repo clarification) | 2026-03-29 | Local path |
| `@/Users/pablo/Personal/development/private-chef-template/private-chef-template/.devagent/workspace/tasks/completed/2026-03-29_override-medusa-admin-overrides/research/2026-03-29_medusa-admin-overrides-with-vite-plugin-unlock.md` | Internal (parent repo research) | 2026-03-29 | Local path |
| [unlockablejs/vite-plugin-unlock](https://github.com/unlockablejs/vite-plugin-unlock) | External (official) | Unknown | Referenced by parent artifacts; version to pin during implementation |

