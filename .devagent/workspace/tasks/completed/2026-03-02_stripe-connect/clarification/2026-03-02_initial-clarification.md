# Clarified Requirement Packet — Implement Stripe Connect

- Requestor: PabloJVelez (Owner)
- Decision Maker: PabloJVelez
- Date: 2026-03-02
- Mode: Task Clarification
- Status: Complete
- Related Task Hub: `.devagent/workspace/tasks/completed/2026-03-02_stripe-connect/`
- Notes: Session 1 started; gap-driven questions in progress.

## Task Overview

### Context
- **Task name/slug:** 2026-03-02_stripe-connect / Implement Stripe Connect
- **Business context:** Implement Stripe Connect so the platform can collect a configurable application fee on transactions, with the remainder transferred to a connected account. This project (SDOA) shares the same base as another project where Stripe Connect is already implemented; implementation should follow that reference closely.
- **Stakeholders:** PabloJVelez (Owner, Decision Maker)
- **Prior work:** Task hub AGENTS.md, research artifact `research/2026-03-02_stripe-connect-implementation-research.md`; reference materials from sibling project (completed Stripe Connect with 5% platform fee, research, clarification, env docs, implementation plan).

### Clarification Sessions
- Session 1: 2026-03-02 — Complete. Confirmed: platform = developer's Stripe, connected = single vendor; 5% fee, no refund of fee (configurable); support USE_STRIPE_CONNECT toggle for standard vs Connect.

---

## Clarified Requirements

*(To be filled incrementally as answers are received.)*

### Scope & End Goal
- **What needs to be done:** Add custom Stripe Connect payment provider (destination charges, application fee, optional on_behalf_of), update medusa-config, extend env/docs, update all provider-id references from `pp_stripe_stripe` to `pp_stripe-connect_stripe-connect` in storefront and seeds.
- **End state:** Platform collects configurable fee; connected account receives remainder; config-driven refund and optional Stripe fee pass-through.
- **In-scope:** Custom provider module, config update, env vars, frontend/seed provider id updates, webhook handling, currency-aware amounts.
- **Out-of-scope:** Multi-vendor support (reference is single connected account); connected account onboarding UI (per reference).

### Technical Constraints & Requirements
- Medusa v2 payment provider interface; Stripe Connect destination charges; env-driven configuration.
- **Platform account:** Developer's Stripe account (merchant of record, collects platform fee).
- **Connected account:** Single vendor/chef (receives remainder). No multi-vendor in scope.
- **Fee & refund:** 5% platform fee by default; do not refund platform fee when customer is refunded. Configurable via env (e.g. `PLATFORM_FEE_PERCENT`, `REFUND_APPLICATION_FEE`) per reference.
- **Fallback:** Support `USE_STRIPE_CONNECT=true|false`; when false, behave like standard Stripe (no Connect).

### Dependencies & Blockers
- Stripe Dashboard: Connect enabled, connected account, webhook secret. No code blockers identified.

### Implementation Approach
- Follow reference implementation (custom provider under `apps/medusa/src/modules/stripe-connect/`); provider id `stripe-connect`; options from env.
- **Support both standard Stripe and Stripe Connect via env:** When `USE_STRIPE_CONNECT=false` (or unset), provider behaves like current standard Stripe (no Connect, no platform fee); when `USE_STRIPE_CONNECT=true`, use destination charges and application fee. Enables local dev without a connected account.

### Acceptance Criteria & Verification
- Payment flow works in Stripe test mode; platform receives fee, connected account receives transfer; refund respects config; webhooks process correctly.
- When `USE_STRIPE_CONNECT=false`, checkout works with standard Stripe (no Connect). When `USE_STRIPE_CONNECT=true`, Connect flow and fee splitting work as specified.

---

## Assumptions Log

| Assumption | Owner | Validation Required | Validation Method | Status |
| --- | --- | --- | --- | --- |
| Single connected account (no multi-vendor) as in reference | PabloJVelez | Yes | Clarification | Validated |
| Implementation can follow sibling project patterns | PabloJVelez | No | Documented in task | — |
| Developer's Stripe = platform, one vendor/chef = connected account | PabloJVelez | Yes | Clarification | Validated |
| 5% platform fee, do not refund platform fee on customer refunds (configurable via env) | PabloJVelez | Yes | Clarification | Validated |
| Support USE_STRIPE_CONNECT toggle for standard vs Connect behavior | PabloJVelez | Yes | Clarification | Validated |

---

## Gaps Requiring Research

*(None yet; may add if clarification surfaces evidence needs.)*

---

## Clarification Session Log

### Session 1: 2026-03-02
**Participants:** PabloJVelez (Owner)

**Questions Asked:**

1. **For this project (SDOA), who is the platform account and who is the connected account?**  
   → **A.** Same as reference: developer's Stripe = platform, one vendor/chef = connected account. (PabloJVelez)

2. **Platform fee percentage and refund behavior?**  
   → **A.** Reuse reference defaults: 5% platform fee, do not refund platform fee on refunds (configurable via env if needed). (PabloJVelez)

3. **Support switching between standard Stripe and Stripe Connect via env?**  
   → **A.** Yes — support both via env (e.g. `USE_STRIPE_CONNECT=true/false`); when false, behave like current standard Stripe. (PabloJVelez)

**Question tracker:**

| # | Question (short) | Status |
|---|-----------------|--------|
| 1 | Platform vs connected account in SDOA | ✅ answered |
| 2 | Platform fee % and refund behavior | ✅ answered |
| 3 | Support standard Stripe vs Connect via env? | ✅ answered |

**Unresolved Items:** None.

---

## Next Steps

### Spec Readiness Assessment
**Status:** ☑ Ready for Spec | ⬜ Research Needed | ⬜ More Clarification Needed

**Plan Readiness:** Critical gaps addressed. Scope (custom Connect provider, config, env, provider-id updates), technical constraints (platform/connected account, 5% fee, no refund of fee, env toggle), and verification (test-mode payment + Connect vs standard behavior) are clear. No blockers; devagent create-plan can proceed.

---

## Change Log
- 2026-03-02: Initial packet created; Session 1 started.
- 2026-03-02: Session 1 completed. Answers recorded: A, A, A (platform/connected, fee/refund, env toggle). Plan readiness set to Ready.
