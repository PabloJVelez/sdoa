# Stripe Connect Express and Direct Charges Migration — Progress Tracker

- Owner: PabloJVelez
- Last Updated: 2026-04-06
- Status: Draft
- Task Hub: `.devagent/workspace/tasks/active/2026-04-05_stripe-connect-express-direct-charges-migration/`

## Summary

Refactor Stripe Connect so new chef onboarding creates **Express** connected accounts (instead of **Custom**) and checkout uses **direct charges** (PaymentIntents created on the connected account) so the **chef is the merchant of record**, with platform revenue via **application fees**. Today, onboarding creates a Custom account (`type: 'custom'` in the Connect account module) and the payment provider uses **destination charges** (`transfer_data.destination`, `application_fee_amount`, `on_behalf_of`). That model debits the **platform** Stripe balance for processing fees, refunds, and chargebacks; `PASS_STRIPE_FEE_TO_CHEF` / `passStripeFeeToChef` only **grosses up** the application fee to approximate pass-through economics—it does not remove platform balance risk.

The desired end state aligns with Connect guidance for SaaS-style storefronts: **Express + direct charges** so fees/refunds/disputes primarily hit the connected account, reducing platform cash-flow exposure. **Clarified (2026-04-05):** one legacy Custom account will be **manually deleted**—no production dual-path for destination vs direct. Billing follows **Stripe handles pricing** (drop **`PASS_STRIPE_FEE_TO_CHEF` gross-up**); **Connect webhooks** match the **parent template** implementation. See References for parent paths and `clarification/2026-04-05_initial-clarification.md`.

**Implementation (2026-04-06):** Express accounts, direct charges with `{ stripeAccount }` on PI lifecycle, removed fee gross-up and `estimate-stripe-processing-fee.ts`, updated admin payout UI, storefront `loadStripe(..., { stripeAccount })`, `.env.template` webhook guidance. `yarn workspace medusa build` passed.

## Agent Update Instructions

- Always update "Last Updated" to today's date (ISO: YYYY-MM-DD) when editing this file. **Get the current date by explicitly running `date +%Y-%m-%d` first, then use the output for the "Last Updated" field.**
- Progress Log: Append a new entry at the end in the form `- [YYYY-MM-DD] Event: concise update, links to files`. Do not rewrite or delete prior entries. **Use the date retrieved from `date +%Y-%m-%d` for the date portion.**
- Implementation Checklist: Mark items as `[x]` when complete, `[~]` for partial with a short note. Add new items if discovered; avoid removing items—strike through only when obsolete.
- Key Decisions: Record important decisions as `- [YYYY-MM-DD] Decision: rationale, links`. **Use the date retrieved from `date +%Y-%m-%d` for the date portion.**
- References: Keep links current to latest spec, research, and tasks. Add additional references as they are created.
- Scope: Edits here should reflect coordination/progress only; do not include application code changes. Preserve history.

## Key Decisions

- [2026-04-05] Decision: **Legacy Custom migration** — only one Custom account exists; it will be **manually deleted**; no dual-path (destination vs direct) requirement for multiple legacy chefs. See `clarification/2026-04-05_initial-clarification.md`.
- [2026-04-05] Decision: **Connect billing** — adopt **“Stripe handles pricing”**; connected account pays Stripe processing fees; **remove / stop using `PASS_STRIPE_FEE_TO_CHEF` gross-up**; align fee and admin copy with **parent template** project.
- [2026-04-05] Decision: **Webhooks** — configure **Connect webhooks** following the **same patterns as the parent project** (operational OK).

## Progress Log

- [2026-04-05] Event: Task hub scaffolded via `devagent new-task`; `AGENTS.md` created. No application code changes.
- [2026-04-05] Event: Research completed — task-scoped packet maps sdoa code to Express + direct charges, webhooks, storefront `stripeAccount`, and open Medusa/Stripe config questions. See `research/2026-04-05_stripe-connect-express-direct-charges-migration.md`.
- [2026-04-05] Event: Clarify-task session started — initial requirement packet and question tracker in `clarification/2026-04-05_initial-clarification.md`; awaiting stakeholder answers (batch 1).
- [2026-04-05] Event: Clarify-task **complete** — Q1–Q3 answered (manual Custom removal; Stripe-handles-pricing, drop fee gross-up; Connect webhooks = parent parity). Packet status Complete. See `clarification/2026-04-05_initial-clarification.md`.
- [2026-04-05] Event: Linked parent **porting checklist** — `private-chef-template/docs/porting-express-direct-charges-sibling-project.md` (prompt output: webhooks, fees, removed env/UI, `loadStripe`, Connect pricing). Primary parity doc for `create-plan`.
- [2026-04-06] Event: **`devagent create-plan`** — implementation plan with five tasks (Express account, provider direct charges + gross-up removal, config/env/docs, storefront `stripeAccount`, admin payout UI). See `plan/2026-04-06_express-direct-charges-implementation-plan.md`.
- [2026-04-06] Event: **`devagent implement-plan`** — all five plan tasks coded in apps/medusa + apps/storefront; `yarn workspace medusa build` OK. Ops: Stripe Dashboard Connect webhook + Connect pricing still required.

## Implementation Checklist

- [x] Clarify product and Stripe Connect billing posture (merchant of record, reporting needs, migration for existing Custom accounts) — `clarification/2026-04-05_initial-clarification.md`.
- [x] Research: Express account creation params, direct charge PaymentIntent flow, Medusa payment provider changes, webhooks and admin reporting — see `research/2026-04-05_stripe-connect-express-direct-charges-migration.md`.
- [x] Plan: implementation tasks, env/webhook docs, validation — [`plan/2026-04-06_express-direct-charges-implementation-plan.md`](./plan/2026-04-06_express-direct-charges-implementation-plan.md).
- [x] Implement: Express + direct charges, env/docs, storefront + admin — see Progress Log 2026-04-06.

## Open Questions

- ~~Connect pricing mode~~ — **Resolved:** Stripe handles pricing; no gross-up. Parent repo is source of parity.
- ~~Migration path for existing Custom accounts~~ — **Resolved:** Single account; manual deletion; no dual-path requirement.
- ~~`reverse_transfer` for destination refunds~~ — **N/A** once destination charges are removed.
- Operational/support playbook for chef-facing disputes under Express (defer to plan or runbooks; Stripe still notes platform responsibilities for Express in some dimensions).
- Platform reporting needs beyond Medusa `payment.data` — only if product asks for deeper Stripe Sigma / Connect reporting later.

## References

- **This task — plan:** [`plan/2026-04-06_express-direct-charges-implementation-plan.md`](./plan/2026-04-06_express-direct-charges-implementation-plan.md) — five implementation tasks, risks, acceptance criteria; freshness 2026-04-06.
- **This task — clarification (complete):** [`clarification/2026-04-05_initial-clarification.md`](./clarification/2026-04-05_initial-clarification.md) — requirement packet, Q&A, plan-ready scope; freshness 2026-04-05.
- **This task — research:** [`research/2026-04-05_stripe-connect-express-direct-charges-migration.md`](./research/2026-04-05_stripe-connect-express-direct-charges-migration.md) — sdoa code map, Stripe citations, webhook and storefront gaps; freshness 2026-04-05.
- **Prior Connect implementation (this repo):** `.devagent/workspace/tasks/completed/2026-03-02_stripe-connect/` — destination charges, `application_fee_amount`, env toggles including fee pass-through; freshness 2026-04-05.
- **Stripe fee pass-through / admin payout context:** `.devagent/workspace/tasks/completed/2026-03-28_order-commission-widget-stripe-fees/research/2026-03-28_stripe-processing-fee-line-order-widget.md` — `passStripeFeeToChef`, provider `data` shape; freshness 2026-04-05.
- **Admin Connect onboarding task:** `.devagent/workspace/tasks/completed/2026-03-03_implement-stripe-admin-onboarding/` — onboarding UI/API alignment; freshness 2026-04-05.
- **Platform fee modes:** `.devagent/workspace/tasks/completed/2026-03-07_configurable-platform-fee-mode-tickets-bento/` — line-based vs cart fees; freshness 2026-04-05.
- **Admin order / Stripe payout UI:** `.devagent/workspace/tasks/completed/2026-03-30_override-medusa-admin-overrides/` — references `order-stripe-payout` and Connect payment data; freshness 2026-04-05.
- **Application code:** `stripe-connect-account` (Express), `stripe-connect` provider (direct charges), `order-stripe-payout` / `order-stripe-payout-breakdown`, storefront `StripeElementsProvider` + `MedusaStripeAddress`; freshness 2026-04-06.
- **Product / memory hubs:** `.devagent/workspace/product/` and `.devagent/workspace/memory/` — not present in this repository as of 2026-04-05; no mission/constitution citations seeded.

**External / sibling template (user-provided paths, outside this repo):**

- **`/Users/pablo/Personal/development/private-chef-template/private-chef-template/docs/porting-express-direct-charges-sibling-project.md`** — **canonical porting checklist** for sdoa (webhook URLs/secrets, `application_fee_amount`, removed gross-up + admin UI, `loadStripe` + `stripeAccount`, Connect pricing); freshness 2026-04-05.
- `/Users/pablo/Personal/development/private-chef-template/private-chef-template/docs/stripe-connect-custom-to-express-migration.md`
- `/Users/pablo/Personal/development/private-chef-template/private-chef-template/.devagent/workspace/tasks/completed/2026-04-05_stripe-connect-express-direct-charges-migration/` (clarification, research, plan, `AGENTS.md`)

## Next Steps

1. **`devagent implement-plan`** (or execute tasks from the plan) — [`plan/2026-04-06_express-direct-charges-implementation-plan.md`](./plan/2026-04-06_express-direct-charges-implementation-plan.md).
2. Configure Stripe Dashboard (Connect webhooks, Connect pricing) per plan Task 3 and parent porting doc.
