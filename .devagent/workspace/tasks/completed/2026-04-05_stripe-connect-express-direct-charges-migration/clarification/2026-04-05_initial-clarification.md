# Clarified Requirement Packet — Stripe Connect Express + Direct Charges Migration

- Requestor: PabloJVelez
- Decision Maker: PabloJVelez
- Date: 2026-04-05
- Mode: Task Clarification
- Status: Complete
- Related Task Hub: `.devagent/workspace/tasks/completed/2026-04-05_stripe-connect-express-direct-charges-migration/`
- **Plan readiness:** Ready for `devagent create-plan` — align implementation details with parent template repo where noted below.

## Inferred task concept

Migrate **sdoa** from Stripe Connect **Custom** accounts + **destination charges** to **Express** + **direct charges**, with the connected chef as merchant of record for card fees/refunds/chargebacks where Stripe’s model applies, while the platform still collects **`application_fee_amount`**.

## Assumptions (`[INFERRED]`)

- Parent **private-chef-template** repo remains the reference for Connect webhook wiring and fee-billing behavior parity unless this packet says otherwise.
- After migration, **destination charges are not a supported path** in this codebase (no dual-path env unless plan adds one for safety).

---

## Question tracker (session)

| # | Topic | Status | Answer summary |
|---|--------|--------|----------------|
| 1 | Existing Custom accounts — v1 behavior | ✅ answered | Only one Custom account exists; stakeholder will **manually delete** it. **No** dual-path / legacy migration work required for multiple existing chefs. |
| 2 | Connect platform pricing / fee billing | ✅ answered | **“Stripe handles pricing”** posture: connected account incurs Stripe processing fees; **`PASS_STRIPE_FEE_TO_CHEF` / gross-up is no longer needed** (remove or default off and simplify admin copy). Match parent project’s handling; use prompt below if parent specifics are unclear. |
| 3 | Stripe webhook operational constraints | ✅ answered | **Yes** to Connect webhooks; **follow the same patterns as the parent project** (Dashboard endpoint, URL, secrets as implemented there). |

---

## Clarified requirements

### Scope & end goal

**What needs to be done**

- Onboarding creates **Express** connected accounts (replace `type: 'custom'`).
- Checkout uses **direct charges**: PaymentIntents on the connected account with **`application_fee_amount`** for platform commission; **no** `transfer_data` / destination-charge shape.
- Storefront Stripe.js uses **`stripeAccount`** (or equivalent) consistent with direct charges.
- Webhooks: **Connect** endpoint behavior **parity with parent template** so `payment_intent.*` (and related) events resolve correctly for Medusa.
- Remove or deprecate **fee gross-up** (`passStripeFeeToChef` and related env/config) because processing fees sit on the connected account under Stripe-handles-pricing; align admin payout/commission copy with parent.

**In-scope (must-have)**

- Express account creation + existing Account Link onboarding flow updated as needed.
- Provider: scoped Stripe API calls for PI lifecycle; persist `connected_account_id` without relying on `transfer_data.destination`.
- Storefront Elements provider + payment confirmation path updated for connected account context.
- Env / `.env.template` / docs: drop or document deprecated gross-up vars; any new vars per parent pattern.

**Out-of-scope (explicit)**

- Supporting **multiple** legacy Custom accounts or a **toggle** between destination and direct for production chefs (none expected after manual DB/Stripe cleanup).
- Fixing **`reverse_transfer`** for destination refunds — **not applicable** once destination charges are removed.

**Nice-to-have**

- Optional prompt to parent project for fine-grained Stripe Dashboard / fee-payer settings (see below).

### Technical constraints & requirements

- Medusa v2 custom payment provider (`stripe-connect`) + React storefront.
- Stripe Connect; Dashboard webhook configuration must match parent project’s working setup.

### Dependencies & blockers

- **Parent repo** as behavioral reference: `/Users/pablo/Personal/development/private-chef-template/private-chef-template/` (migration doc + completed task artifacts).
- Spike only if Medusa webhook payload differs in practice from parent (low risk if copying pattern).

### Implementation approach

- **Port parity** from parent implementation where possible; diff against sdoa-only features (per-line fees, admin widgets) during `create-plan`.

### Acceptance criteria & verification

- Test mode: complete onboarding → **Express** account; storefront payment succeeds; platform receives application fee; refund path debits connected account as expected per Stripe.
- Webhooks: payment success (and failure if tested) updates Medusa payment session as today.
- Admin: commission/payout UI does not assume gross-up when disabled; labels match reality.

---

## Assumptions log

| Assumption | Owner | Validation required | Method |
|------------|-------|---------------------|--------|
| Single Custom account deleted before go-live; DB row cleared | PabloJVelez | Yes | Manual |
| Parent project’s Connect + webhook + fee config is correct reference | PabloJVelez | Low | Spot-check during plan |

---

## Gaps requiring research

- **None blocking clarification.** Any Medusa-specific webhook edge case → short spike during implementation or plan task.

---

## Parent parity reference (canonical)

Stakeholder added the prompt output as a **checklist for child projects** (use as the main implementation spec alongside this packet):

`/Users/pablo/Personal/development/private-chef-template/private-chef-template/docs/porting-express-direct-charges-sibling-project.md`

It covers: Medusa `/hooks/payment/<provider-id>` with **Connect** webhook listening, second endpoint for `account.updated` + `STRIPE_CONNECT_WEBHOOK_SECRET`, **`application_fee_amount`** = platform commission (no gross-up), **removed** `PASS_STRIPE_FEE_TO_CHEF` / related env and admin “Stripe fees” rows, **`loadStripe(pk, { stripeAccount })`**, Dashboard **Connect → Pricing** (“Stripe handles pricing”), and a **quick parity checklist**.

*(Original prompt text, if ever needed again, is preserved in the 2026-04-05 clarify-task chat history.)*

---

## Clarification session log

- **2026-04-05 — Session 1 (async):** Initial packet; questions 1–3 asked.
- **2026-04-05 — Session 1 (continued):** Stakeholder answered Q1–Q3 (manual Custom deletion; Stripe handles pricing + remove gross-up; Connect webhooks = parent parity). Packet marked **Complete**.

---

## Next steps

1. **`devagent create-plan`** — tasks keyed to **`porting-express-direct-charges-sibling-project.md`** + sdoa deltas (per-line fees, order widgets, env name differences if any).

---

## Change log

- 2026-04-05 — Initial packet scaffolded; Q1–Q3 asked.
- 2026-04-05 — Q1–Q3 answered; requirements filled; status **Complete**; parent prompt added.
- 2026-04-05 — Linked **`docs/porting-express-direct-charges-sibling-project.md`** (parent); replaced optional prompt section with canonical path + summary.
