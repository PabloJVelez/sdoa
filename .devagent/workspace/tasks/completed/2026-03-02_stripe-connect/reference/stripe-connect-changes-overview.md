# Stripe Connect Implementation — Changes Overview

This document provides a detailed overview of all changes made in this branch to implement Stripe Connect for the SDOA platform.

---

## Table of Contents

1. [Summary](#summary)
2. [Architecture](#architecture)
3. [New Files](#new-files)
4. [Modified Files](#modified-files)
5. [Environment Variables (Detailed)](#environment-variables-detailed)
6. [Provider ID Change](#provider-id-change)
7. [How the Module Works](#how-the-module-works)
8. [Payment Flows](#payment-flows)
9. [Fee Calculation](#fee-calculation)
10. [Webhook Handling](#webhook-handling)
11. [Currency Handling](#currency-handling)
12. [Setup Checklist](#setup-checklist)

---

## Summary

This branch replaces the standard Medusa Stripe payment provider (`@medusajs/medusa/payment-stripe`, provider id `pp_stripe_stripe`) with a custom **Stripe Connect** payment provider module (`apps/medusa/src/modules/stripe-connect/`, provider id `pp_stripe-connect_stripe-connect`).

The provider supports two modes controlled by the `USE_STRIPE_CONNECT` environment variable:

| Mode | `USE_STRIPE_CONNECT` | Behavior |
|------|---------------------|----------|
| **Standard Stripe** | `false` (or unset) | Creates normal PaymentIntents. No application fee, no transfer. Behaves identically to the old `@medusajs/medusa/payment-stripe` provider. Suitable for local dev or single-account setups. |
| **Stripe Connect** | `true` | Creates PaymentIntents with `application_fee_amount`, `transfer_data.destination`, and `on_behalf_of`. Platform collects a configurable fee; remainder transfers to the connected account. |

---

## Architecture

```
apps/medusa/
├── medusa-config.ts                        # Wires the provider into Medusa's payment module
├── .env.template                           # Documents all required/optional env vars
├── src/modules/stripe-connect/
│   ├── index.ts                            # ModuleProvider export (registers with Medusa)
│   ├── service.ts                          # Core provider service (AbstractPaymentProvider)
│   ├── types.ts                            # TypeScript interfaces (options, config, payment data)
│   └── utils/
│       └── get-smallest-unit.ts            # Currency-aware amount → smallest unit conversion

apps/storefront/
├── app/components/checkout/
│   ├── CheckoutPayment.tsx                 # Updated provider id references
│   ├── StripePayment/
│   │   ├── StripeElementsProvider.tsx       # Updated provider id in session lookup
│   │   ├── StripePaymentForm.tsx            # Updated provider id in filter + form
│   │   └── StripeExpressPaymentForm.tsx     # Updated provider id in availability check + session lookup
├── app/routes/
│   ├── api.checkout.complete.ts            # Updated provider id comparison
│   └── api.checkout.shipping-methods.ts    # Updated provider id in session init
├── libs/util/server/data/
│   └── cart.server.ts                      # Updated provider id in initiatePaymentSession
```

---

## New Files

### `apps/medusa/src/modules/stripe-connect/types.ts`

Defines three TypeScript interfaces:

- **`StripeConnectProviderOptions`** — The shape of options passed from `medusa-config.ts`. These come from environment variables. Every field except `apiKey` is optional with sensible defaults.
- **`StripeConnectConfig`** — Normalized internal config (all fields required, defaults applied in the constructor). This is what the service uses at runtime.
- **`StripeConnectPaymentData`** — Shape of the `data` object stored in Medusa's `PaymentSession` record. Contains the PaymentIntent id, client_secret (for frontend), status, amount, currency, and optionally the connected account and application fee amount.

### `apps/medusa/src/modules/stripe-connect/utils/get-smallest-unit.ts`

Converts a decimal amount (e.g. `29.99`) to Stripe's smallest currency unit (e.g. `2999` cents). Handles three categories:

| Category | Currencies | Multiplier |
|----------|-----------|------------|
| Zero-decimal | JPY, KRW, BIF, CLP, DJF, GNF, KMF, MGA, PYG, RWF, UGX, VND, VUV, XAF, XOF | ×1 (round) |
| Three-decimal | BHD, JOD, KWD, OMR, TND | ×1000 |
| Two-decimal (default) | USD, EUR, GBP, etc. | ×100 |

### `apps/medusa/src/modules/stripe-connect/service.ts`

The core payment provider. 773 lines. Extends `AbstractPaymentProvider<StripeConnectProviderOptions>` with `static identifier = 'stripe-connect'`.

**Constructor:**
1. Validates `apiKey` is present (throws `MedusaError` if not).
2. Validates `connectedAccountId` format (must start with `acct_`) when `useStripeConnect` is true.
3. Throws if `useStripeConnect` is true but no valid connected account id.
4. Normalizes all options into `this.config_` with defaults.
5. Instantiates the Stripe SDK client.
6. Logs the mode (Connect enabled vs standard).

**Implemented methods:**

| Method | Description |
|--------|-------------|
| `initiatePayment` | Creates a Stripe PaymentIntent. When Connect enabled: adds `on_behalf_of`, `transfer_data.destination`, and `application_fee_amount`. Stores `session_id` and `resource_id` in metadata for webhook correlation. |
| `authorizePayment` | Retrieves the PaymentIntent and maps its status. `succeeded` or `requires_capture` → `AUTHORIZED`. |
| `capturePayment` | Retrieves the PaymentIntent. If `requires_capture`, calls `stripe.paymentIntents.capture()`. If already `succeeded`, returns as-is. |
| `refundPayment` | Creates a Stripe Refund with `refund_application_fee` from config. Supports partial refunds via `amount`. |
| `cancelPayment` | Calls `stripe.paymentIntents.cancel()`. Handles `payment_intent_unexpected_state` gracefully (already finalized). |
| `deletePayment` | Retrieves and cancels the PaymentIntent if not already in a terminal state. Non-throwing (returns empty data on failure). |
| `retrievePayment` | Retrieves the PaymentIntent and returns id, status, amount, currency, and client_secret. |
| `getPaymentStatus` | Retrieves the PaymentIntent and maps its Stripe status to a `PaymentSessionStatus` enum value. |
| `updatePayment` | Updates the PaymentIntent amount and/or currency. When Connect enabled, recalculates `application_fee_amount`. |
| `getWebhookActionAndData` | Processes Stripe webhook events. Verifies signature (if `webhookSecret` configured). Maps events to Medusa payment actions. |

**Private helpers:**

| Method | Description |
|--------|-------------|
| `isConnectEnabled()` | Returns `true` when both `useStripeConnect` and `connectedAccountId` are set. |
| `calculateApplicationFee(amount)` | Computes the platform fee. Base: `amount × feePercent / 100`. When `passStripeFeeToChef` is true, grosses up by adding estimated Stripe processing fees. |
| `mapStripeStatus(status)` | Maps Stripe PaymentIntent status strings to Medusa `PaymentSessionStatus` enum values. |
| `getPaymentIntentId(data)` | Extracts the PaymentIntent id from the session data object. |

### `apps/medusa/src/modules/stripe-connect/index.ts`

Registers the provider with Medusa's payment module using `ModuleProvider(Modules.PAYMENT, { services: [StripeConnectProviderService] })`. This is what `medusa-config.ts` resolves when it uses `resolve: './src/modules/stripe-connect'`.

---

## Modified Files

### `apps/medusa/medusa-config.ts`

**Before:**
```typescript
{
  resolve: '@medusajs/medusa/payment',
  options: {
    providers: [{
      resolve: '@medusajs/medusa/payment-stripe',
      id: 'stripe',
      options: { apiKey: STRIPE_API_KEY },
    }],
  },
}
```

**After:**
```typescript
{
  resolve: '@medusajs/medusa/payment',
  options: {
    providers: [{
      resolve: './src/modules/stripe-connect',
      id: 'stripe-connect',
      options: {
        apiKey: STRIPE_API_KEY,
        useStripeConnect: USE_STRIPE_CONNECT,
        connectedAccountId: STRIPE_CONNECTED_ACCOUNT_ID || undefined,
        feePercent: PLATFORM_FEE_PERCENT,
        refundApplicationFee: REFUND_APPLICATION_FEE,
        webhookSecret: STRIPE_WEBHOOK_SECRET,
        passStripeFeeToChef: PASS_STRIPE_FEE_TO_CHEF,
        stripeFeePercent: STRIPE_FEE_PERCENT,
        stripeFeeFlatCents: STRIPE_FEE_FLAT_CENTS,
      },
    }],
  },
}
```

All new env vars are parsed at the top of the config file with proper type coercion (`parseInt`, `parseFloat`, `=== 'true'`).

### `apps/medusa/.env.template`

Added 9 new environment variables (see [Environment Variables](#environment-variables-detailed) section below).

### `apps/medusa/package.json`

Added `"stripe": "^17.0.0"` to dependencies. The old `@medusajs/medusa/payment-stripe` provider bundled its own Stripe SDK; our custom module needs it directly.

### `apps/medusa/src/scripts/seed.ts` and `seed-menus.ts`

Changed `payment_providers: ['pp_stripe_stripe']` → `payment_providers: ['pp_stripe-connect_stripe-connect']` in region creation.

### Storefront files (7 files)

All occurrences of the string `pp_stripe_stripe` were replaced with `pp_stripe-connect_stripe-connect`. This affects:

| File | What changed |
|------|-------------|
| `StripeElementsProvider.tsx` | Session lookup: `s.provider_id === 'pp_stripe-connect_stripe-connect'` |
| `StripePaymentForm.tsx` | Payment method filter + `providerId` prop on `CompleteCheckoutForm` |
| `StripeExpressPaymentForm.tsx` | Provider availability check + pending session lookup |
| `CheckoutPayment.tsx` | `hasStripePaymentProvider` check + payment option id |
| `cart.server.ts` | `provider_id` in `initiatePaymentSession` call |
| `api.checkout.shipping-methods.ts` | `provider_id` in payment session init |
| `api.checkout.complete.ts` | `providerId` comparison for Stripe-specific completion flow |

---

## Environment Variables (Detailed)

All env vars are set in `apps/medusa/.env` and read in `apps/medusa/medusa-config.ts`.

### Required (both modes)

| Variable | Type | Description |
|----------|------|-------------|
| `STRIPE_API_KEY` | string | Your Stripe **secret** key (`sk_test_...` or `sk_live_...`). This is the platform account's key. The provider will throw on startup if this is missing. |

### Stripe Connect toggle

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `USE_STRIPE_CONNECT` | boolean string | `false` | Set to `true` to enable Connect mode (destination charges + application fee). When `false` or unset, the provider behaves as standard Stripe with no Connect features. Useful for local development without a connected account. |

### Required when `USE_STRIPE_CONNECT=true`

| Variable | Type | Description |
|----------|------|-------------|
| `STRIPE_CONNECTED_ACCOUNT_ID` | string | The Stripe connected account id (e.g. `acct_1ABC123`). Must start with `acct_`. This is the vendor/chef account that receives the remainder of each payment after the platform fee is deducted. The provider validates the format on startup and throws if invalid or missing when Connect is enabled. |

### Optional (Connect mode)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `PLATFORM_FEE_PERCENT` | integer | `5` | The percentage of each transaction the platform keeps as an application fee. For a $100 payment with 5%, the platform keeps $5 and transfers $95 to the connected account. Parsed as `parseInt(..., 10)`. |
| `REFUND_APPLICATION_FEE` | boolean string | `false` | When `true`, Stripe refunds include `refund_application_fee: true`, meaning the platform's application fee is also refunded to the customer. When `false` (default), the platform keeps its fee even on refunds. |
| `STRIPE_WEBHOOK_SECRET` | string | _(empty)_ | The webhook signing secret from Stripe Dashboard (e.g. `whsec_...`). Used to verify webhook event signatures via `stripe.webhooks.constructEvent()`. If not set, webhook signature verification is skipped. Recommended for production. |
| `PASS_STRIPE_FEE_TO_CHEF` | boolean string | `false` | When `true`, the application fee is "grossed up" to account for Stripe's processing fee, so the platform nets its full `PLATFORM_FEE_PERCENT` after Stripe takes its cut. The connected account effectively absorbs the Stripe processing fee. |
| `STRIPE_FEE_PERCENT` | float | `2.9` | Stripe's processing fee percentage, used for gross-up calculation when `PASS_STRIPE_FEE_TO_CHEF=true`. Adjust if your Stripe rate differs. |
| `STRIPE_FEE_FLAT_CENTS` | integer | `30` | Stripe's flat per-transaction fee in cents, used for gross-up calculation. Adjust if your Stripe rate differs. |

### Storefront (separate `.env`)

These are **not** new to this branch but are required for checkout to work:

| Variable | File | Description |
|----------|------|-------------|
| `STRIPE_PUBLIC_KEY` | `apps/storefront/.env` | Your Stripe **publishable** key (`pk_test_...` or `pk_live_...`). Used by `@stripe/stripe-js` (`loadStripe()`) on the frontend. Must be a modern-format key (prefixed `pk_test_` or `pk_live_`). |

---

## Provider ID Change

Medusa computes the provider id as `pp_{module-id}_{provider-id}`.

| | Module resolve | `id` in config | Effective provider id |
|-|---------------|----------------|----------------------|
| **Before** | `@medusajs/medusa/payment-stripe` | `stripe` | `pp_stripe_stripe` |
| **After** | `./src/modules/stripe-connect` | `stripe-connect` | `pp_stripe-connect_stripe-connect` |

Every reference to `pp_stripe_stripe` in the storefront and seed scripts was updated to `pp_stripe-connect_stripe-connect`.

**Important:** If you have existing regions in the database that were created with the old provider id, you will need to update them via the Medusa Admin (Settings → Regions → Payment Providers) or a one-time migration to add `pp_stripe-connect_stripe-connect`. The seed scripts are already updated for new environments.

---

## How the Module Works

### Registration flow

1. `medusa-config.ts` registers the payment module with `resolve: './src/modules/stripe-connect'` and `id: 'stripe-connect'`.
2. Medusa resolves `./src/modules/stripe-connect/index.ts`, which exports `ModuleProvider(Modules.PAYMENT, { services: [StripeConnectProviderService] })`.
3. Medusa instantiates `StripeConnectProviderService`, passing the `options` from config and injecting `{ logger }` from the container.
4. The constructor validates options, normalizes config, and creates the Stripe SDK client.
5. The provider is now available as `pp_stripe-connect_stripe-connect`.

### Request flow

1. **Storefront** calls Medusa's store API to initiate a payment session with `provider_id: 'pp_stripe-connect_stripe-connect'`.
2. Medusa's payment module routes the call to `StripeConnectProviderService.initiatePayment()`.
3. The service creates a Stripe PaymentIntent (with or without Connect params depending on `USE_STRIPE_CONNECT`).
4. The `client_secret` is stored in the payment session's `data` and returned to the storefront.
5. The storefront uses `client_secret` with `@stripe/react-stripe-js` Elements to render the payment form.
6. After the customer confirms payment, the storefront calls Medusa to complete checkout.
7. Medusa calls `authorizePayment()` to verify the PaymentIntent status.
8. On success, a `Payment` record is created and linked to the order.

---

## Payment Flows

### Standard mode (`USE_STRIPE_CONNECT=false`)

```
Customer → Storefront → Medusa → Stripe API
                                    ↓
                              PaymentIntent (standard)
                              - amount: total
                              - currency: usd
                              - automatic_payment_methods: true
                                    ↓
                              Payment goes to platform account
```

### Connect mode (`USE_STRIPE_CONNECT=true`)

```
Customer → Storefront → Medusa → Stripe API
                                    ↓
                              PaymentIntent (destination charge)
                              - amount: total
                              - currency: usd
                              - application_fee_amount: 5% of total
                              - transfer_data.destination: acct_xxx
                              - on_behalf_of: acct_xxx
                              - automatic_payment_methods: true
                                    ↓
                              Platform keeps application fee
                              Connected account receives remainder
```

### Refund flow

```
Admin → Medusa → Stripe API
                    ↓
              Refund
              - payment_intent: pi_xxx
              - refund_application_fee: false (default)
              - amount: (optional, for partial refunds)
                    ↓
              Customer refunded; platform keeps fee (default)
```

---

## Fee Calculation

The `calculateApplicationFee(amountInSmallestUnit)` method computes the application fee:

### Base fee (default)
```
baseFee = round(amount × feePercent / 100)
```

Example: $100 payment (10000 cents), 5% fee → `round(10000 × 5 / 100)` = **500 cents ($5.00)**

### With Stripe fee pass-through (`PASS_STRIPE_FEE_TO_CHEF=true`)
```
estimatedStripeFee = round(amount × stripeFeePercent / 100) + stripeFeeFlatCents
applicationFee = baseFee + estimatedStripeFee
```

Example: $100 payment, 5% platform fee, 2.9% + $0.30 Stripe fee:
- baseFee = 500
- estimatedStripeFee = round(10000 × 2.9 / 100) + 30 = 290 + 30 = 320
- applicationFee = 500 + 320 = **820 cents ($8.20)**

In this scenario the connected account receives $91.80, Stripe takes ~$3.20, and the platform nets ~$5.00.

---

## Webhook Handling

The `getWebhookActionAndData` method handles four Stripe event types:

| Stripe Event | Medusa Action | Description |
|-------------|--------------|-------------|
| `payment_intent.succeeded` | `captured` | Payment completed successfully. Uses `resource_id` or `session_id` from PI metadata for session correlation. |
| `payment_intent.amount_capturable_updated` | `authorized` | Payment authorized (manual capture mode). |
| `payment_intent.payment_failed` | `failed` | Payment failed. |
| `charge.refunded` | `not_supported` | Logged but not acted on (Medusa handles refunds via the refund flow). |
| All other events | `not_supported` | Logged at debug level, no action. |

**Signature verification:** If `STRIPE_WEBHOOK_SECRET` is set, the method calls `stripe.webhooks.constructEvent()` with the raw body and `stripe-signature` header. On verification failure, it returns `action: 'failed'`.

**Session correlation:** PaymentIntent metadata stores `resource_id` (Medusa's payment session id) and `session_id` during `initiatePayment`. The webhook handler reads these back to correlate events with Medusa sessions.

---

## Currency Handling

The `getSmallestUnit(amount, currencyCode)` utility handles Stripe's currency-specific smallest units:

- **Zero-decimal currencies** (JPY, KRW, etc.): The decimal amount IS the smallest unit. `500` JPY → `500`.
- **Two-decimal currencies** (USD, EUR, GBP, etc.): Multiply by 100. `29.99` USD → `2999`.
- **Three-decimal currencies** (BHD, KWD, etc.): Multiply by 1000. `29.999` BHD → `29999`.

This utility is used in `initiatePayment`, `updatePayment`, and `refundPayment` to ensure amounts are correctly converted before being sent to the Stripe API.

---

## Setup Checklist

### Local development (standard Stripe, no Connect)

1. Set `STRIPE_API_KEY` in `apps/medusa/.env` to your Stripe secret key (`sk_test_...`).
2. Set `STRIPE_PUBLIC_KEY` in `apps/storefront/.env` to your Stripe publishable key (`pk_test_...`).
3. Leave `USE_STRIPE_CONNECT=false` (or unset).
4. Run seeds or update existing regions in Admin to include `pp_stripe-connect_stripe-connect` as a payment provider.
5. Restart Medusa. Checkout will work as standard Stripe.

### Production / Connect mode

1. **Stripe Dashboard:** Enable Connect on your platform account. Create a connected account (or have one already). Note the `acct_xxx` id.
2. **Stripe Dashboard:** Create a webhook endpoint pointing to your Medusa backend's webhook URL. Enable events: `payment_intent.succeeded`, `payment_intent.amount_capturable_updated`, `payment_intent.payment_failed`, `charge.refunded`. Copy the webhook signing secret.
3. Set in `apps/medusa/.env`:
   ```
   STRIPE_API_KEY=sk_live_...       (or sk_test_... for test mode)
   USE_STRIPE_CONNECT=true
   STRIPE_CONNECTED_ACCOUNT_ID=acct_xxx
   PLATFORM_FEE_PERCENT=5           (or your desired percentage)
   REFUND_APPLICATION_FEE=false     (true if you want to refund platform fee on refunds)
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```
4. Set in `apps/storefront/.env`:
   ```
   STRIPE_PUBLIC_KEY=pk_live_...    (or pk_test_... for test mode)
   ```
5. Update existing regions in Medusa Admin to include `pp_stripe-connect_stripe-connect` as a payment provider (or run seeds for a fresh database).
6. Restart Medusa and the storefront.
7. Test with Stripe test cards (e.g. `4242 4242 4242 4242`). Verify in Stripe Dashboard that PaymentIntents include `application_fee_amount` and `transfer_data`.
