# Configurable Platform Fee Mode for Tickets and Bento — Progress Tracker

- Owner: PabloJVelez
- Last Updated: 2026-03-07
- Status: Draft
- Task Hub: `.devagent/workspace/tasks/active/2026-03-07_configurable-platform-fee-mode-tickets-bento/`

## Summary
The project already supports Stripe Connect with commission amount driven by the env var `PLATFORM_FEE_PERCENT`. This task introduces configuration to control *how* commission is accounted for. The storefront sells both chef event tickets and delivered bento boxes. Commission for chef event tickets should be configurable as either a dollar amount per ticket or a percentage of the ticket; similarly, for bento boxes it should be either a percentage of the boxes’ value or a set dollar amount. The behavior should be config-driven—e.g. a flag like `CHARGE_PER_TICKET` set to `true` would make the platform fee be charged per ticket; when set to `false`, a percentage or dollar amount of the cart is taken for the platform fee as it behaves today.

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
- [2026-03-07] Event: Task hub created from new-task workflow; summary and references seeded.
- [2026-03-07] Event: clarify-task session 1 completed; answers captured in `clarification/2026-03-07_initial-clarification.md` (SKU-based ticket/bento distinction, separate config per type, per-unit cents env vars; future note for tag/attribute; one research gap: payment provider line-item context).
- [2026-03-07] Event: research completed; payment provider context and line-item access documented in `research/2026-03-07_payment-provider-context-line-items.md` (provider receives amount/context only; options: use context.resource_id if cart_id, custom context, or precompute fee in workflow).
- [2026-03-07] Event: implementation plan created at `plan/2026-03-07_configurable-platform-fee-implementation-plan.md` (5 tasks: verify context/strategy, env/config, fee calculation, cart resolution or workflow step, tests and docs).

## Implementation Checklist
- [ ] Task 1: Verify payment context and choose strategy (A/B/C) — see plan.
- [ ] Task 2: Add env vars and provider config shape (medusa-config, types, .env.example).
- [ ] Task 3: Implement per-line fee calculation and wire into provider (or workflow).
- [ ] Task 4: Resolve cart to line items (Option A) or add workflow step (Option B/C).
- [ ] Task 5: Tests, env docs, and future-improvement note.

## Open Questions
- (To be populated as needed.)

## References
- `.devagent/workspace/tasks/active/2026-03-07_configurable-platform-fee-mode-tickets-bento/plan/2026-03-07_configurable-platform-fee-implementation-plan.md` — Implementation plan (5 tasks: verify context, env/config, fee logic, cart or workflow, tests/docs). 2026-03-07.
- `.devagent/workspace/tasks/active/2026-03-07_configurable-platform-fee-mode-tickets-bento/clarification/2026-03-07_initial-clarification.md` — Clarification packet (scope, config model, SKU-based product type, seed-script note, research gap). 2026-03-07.
- `.devagent/workspace/tasks/active/2026-03-07_configurable-platform-fee-mode-tickets-bento/research/2026-03-07_payment-provider-context-line-items.md` — Research: payment provider input (amount/context only; no line items in API); options to get line-level fee (context.cart_id, custom context, or precompute in workflow). 2026-03-07.
- `.devagent/workspace/tasks/completed/2026-03-02_stripe-connect/research/2026-03-02_stripe-connect-implementation-research.md` — Stripe Connect implementation (platform fee, destination charges, env vars). 2026-03-07.
- `.devagent/workspace/tasks/completed/2026-03-02_stripe-connect/` — Task hub for Stripe Connect; custom provider, `PLATFORM_FEE_PERCENT`, `application_fee_amount`. 2026-03-07.
- `.devagent/workspace/tasks/completed/2026-03-03_implement-stripe-admin-onboarding/plan/` — Admin onboarding plan; preserves `USE_STRIPE_CONNECT` and fee/refund semantics. 2026-03-07.
- `apps/medusa/medusa-config.ts` — Current use of `PLATFORM_FEE_PERCENT` for stripe-connect provider options. 2026-03-07.
- `apps/medusa/src/modules/stripe-connect/service.ts` — Payment provider that applies `application_fee_amount`; fee calculation lives here. 2026-03-07.

## Next Steps
- **Clarify scope:** `devagent clarify-task` — validate product types (tickets vs bento), env names, and per-item vs cart-level semantics.
- **Research:** `devagent research` — map how fee is currently computed (cart vs line items), Stripe Connect constraints, and where to plug per-ticket/per-bento config.
- **Create plan:** `devagent create-plan` — after research, produce an implementation plan (env schema, provider changes, and any storefront/API updates).
