# Digital Event Ticket System: Complete Technical Reference

> **Purpose**: This document provides a detailed technical breakdown of how the SDOA project handles digital event tickets — from initial chef event request through acceptance, product creation, cart handling, checkout, and order completion. It is intended as a reference for sibling projects that need to replicate this behavior.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Phase 1: Chef Event Request (Customer Submission)](#2-phase-1-chef-event-request)
3. [Phase 2: Chef Event Acceptance & Product Creation](#3-phase-2-chef-event-acceptance--product-creation)
4. [Phase 3: Digital Infrastructure Setup](#4-phase-3-digital-infrastructure-setup)
5. [Phase 4: Storefront Product Detection](#5-phase-4-storefront-product-detection)
6. [Phase 5: Add to Cart](#6-phase-5-add-to-cart)
7. [Phase 6: Cart Shipping Resolution (Why No Error)](#7-phase-6-cart-shipping-resolution)
8. [Phase 7: Checkout Flow for Digital Products](#8-phase-7-checkout-flow-for-digital-products)
9. [Phase 8: Order Completion & Success Page](#9-phase-8-order-completion--success-page)
10. [Seed Script Setup (Bootstrap Reference)](#10-seed-script-setup)
11. [Key Files Reference](#11-key-files-reference)
12. [Replication Checklist for Sibling Projects](#12-replication-checklist)

---

## 1. Architecture Overview

The system uses a multi-layered approach to handle digital event tickets:

```
Customer Request → Chef Event (pending) → Admin Accepts → Product Created → Customer Purchases Ticket → Checkout (no shipping) → Order Complete
```

### Core Medusa Entities Involved

| Entity | Role |
|--------|------|
| **ChefEvent** (custom module) | Stores event request data (date, time, party size, type, contact info) |
| **Product** (Medusa core) | The purchasable ticket product created upon acceptance |
| **Shipping Profile** | "Digital Products" profile with `type: 'digital'` |
| **Shipping Option** | "Digital Delivery" with `amount: 0` and `code: 'digital'` |
| **Sales Channel** | "Digital Sales Channel" for digital product visibility |
| **Stock Location** | "Digital Location" for virtual inventory tracking |
| **Inventory Item** | Created with `requires_shipping: false` |
| **Product-ChefEvent Link** | Links the created product back to the chef event |

### How the System Knows a Product is Digital

There is **no `is_digital` flag or `product_type` field** on the product itself. Instead, the system uses a **multi-signal approach**:

1. **Backend**: Products are assigned to the "Digital Products" shipping profile (`type: 'digital'`).
2. **Backend**: Inventory items are created with `requires_shipping: false`.
3. **Storefront**: Products are identified as events via **SKU prefix** `EVENT-`.
4. **Storefront**: Carts are identified as digital-only when the **only available shipping option** is "Digital Delivery" (free, name contains "digital").

---

## 2. Phase 1: Chef Event Request

### Customer Submission

**API Route**: `POST /store/chef-events`
**File**: `apps/medusa/src/api/store/chef-events/route.ts`

A customer submits an event request with:

```typescript
{
  requestedDate: string       // e.g. "2026-04-15"
  requestedTime: string       // e.g. "18:00" (HH:mm format)
  partySize: number           // 1-200
  eventType: 'plated_dinner' | 'buffet_style' | 'pickup'
  locationType: 'customer_location' | 'chef_location'
  locationAddress: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  notes?: string
  experience_type_id?: string  // links to experience type for pricing
  templateProductId?: string   // optional template product
  selected_products?: Array<{ product_id: string; quantity: number }>  // for pickup events
}
```

### Validation

The route uses Zod for validation with conditional rules:
- **Pickup events**: require `selected_products` (at least one product)
- **Non-pickup events**: require `locationAddress` (min 3 characters)

### Pricing Calculation

Pricing is determined in this order:
1. If `experience_type_id` is provided, fetch the experience type's `price_per_unit` (stored in cents, converted to dollars)
2. Fallback to hardcoded pricing: `plated_dinner: $149.99`, `buffet_style: $99.99`
3. Pickup events: `$0` (payment happens via product page later)

Total price = `pricePerPerson × partySize`

### Workflow Execution

**Workflow**: `createChefEventWorkflow`
**File**: `apps/medusa/src/workflows/create-chef-event.ts`

Steps:
1. **createChefEventStep**: Creates a chef event record in the `chef_event` table with `status: 'pending'`
2. **emitEventStep**: Emits `chef-event.requested` event

### Event Subscriber

**File**: `apps/medusa/src/subscribers/chef-event-requested.ts`

Listens for `chef-event.requested` and:
1. Sends confirmation email to the customer (template: `chef-event-requested`)
2. Sends notification emails to all chefs in `CHEF_NOTIFICATIONS_LIST` env var

### Chef Event Model

**File**: `apps/medusa/src/modules/chef-event/models/chef-event.ts`

Key fields for the acceptance flow:
- `status`: `'pending' | 'confirmed' | 'cancelled' | 'completed'`
- `productId`: nullable text — populated when the event is accepted and a product is created
- `acceptedAt`: nullable datetime
- `acceptedBy`: nullable text
- `sendAcceptanceEmail`: boolean (default `true`)

---

## 3. Phase 2: Chef Event Acceptance & Product Creation

### Admin Triggers Acceptance

**API Route**: `POST /admin/chef-events/[id]/accept`
**File**: `apps/medusa/src/api/admin/chef-events/[id]/accept/route.ts`

The admin sends:
```typescript
{
  chefNotes?: string
  acceptedBy?: string
  sendAcceptanceEmail?: boolean  // default: true
}
```

### Accept Workflow

**Workflow**: `acceptChefEventWorkflow`
**File**: `apps/medusa/src/workflows/accept-chef-event.ts`

This is the **critical workflow** that creates the digital product. It runs these steps in sequence:

#### Step 1: Update Chef Event Status

```typescript
// acceptChefEventStep
await chefEventModuleService.updateChefEvents({
  id: input.chefEventId,
  status: 'confirmed',
  acceptedAt: new Date(),
  acceptedBy: input.acceptedBy || 'chef',
  chefNotes: input.chefNotes,
  sendAcceptanceEmail: input.sendAcceptanceEmail ?? true,
});
```

#### Step 2: Ensure Digital Shipping Profile

```typescript
// ensureDigitalShippingProfileStep
// Checks for existing "Digital Products" profile
// Creates one if missing: { name: 'Digital Products', type: 'digital' }
```

#### Step 3: Ensure Digital Shipping Option

```typescript
// ensureDigitalShippingOptionStep
// Checks for existing "Digital Delivery" option
// Creates one if missing:
{
  name: 'Digital Delivery',
  price_type: 'flat',
  provider_id: 'manual_manual',
  shipping_profile_id: digitalShippingProfile.id,
  type: { label: 'Digital', description: 'Instant delivery', code: 'digital' },
  prices: [
    { currency_code: 'usd', amount: 0 },
    { currency_code: 'cad', amount: 0 },
    // + region-specific $0 prices
  ],
  rules: [
    { attribute: 'enabled_in_store', value: 'true', operator: 'eq' },
    { attribute: 'is_return', value: 'false', operator: 'eq' },
  ],
}
```

#### Step 4: Ensure Digital Sales Channel

```typescript
// ensureDigitalSalesChannelStep
// Creates "Digital Sales Channel" if it doesn't exist
```

#### Step 5: Ensure Default Sales Channel

```typescript
// ensureDefaultSalesChannelStep
// Creates "Default Sales Channel" if it doesn't exist
```

#### Step 6: Ensure Digital Location

```typescript
// ensureDigitalLocationStep
// Creates "Digital Location" stock location if it doesn't exist
// Address: { city: 'Digital', country_code: 'US', address_1: 'Digital Product Location' }
```

#### Step 7: Link Stock Locations to Sales Channels

```typescript
// linkStockLocationsToSalesChannelsStep
// Links "Digital Location" to both "Default Sales Channel" and "Digital Sales Channel"
```

#### Step 8: Create Event Product (THE KEY STEP)

```typescript
// createEventProductStep
// Creates a Medusa product using createProductsWorkflow:
{
  title: `${eventTypeLabel} - ${firstName} ${lastName} - ${date}`,
  handle: `event-${type}-${name}-${date}`,
  status: 'published',
  shipping_profile_id: digitalShippingProfile.id,  // ← DIGITAL PROFILE
  sales_channels: [
    { id: digitalSalesChannel.id },
    { id: defaultSalesChannel.id },
  ],
  options: [{ title: 'Ticket Type', values: ['Event Ticket'] }],
  variants: [{
    title: 'Event Ticket',
    sku: `EVENT-${chefEventId}-${date}-${eventType}`,  // ← EVENT- PREFIX
    manage_inventory: true,
    options: { 'Ticket Type': 'Event Ticket' },
    prices: [{ amount: pricePerPerson, currency_code: 'usd' }],
  }],
}
```

**Then creates inventory**:
```typescript
// For each variant:
const inventoryItem = await inventoryModuleService.createInventoryItems({
  sku: variant.sku,
  requires_shipping: false,  // ← CRITICAL: marks as non-shippable
  description: `Digital ticket for ${variant.title}`,
  title: variant.title,
  weight: 0, length: 0, height: 0, width: 0,
});

// Assign to Digital Location with party size as stock
await inventoryModuleService.createInventoryLevels({
  inventory_item_id: inventoryItem.id,
  location_id: digitalLocation.id,
  stocked_quantity: chefEvent.partySize,  // ← STOCK = PARTY SIZE
  reserved_quantity: 0,
});
```

#### Step 9: Link Chef Event to Product

```typescript
// linkChefEventToProductStep
await chefEventModuleService.updateChefEvents({
  id: chefEvent.id,
  productId: product.id,  // ← STORES PRODUCT REFERENCE
});
```

#### Step 10: Emit Acceptance Event (if email enabled)

```typescript
emitEventStep({
  eventName: 'chef-event.accepted',
  data: { chefEventId, productId },
});
```

### Acceptance Email Subscriber

**File**: `apps/medusa/src/subscribers/chef-event-accepted.ts`

Sends acceptance email to customer with:
- Event details (date, time, type, location)
- Purchase link: `${STOREFRONT_URL}/products/${product.handle}`
- Pricing: per person and total
- Deposit requirements (4 tickets min for parties > 4, full amount for ≤ 4)
- 72-hour deposit deadline

### Product-ChefEvent Link

**File**: `apps/medusa/src/links/product-chefEvent.ts`

```typescript
defineLink(
  ProductModule.linkable.product,
  ChefEventModule.linkable.chefEvent,
)
```

This creates a database-level link between the Medusa product and the chef event entity.

---

## 4. Phase 3: Digital Infrastructure Setup

### Pricing Per Event Type

| Event Type | Price Per Person |
|------------|-----------------|
| `plated_dinner` | $149.99 |
| `buffet_style` | $99.99 |
| `pickup` | $0 (paid via product page) |

### Shipping Profile Hierarchy

```
Shipping Profiles
├── Default (type: 'default')      → Physical products (bento boxes)
└── Digital Products (type: 'digital') → Event tickets, chef experiences
```

### Shipping Options

| Name | Profile | Amount | Code | Provider |
|------|---------|--------|------|----------|
| Standard Shipping | Default | $5 | standard | manual_manual |
| Express Shipping | Default | $10 | express | manual_manual |
| Digital Delivery | Digital Products | $0 | digital | manual_manual |

### How Medusa Resolves Shipping Options for a Cart

When `sdk.store.fulfillment.listCartOptions({ cart_id })` is called:

1. Medusa inspects all line items in the cart
2. For each item, it looks up the product's `shipping_profile_id`
3. It returns only shipping options that match the profiles of items in the cart

**Key insight**: If a cart contains ONLY products with the "Digital Products" shipping profile, the only shipping option returned will be "Digital Delivery" ($0). This is the mechanism that prevents shipping errors — Medusa's own fulfillment module handles the filtering.

---

## 5. Phase 4: Storefront Product Detection

### SKU-Based Event Detection

**File**: `apps/storefront/libs/util/products.ts`

```typescript
// Detect event products by SKU prefix
export const isEventProduct = (product: StoreProduct): boolean => {
  return product.variants?.some(variant => 
    variant.sku?.startsWith('EVENT-')
  ) ?? false;
}

// Parse event info from SKU: EVENT-{eventId}-{date}-{type}
export const parseEventSku = (sku: string) => {
  const parts = sku.split('-');
  return { eventId: parts[1], date: parts[2], type: parts.slice(3).join('-') };
}

// Get the event variant
export const getEventVariant = (product: StoreProduct) => {
  return product.variants?.find(variant => variant.sku?.startsWith('EVENT-'));
}
```

### Product Detail Page Routing

**File**: `apps/storefront/app/routes/products.$productHandle.tsx`

```typescript
export default function ProductDetailRoute() {
  const { product, chefEvent, menu } = useLoaderData();

  if (isEventProduct(product)) {
    return <EventProductDetails product={product} chefEvent={chefEvent} menu={menu} />;
  }

  return <ProductTemplate product={product} />;
}
```

The loader fetches additional data for event products:

```typescript
if (isEventProduct(product)) {
  [chefEvent, menu] = await Promise.all([
    fetchChefEventForProduct(product),   // GET /store/chef-events/{eventId}
    fetchMenuForProduct(product),
  ]);
}
```

### Chef Event Data Fetching

**File**: `apps/storefront/libs/util/server/data/event-products.server.ts`

Extracts the event ID from the SKU and fetches the chef event via the store API:

```typescript
export const fetchChefEventForProduct = async (product) => {
  const eventVariant = product.variants?.find(v => v.sku?.startsWith('EVENT-'));
  const eventInfo = parseEventSku(eventVariant.sku);
  // Fetches GET /store/chef-events/{eventInfo.eventId}
};
```

---

## 6. Phase 5: Add to Cart

### Event Product Details Component

**File**: `apps/storefront/app/components/product/EventProductDetails.tsx`

The event product page shows:
- Event date, time, type
- Price per person
- Available tickets (from `inventory_quantity`)
- Quantity selector (max = inventory quantity)
- "Purchase Tickets" button

The add-to-cart form posts to the same endpoint as regular products:

```typescript
<addToCartFetcher.Form
  method="post"
  action="/api/cart/line-items/create"
>
  <input type="hidden" name="productId" value={product.id} />
  {Object.entries(eventVariantOptions).map(([optionId, value]) => (
    <input key={optionId} type="hidden" name={`options.${optionId}`} value={value} />
  ))}
  <QuantitySelector variant={eventVariant} customInventoryQuantity={inventoryQuantity} />
  <SubmitButton>Purchase Tickets</SubmitButton>
</addToCartFetcher.Form>
```

### Cart Line Item Creation

**File**: `apps/storefront/app/routes/api.cart.line-items.create.ts`

The creation flow is identical for digital and physical products:
1. Read `productId`, `quantity`, `options.*` from form data
2. Find matching variant via `getVariantBySelectedOptions`
3. Call `addToCart(request, { variantId, quantity })`

**There is no special handling for digital products at this stage**. The product is simply added to the cart like any other product.

---

## 7. Phase 6: Cart Shipping Resolution (Why No Error)

This is the **critical section** that explains why digital products don't cause shipping errors.

### The Mechanism: Shipping Profile Filtering

When a product is added to a cart, Medusa's fulfillment module uses the product's `shipping_profile_id` to determine which shipping options are available. Here's the chain:

1. **Event product created** with `shipping_profile_id: digitalShippingProfile.id`
2. **Cart contains only event products** → all items have the "Digital Products" profile
3. **`listCartOptions` called** → Medusa returns only shipping options matching the "Digital Products" profile
4. **Only "Digital Delivery" ($0) is returned** → no physical shipping options available
5. **Checkout auto-selects** the single shipping option

### Storefront Digital Detection

**File**: `apps/storefront/libs/util/cart/cart-helpers.ts`

```typescript
export function isDigitalOnlyCart(
  cart: StoreCart | null, 
  shippingOptions: StoreCartShippingOption[]
): boolean {
  if (!cart || !cart.items?.length) return false;
  
  if (shippingOptions.length === 1) {
    const option = shippingOptions[0];
    return option.amount === 0 && option.name.toLowerCase().includes('digital');
  }
  
  return false;
}
```

**Detection logic**: A cart is digital-only when:
- The cart has items
- There is exactly **one** shipping option
- That option has `amount === 0`
- Its name contains `"digital"` (case-insensitive)

### Why Mixed Carts Work

If a cart contains both digital (event tickets) and physical (bento boxes) products:
- Products have different shipping profiles ("Digital Products" and "Default")
- Medusa returns shipping options for BOTH profiles
- Multiple shipping options appear (Standard, Express, Digital Delivery)
- `isDigitalOnlyCart` returns `false` (more than one option)
- The checkout shows the full shipping form

### Auto-Selection of Shipping Method

**File**: `apps/storefront/app/routes/checkout._index.tsx`

```typescript
const ensureSelectedCartShippingMethod = async (request, cart) => {
  if (cart.shipping_methods?.[0]) return; // Already selected

  const shippingOptions = await fetchShippingOptions(cart.id);
  
  if (shippingOptions.length === 1) {
    // Auto-select the single option (digital carts)
    await setShippingMethod(request, { 
      cartId: cart.id, 
      shippingOptionId: shippingOptions[0].id 
    });
    return;
  }

  // Multiple options: select cheapest
  const cheapest = findCheapestShippingOption(shippingOptions);
  if (cheapest) {
    await setShippingMethod(request, { 
      cartId: cart.id, 
      shippingOptionId: cheapest.id 
    });
  }
};
```

---

## 8. Phase 7: Checkout Flow for Digital Products

### Checkout Provider

**File**: `apps/storefront/app/providers/checkout-provider.tsx`

The checkout provider computes `isDigitalOnly` and uses it to determine step completion:

```typescript
export const useNextStep = (state) => {
  const isDigitalOnly = isDigitalOnlyCart(cart, shippingOptions);
  const accountDetailsComplete = checkAccountDetailsComplete(cart, isDigitalOnly);
  // For digital: only email needed → skip to payment faster
};
```

### Step Completion Logic

**File**: `apps/storefront/libs/util/checkout/checkStepComplete.ts`

```typescript
export const checkAccountDetailsComplete = (cart, isDigitalOnly = false) => {
  if (isDigitalOnly) {
    return !!cart.email;  // Only email required for digital
  }
  return !!cart.shipping_address?.address_1;  // Full address for physical
};
```

### Checkout Flow Component

**File**: `apps/storefront/app/components/checkout/CheckoutFlow.tsx`

```typescript
export const CheckoutFlow = () => {
  const isDigitalOnly = isDigitalOnlyCart(cart, shippingOptions);

  return (
    <>
      <StripeExpressCheckout cart={cart} />
      <CheckoutAccountDetails isDigitalOnly={isDigitalOnly} />
      
      {/* Delivery method HIDDEN for digital products */}
      {!isDigitalOnly && (
        <>
          <hr />
          <CheckoutDeliveryMethod />
        </>
      )}
      
      <CheckoutPayment isDigitalOnly={isDigitalOnly} />
    </>
  );
};
```

### Account Details (Digital vs Physical)

**File**: `apps/storefront/app/components/checkout/CheckoutAccountDetails.tsx`

| Feature | Physical Products | Digital Products |
|---------|-------------------|-----------------|
| Section title | "Account details" | "Billing details" |
| Email field | Required | Required |
| Shipping address | Required (Stripe Address Element) | **Not shown** |
| Description text | "Select your shipping address" | "Enter your email address" |

### Account Details API

**File**: `apps/storefront/app/routes/api.checkout.account-details.ts`

```typescript
export const accountDetailsSchema = z.object({
  cartId: z.string(),
  email: z.string().email(),
  shippingAddress: z.object({...}).optional(),  // ← Optional for digital
});

// In the action:
const updateData: any = { email: data.email };

if (data.shippingAddress) {
  // Only add addresses for physical products
  updateData.shipping_address = formattedShippingAddress;
  updateData.billing_address = formattedShippingAddress;
}
```

### Order Summary Totals

**File**: `apps/storefront/app/components/checkout/CheckoutOrderSummary/CheckoutOrderSummaryTotals.tsx`

```typescript
// Digital carts: no shipping lines, total = cart.total directly
const total = isDigitalOnly
  ? cartTotal
  : hasShippingMethod
    ? cartTotal
    : cartTotal + estimatedShipping;

// Render shipping lines only for physical products
{!isDigitalOnly && hasShippingMethod && (
  <TotalsItem label="Shipping" amount={shippingAmount} />
)}
{!isDigitalOnly && !hasShippingMethod && (
  <TotalsItem label="Estimated Shipping" amount={estimatedShipping} />
)}
```

### Complete Checkout

**File**: `apps/storefront/app/routes/api.checkout.complete.ts`

The complete checkout action handles both digital and physical orders identically:
1. Validate billing address
2. Update cart with billing address
3. Ensure payment session
4. Place order via `placeOrder()`
5. Clear cart cookie
6. Redirect to success page

No special digital handling is needed at this stage because the shipping method was already set to "Digital Delivery" ($0) during the checkout loader.

---

## 9. Phase 8: Order Completion & Success Page

**File**: `apps/storefront/app/routes/checkout.success.tsx`

The success page detects digital orders:

```typescript
const isDigitalOnly = (order.shipping_total || 0) === 0 && 
  shippingMethods?.every(sm => sm.name === 'Digital Delivery');
```

| Feature | Physical Orders | Digital Orders |
|---------|----------------|----------------|
| Heading | "Payment successful" | "Tickets confirmed!" |
| Subheading | "Thanks for ordering" | "You're all set!" |
| Description | Processing message | Confirmation email message |
| Quantity label | "Qty 2" | "2 Tickets" |
| Shipping line | Shown | **Hidden** |
| Shipping address | Shown | **Hidden** |
| Shipping method | Shown | **Hidden** |

---

## 10. Seed Script Setup

### Main Seed Script

**File**: `apps/medusa/src/scripts/seed.ts`

The main seed creates all infrastructure needed for digital products:

#### 1. Shipping Profiles

```typescript
const { result: shippingProfileResult } = await createShippingProfilesWorkflow(container).run({
  input: {
    data: [
      { name: 'Default', type: 'default' },
      { name: 'Digital Products', type: 'digital' },
    ],
  },
});
const shippingProfile = shippingProfileResult[0];          // Physical
const digitalShippingProfile = shippingProfileResult[1];   // Digital
```

#### 2. Fulfillment Set & Service Zones

```typescript
const northAmericanFulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
  name: 'North American delivery',
  type: 'shipping',
  service_zones: [
    { name: 'United States', geo_zones: [{ country_code: 'us', type: 'country' }] },
    { name: 'Canada', geo_zones: [{ country_code: 'ca', type: 'country' }] },
  ],
});
```

#### 3. Stock Location Linked to Fulfillment Provider

```typescript
// Link stock location to manual fulfillment provider
await remoteLink.create([{
  [Modules.STOCK_LOCATION]: { stock_location_id: americanStockLocation.id },
  [Modules.FULFILLMENT]: { fulfillment_provider_id: 'manual_manual' },
}]);

// Link stock location to fulfillment set
await remoteLink.create({
  [Modules.STOCK_LOCATION]: { stock_location_id: americanStockLocation.id },
  [Modules.FULFILLMENT]: { fulfillment_set_id: northAmericanFulfillmentSet.id },
});
```

#### 4. Three Shipping Options

```typescript
// Standard Shipping ($5, Default profile)
// Express Shipping ($10, Default profile)
// Digital Delivery ($0, Digital Products profile)
```

Each shipping option includes:
- Prices for `usd`, `cad`, and region-specific prices
- Rules: `enabled_in_store: true`, `is_return: false`
- Linked to the first service zone of the fulfillment set

#### 5. Products with Correct Profiles

```typescript
// Bento products → Default shipping profile
seedBentoProducts({
  shipping_profile_id: shippingProfile.id,  // Default
});

// Sushi experience products → Digital shipping profile
seedSushiMenuProducts({
  shipping_profile_id: digitalShippingProfile.id,  // Digital Products
});
```

#### 6. Product-Menu Links

```typescript
// Link each sushi menu experience product to its menu entity
await remoteLink.create([{
  [Modules.PRODUCT]: { product_id: product.id },
  menuModule: { menu_id: menu.id },
}]);
```

### Standalone Digital Shipping Script

**File**: `apps/medusa/src/scripts/create-digital-shipping.ts`

Idempotent script that creates just the digital shipping infrastructure when the fulfillment set already exists:
1. Creates "Digital Products" profile if missing
2. Creates "Digital Delivery" option if missing
3. Uses the first fulfillment set's first service zone

### Sushi Menu Products Seed

**File**: `apps/medusa/src/scripts/seed/sushi-menus.ts`

Creates four sushi experience products. Note these are **template/catalog products** (not event-specific tickets). Their SKUs use patterns like `TRADITIONAL_OMAKASE_EXPERIENCE-EXPERIENCE` — they do NOT have the `EVENT-` prefix.

The `EVENT-` prefixed products are only created dynamically when a chef event is accepted.

---

## 11. Key Files Reference

### Backend (Medusa)

| File | Purpose |
|------|---------|
| `src/modules/chef-event/models/chef-event.ts` | ChefEvent data model |
| `src/modules/chef-event/service.ts` | ChefEvent CRUD service |
| `src/modules/chef-event/index.ts` | Module registration |
| `src/workflows/create-chef-event.ts` | Creates chef event (pending) |
| `src/workflows/accept-chef-event.ts` | **Core**: Accepts event, creates digital product |
| `src/workflows/reject-chef-event.ts` | Rejects event |
| `src/api/store/chef-events/route.ts` | Store API: customer creates event request |
| `src/api/store/chef-events/[id]/route.ts` | Store API: customer retrieves confirmed event |
| `src/api/admin/chef-events/[id]/accept/route.ts` | Admin API: accept event |
| `src/links/product-chefEvent.ts` | Product ↔ ChefEvent link |
| `src/subscribers/chef-event-requested.ts` | Sends request confirmation emails |
| `src/subscribers/chef-event-accepted.ts` | Sends acceptance email with purchase link |
| `src/scripts/seed.ts` | Main seed (shipping profiles, options, products) |
| `src/scripts/create-digital-shipping.ts` | Standalone digital shipping setup |

### Storefront

| File | Purpose |
|------|---------|
| `libs/util/products.ts` | `isEventProduct()`, `parseEventSku()`, `getEventVariant()` |
| `libs/util/cart/cart-helpers.ts` | `isDigitalOnlyCart()`, `requiresShippingAddress()` |
| `libs/util/checkout/checkStepComplete.ts` | `checkAccountDetailsComplete()` with digital handling |
| `libs/util/server/data/event-products.server.ts` | `fetchChefEventForProduct()` |
| `app/routes/products.$productHandle.tsx` | Routes to EventProductDetails or ProductTemplate |
| `app/components/product/EventProductDetails.tsx` | Event ticket purchase UI |
| `app/routes/checkout._index.tsx` | Checkout loader: auto-selects shipping, fetches options |
| `app/components/checkout/CheckoutFlow.tsx` | Hides delivery step for digital |
| `app/components/checkout/CheckoutAccountDetails.tsx` | Skips shipping address for digital |
| `app/components/checkout/CheckoutOrderSummary/CheckoutOrderSummaryTotals.tsx` | Hides shipping lines for digital |
| `app/routes/checkout.success.tsx` | Digital-specific success messaging |
| `app/routes/api.checkout.account-details.ts` | Optional shipping address schema |
| `app/providers/checkout-provider.tsx` | Checkout state with digital detection |

---

## 12. Replication Checklist for Sibling Projects

To replicate this digital event ticket system in a new Medusa v2 project:

### Backend Setup

- [ ] **Create `chef-event` module** with the model, service, and migrations
- [ ] **Create `experience-type` module** (optional, for dynamic pricing)
- [ ] **Register modules** in `medusa-config.ts`
- [ ] **Create the `product-chefEvent` link** in `src/links/`
- [ ] **Create workflows**: `create-chef-event`, `accept-chef-event`, `reject-chef-event`
- [ ] **Create API routes** for store and admin chef events
- [ ] **Create subscribers** for event notifications

### Seed / Infrastructure

- [ ] **Create "Digital Products" shipping profile** with `type: 'digital'`
- [ ] **Create "Digital Delivery" shipping option** with `amount: 0`, `code: 'digital'`, linked to the digital profile
- [ ] **Create a fulfillment set** with at least one service zone
- [ ] **Link stock location** to `manual_manual` fulfillment provider
- [ ] **Link stock location** to the fulfillment set
- [ ] **Create "Digital Sales Channel"** and **"Default Sales Channel"**
- [ ] **Create "Digital Location"** stock location for virtual inventory
- [ ] **Link Digital Location** to both sales channels
- [ ] **Create a publishable API key** and link it to sales channels

### Accept Workflow Critical Points

- [ ] Product `shipping_profile_id` must point to "Digital Products" profile
- [ ] Product `sales_channels` must include at least one channel the storefront can access
- [ ] Variant SKU must follow `EVENT-{id}-{date}-{type}` pattern
- [ ] Inventory items must have `requires_shipping: false`
- [ ] Inventory levels must be created at "Digital Location" with `stocked_quantity = partySize`

### Storefront

- [ ] Implement `isEventProduct()` — detect by `EVENT-` SKU prefix
- [ ] Implement `parseEventSku()` — extract event ID from SKU
- [ ] Implement `isDigitalOnlyCart()` — check if sole shipping option is free + "digital"
- [ ] Implement `requiresShippingAddress()` — inverse of `isDigitalOnlyCart`
- [ ] Route event products to a dedicated `EventProductDetails` component
- [ ] In checkout loader, auto-select shipping when only one option exists
- [ ] In `CheckoutAccountDetails`, make shipping address conditional on `!isDigitalOnly`
- [ ] In `CheckoutFlow`, hide `CheckoutDeliveryMethod` when `isDigitalOnly`
- [ ] In account details API schema, make `shippingAddress` optional
- [ ] In order summary totals, hide shipping lines when `isDigitalOnly`
- [ ] In checkout success page, detect digital orders and show ticket-specific messaging

### Environment Variables

```env
MEDUSA_BACKEND_URL=http://localhost:9000
STOREFRONT_URL=http://localhost:3000
ADMIN_BACKEND_URL=http://localhost:9000
CHEF_NOTIFICATIONS_LIST=chef1@example.com,chef2@example.com
```

### Email Templates

Create notification templates for:
- `chef-event-requested` (customer confirmation + chef notification)
- `chef-event-accepted` (customer acceptance with purchase link)
- `chef-event-rejected` (customer rejection notification)
- `event-details-resend` (resend event details)
- `receipt` (post-event receipt with optional tip)
