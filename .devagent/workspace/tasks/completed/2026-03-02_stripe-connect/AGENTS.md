# Implement Stripe Connect Progress Tracker

- Owner: PabloJVelez
- Last Updated: 2026-03-03
- Status: Complete
- Task Hub: `.devagent/workspace/tasks/completed/2026-03-02_stripe-connect/`

## Summary

Implement **Stripe Connect** on this project so the platform can collect a configurable application fee (e.g. 5%) on transactions, with the remainder transferred to a connected account. This project shares the same base as another project where Stripe Connect is already implemented; the implementation here should follow that reference closely.

The reference implementation uses:
- A custom Stripe Connect payment provider module (destination charges, `application_fee_amount`, `transfer_data[destination]`, optional `on_behalf_of`)
- Platform account = merchant of record; connected account receives the remainder
- Config-driven fee percentage, refund behavior (`REFUND_APPLICATION_FEE`), and optional Stripe fee pass-through
- Provider identifier `stripe-connect` (Medusa provider ID `pp_stripe-connect_stripe-connect`)
- Currency-aware amount conversion and webhook handling for Connect events

Current state in this repo: Medusa uses the standard Stripe provider (`@medusajs/medusa/payment-stripe`, `id: 'stripe'`) in `apps/medusa/medusa-config.ts` (lines 142–153) with only `apiKey` configured. The task is to introduce a custom Stripe Connect provider (or equivalent configuration) and related env/docs, using the attached reference materials (AGENTS.md, research, clarification, environment variables doc, implementation plan from the other project) as the primary guide.

## Agent Update Instructions
- Always update "Last Updated" to today's date (ISO: YYYY-MM-DD) when editing this file. **Get the current date by explicitly running `date +%Y-%m-%d` first, then use the output for the "Last Updated" field.**
- Progress Log: Append a new entry at the end in the form `- [YYYY-MM-DD] Event: concise update, links to files`. Do not rewrite or delete prior entries. **Use the date retrieved from `date +%Y-%m-%d` for the date portion.**
- Implementation Checklist: Mark items as `[x]` when complete, `[~]` for partial with a short note. Add new items if discovered; avoid removing items—strike through only when obsolete.
- Key Decisions: Record important decisions as `- [YYYY-MM-DD] Decision: rationale, links`. **Use the date retrieved from `date +%Y-%m-%d` for the date portion.**
- References: Keep links current to latest spec, research, and tasks. Add additional references as they are created.
- Scope: Edits here should reflect coordination/progress only; do not include application code changes. Preserve history.

## Key Decisions
- [2026-03-02] Decision: Task created to implement Stripe Connect using the reference implementation from the sibling project (same base) as the guide. No decisions on account ownership or fee model yet—to be aligned during research/clarification.
- [2026-03-02] Decision: Platform = developer's Stripe account; connected account = single vendor/chef. 5% platform fee, do not refund platform fee on customer refunds (configurable via env). Support `USE_STRIPE_CONNECT` env toggle so standard Stripe can be used when false (e.g. local dev without connected account). See `clarification/2026-03-02_initial-clarification.md`.

## Progress Log
- [2026-03-02] Task created: Scaffolded task hub for implementing Stripe Connect. Reference materials provided from sibling project (completed implementation with 5% platform fee, research, clarification, env docs, implementation plan). Current config: standard Stripe provider in `apps/medusa/medusa-config.ts`.
- [2026-03-02] Research completed: Validated current payment setup, frontend/backend coupling to `pp_stripe_stripe`, module layout, env template, and seed scripts. Recommendation: add custom stripe-connect provider, update config and all provider-id references to `pp_stripe-connect_stripe-connect`, extend env/docs. See `research/2026-03-02_stripe-connect-implementation-research.md`.
- [2026-03-02] Clarification completed: Platform = developer's Stripe, connected = single vendor; 5% fee, do not refund platform fee (configurable via env); support `USE_STRIPE_CONNECT` toggle for standard Stripe vs Connect. See `clarification/2026-03-02_initial-clarification.md`.
- [2026-03-02] Plan created: Five implementation tasks (provider service + types + currency util, module export, medusa-config + env + .env.template, storefront + seed provider-id updates, E2E verification). See `plan/2026-03-02_stripe-connect-implementation-plan.md`.
- [2026-03-02] Task 1 completed: Created Stripe Connect provider types, service (AbstractPaymentProvider), and `get-smallest-unit` util. `apps/medusa/src/modules/stripe-connect/types.ts`, `service.ts`, `utils/get-smallest-unit.ts`.
- [2026-03-02] Task 2 completed: Module index exports provider; payment module resolves `./src/modules/stripe-connect` with id `stripe-connect`. `apps/medusa/src/modules/stripe-connect/index.ts`.
- [2026-03-02] Task 3 completed: medusa-config uses stripe-connect provider with options from env; .env.template extended with USE_STRIPE_CONNECT, STRIPE_CONNECTED_ACCOUNT_ID, PLATFORM_FEE_PERCENT, REFUND_APPLICATION_FEE, STRIPE_WEBHOOK_SECRET, PASS_STRIPE_FEE_TO_CHEF, STRIPE_FEE_*. `apps/medusa/medusa-config.ts`, `apps/medusa/.env.template`.
- [2026-03-02] Task 4 completed: Replaced all `pp_stripe_stripe` with `pp_stripe-connect_stripe-connect` in storefront (StripeElementsProvider, StripePaymentForm, CheckoutPayment, StripeExpressPaymentForm, cart.server, api.checkout.shipping-methods, api.checkout.complete) and seed scripts (seed.ts, seed-menus.ts).
- [2026-03-02] Task 5 skipped: Manual/E2E verification; to be run when Connect account and webhook are configured. See plan Task 5 acceptance criteria.
- [2026-03-03] Task hub completed and archived: Moved task directory to `completed/2026-03-02_stripe-connect/` and updated all internal path references from `active/` to `completed/`.

## Implementation Checklist
- [x] Research: Confirm current payment setup and align with reference implementation patterns (provider interface, env vars, webhooks). See `research/2026-03-02_stripe-connect-implementation-research.md`.
- [x] Clarification: Confirm platform vs connected account ownership and fee/refund behavior for this project if different from reference. See `clarification/2026-03-02_initial-clarification.md`.
- [x] Plan: Create implementation plan (e.g. custom provider module, config update, env/docs, testing). See `plan/2026-03-02_stripe-connect-implementation-plan.md`.
- [x] Task 1: Create Stripe Connect payment provider service and types (`apps/medusa/src/modules/stripe-connect/types.ts`, `service.ts`, `utils/get-smallest-unit.ts`).
- [x] Task 2: Create module provider definition and wire payment module (`apps/medusa/src/modules/stripe-connect/index.ts`).
- [x] Task 3: Update Medusa configuration and environment variables (`medusa-config.ts`, `.env.template`).
- [x] Task 4: Update storefront and seed scripts to use new provider id (`pp_stripe-connect_stripe-connect`).
- [~] Task 5: Verify payment flow and fee splitting (manual / E2E). Skipped—manual verification; run when STRIPE_CONNECTED_ACCOUNT_ID and webhook are configured.
- [x] Implementation: Execute plan (provider service, module definition, medusa-config, environment variables, docs).
- [ ] Testing: Verify payment flow and fee splitting in Stripe test mode.

## Open Questions
- ~~Platform vs connected account for this project?~~ **Resolved:** Same as reference (developer = platform, single vendor = connected). See clarification packet.
- ~~Target platform fee percentage and refund behavior?~~ **Resolved:** Reuse reference (5%, don't refund platform fee; configurable via env). See clarification packet.

## References
- **Current Stripe config**: `apps/medusa/medusa-config.ts` (lines 142–153) — standard payment-stripe provider, 2026-03-02
- **New-task workflow**: `.devagent/core/workflows/new-task.md`
- **Reference materials**: Attached in task intake — AGENTS.md, research, clarification, environment-variables doc, implementation plan from sibling project (Stripe Connect with 5% platform fee, completed). Use these as the primary implementation guide.
- **Research**: [`research/2026-03-02_stripe-connect-implementation-research.md`](./research/2026-03-02_stripe-connect-implementation-research.md) — implementation design, provider id impact, repo next steps, risks.
- **Clarification**: [`clarification/2026-03-02_initial-clarification.md`](./clarification/2026-03-02_initial-clarification.md) — account ownership, fee/refund, USE_STRIPE_CONNECT toggle; plan-ready.
- **Plan**: [`plan/2026-03-02_stripe-connect-implementation-plan.md`](./plan/2026-03-02_stripe-connect-implementation-plan.md) — five implementation tasks, acceptance criteria, implementation guidance.
- **Reference service**: [`reference/service-reference.ts`](./reference/service-reference.ts) — sibling project Stripe Connect provider service class (copy/adapt for `apps/medusa/src/modules/stripe-connect/`).

## Next Steps

1. ~~**Clarify scope**~~ ✅ Done
2. ~~**Research**~~ ✅ Done
3. ~~**Create plan**~~ ✅ Done — see `plan/2026-03-02_stripe-connect-implementation-plan.md`
4. ~~**Implement**~~ ✅ Done — Tasks 1–4 implemented; Task 5 (manual verification) skipped.
5. ~~**Testing**~~ ✅ Manual Stripe test-mode verification recommended as an operational step (not tracked as an active DevAgent task).
