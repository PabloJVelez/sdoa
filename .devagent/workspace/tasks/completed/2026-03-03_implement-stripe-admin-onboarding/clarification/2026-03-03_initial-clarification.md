# Clarified Requirement Packet — Implement Stripe Admin Onboarding

- Requestor: Pablo (Developer/Owner)
- Decision Maker: Pablo (Developer/Owner)
- Date: 2026-03-03
- Mode: Task Clarification
- Status: Complete
- Related Task Hub: `.devagent/workspace/tasks/completed/2026-03-03_implement-stripe-admin-onboarding/`
- Notes: Initial clarification session for migrating Stripe Connect from env-based `STRIPE_CONNECTED_ACCOUNT_ID` to admin-driven onboarding with DB-backed connected account state.

## Task Overview

### Context
- **Task name/slug:** 2026-03-03_implement-stripe-admin-onboarding
- **Business context:** Replace the static `STRIPE_CONNECTED_ACCOUNT_ID` env var with an admin UI onboarding flow so Stripe Connect can be configured and updated without redeploys, while keeping the existing Stripe Connect payment behavior and fee model.
- **Stakeholders:** Pablo (Developer/Owner, primary decision maker)
- **Prior work:** 
  - Completed task hub `2026-03-02_stripe-connect` (Stripe Connect provider implementation, env-based connected account).
  - Research packet `2026-03-03_stripe-admin-onboarding-research.md` summarizing the migration design.
  - External design doc `stripe-connect-onboarding-migration.md`.

### Clarification Sessions
- Session 1: 2026-03-03 — Initial gap-driven clarification with Pablo focused on implementation scope, environments, and UX/error expectations.

---

## Clarified Requirements

### Scope & End Goal

**What needs to be done?**
Implement the Stripe Connect admin onboarding flow described in the migration spec across all environments (local, staging, production), replacing the env-based `STRIPE_CONNECTED_ACCOUNT_ID` with a DB-backed connected account and admin UI for configuring it.

**What's the end goal architecture or state?**
Stripe Connect is configured via the Medusa admin in every environment: a single `stripe_connect_account` record stores the connected account id and status, an admin settings page at `/app/stripe-connect` drives onboarding via Stripe-hosted flows, webhooks keep status in sync, and the existing `stripe-connect` provider resolves the connected account from the DB at payment time instead of from env.

**In-scope (must-have):**
- Admin onboarding + DB model wired in all environments (local, staging, prod) once implemented.
- Stripe Connect payments fail gracefully when enabled but no active connected account exists, with a generic error shown to customers and a clear server-side error for operators.
- Admin UI page at `/app/stripe-connect` with rich status details (ID, key flags, and basic business profile) and actions to start or resume onboarding.

**Out-of-scope (won't-have):**
- Multi-vendor or per-vendor connected account management.
- Vendor self-serve onboarding flows.

**Nice-to-have (could be deferred):**
- More detailed admin diagnostics (timestamps, full business profile, history) beyond the initial rich view.

---

### Technical Constraints & Requirements

- Stripe Connect remains single-vendor: at most one active row in `stripe_connect_account`.
- All environments currently in use (local, staging) are expected to support the admin onboarding flow once deployed; there is no production environment yet, but the design should naturally extend to prod without special cases.
- We don’t need a bespoke migration path for existing `STRIPE_CONNECTED_ACCOUNT_ID` values right now, since there’s no production deployment; for now we can assume a “greenfield” migration and revisit env-based migration logic later if needed.
- When `USE_STRIPE_CONNECT` is true but no active connected account exists, checkout must not silently succeed; the payment attempt should fail with a generic message for customers and a more specific “no account onboarded” error logged server-side for admins.
- The admin UI should surface a rich but not exhaustive view of the Stripe account (status, account id, key capability flags like `charges_enabled`/`payouts_enabled`, and selected business profile fields) without exposing sensitive data.
- For local development, it’s acceptable to start with the real Stripe Connect onboarding flow in test mode and introduce shortcuts/dev-only helpers later if the flow becomes too heavy.

---

### Dependencies & Blockers

<To be filled based on clarification answers.>

---

### Implementation Approach

<To be filled based on clarification answers and downstream planning.>

---

### Acceptance Criteria & Verification

<To be filled based on clarification answers.>

---

### Business Topics (Optional - Only for New Features)

For this primarily technical migration, business/problem and success-metric sections are optional and may remain minimal.

---

## Assumptions Log

| Assumption | Owner | Validation Required | Validation Method | Due Date | Status |
| --- | --- | --- | --- | --- | --- |
| Single-vendor setup with at most one connected account row in `stripe_connect_account`. | Pablo | No | Based on current SDOA design and prior Stripe Connect clarification. | 2026-03-03 | Validated |
| Admin onboarding is only needed for internal operators (no vendor self-serve onboarding yet). | Pablo | No | Matches current single-vendor scope; multi-vendor deferred. | 2026-03-03 | Validated |
| No production environment exists yet; rollout and migration can focus on local and staging, treating env-based `STRIPE_CONNECTED_ACCOUNT_ID` as non-critical for now. | Pablo | No | Reflects current deployment state. | 2026-03-03 | Validated |

---

## Gaps Requiring Research
### For #ResearchAgent

**Research Question 1:** Confirm best-practice raw body handling for Stripe Connect webhooks in Medusa v2  
- Context: `/webhooks/stripe-connect` needs to verify signatures using `STRIPE_CONNECT_WEBHOOK_SECRET`, which may require access to the raw request body.  
- Evidence needed: Medusa v2 documentation or examples showing how to configure raw body access for specific routes, or a recommended pattern for Stripe webhooks.  
- Priority: Medium  
- Blocks: Not strictly blocking the clarification or planning, but required to finalize the webhook implementation details.

---

## Clarification Session Log

### Session 1: 2026-03-03
**Participants:** Pablo (Developer/Owner), DevAgent

**Questions Asked:**
1. Rollout scope across environments for the migration? → **A.** Implement the full admin onboarding + DB model and enable it in all environments (local, staging, prod) as soon as it’s ready. (Pablo) — Status: ✅ answered
2. Behavior when Stripe Connect is enabled but no active connected account exists? → **A.** Hard-fail checkout with a generic “payment failed” message, with a more detailed “no account onboarded” error logged server-side for admins. (Pablo) — Status: ✅ answered
3. Desired level of detail on the `/app/stripe-connect` admin page? → **C.** Rich view including status, Stripe account ID, key flags (e.g. charges/payouts), and selected business profile fields. (Pablo) — Status: ✅ answered
4. How to handle existing `STRIPE_CONNECTED_ACCOUNT_ID` values when the migration ships? → There’s no production environment yet, so we don’t need to worry about a production migration path; focus on local/staging and treat env-based IDs as non-critical for now. (Pablo) — Status: ✅ answered
5. Local development expectations around onboarding? → **C.** Start with the real Stripe Connect onboarding flow in test mode and only add shortcuts later if it becomes painful. (Pablo) — Status: ✅ answered
6. Must-have acceptance criteria for this migration? → **B.** A customer checkout using the `stripe-connect` provider succeeds and splits fees as before, with no reliance on `STRIPE_CONNECTED_ACCOUNT_ID`. Other acceptance items (admin UI richness, error behavior, env cleanup) are important but can be prioritized by the implementation plan. (Pablo) — Status: ✅ answered

**Ambiguities Surfaced:**
- How to handle existing `STRIPE_CONNECTED_ACCOUNT_ID` values during migration (auto-seed DB vs. require admin to onboard via UI).
- Expectations for local development convenience (real onboarding vs. shortcuts/mocks).

**Conflicts Identified:**
- None so far.

**Unresolved Items:**
- <To be filled.>

---

## Next Steps

### Spec Readiness Assessment
**Status:** ☑ Ready for Spec | ⬜ Research Needed | ⬜ More Clarification Needed

**Plan Readiness Assessment:**
- Requirements are clear enough for `devagent create-plan` to proceed: scope, environment behavior, admin UX level, and core acceptance criteria (checkout success without env-based account id) are all defined. Remaining technical details like raw body handling for Stripe webhooks are better handled as research/implementation notes rather than clarification items.

**Rationale:**
- High-level migration design is captured in the research packet; this clarification adds concrete decisions about rollout scope, error behavior, admin UI richness, local dev expectations, and what “done” means for checkout behavior, which is sufficient for planning work.

### Recommended Actions

- Hand this clarification packet, along with the research document, to `devagent create-plan` to design an implementation plan for the Stripe admin onboarding migration.


