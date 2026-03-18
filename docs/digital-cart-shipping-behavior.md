## Digital-Only Carts: Shipping Display Behavior

### Goal

Hide shipping-related lines from the checkout order summary when the cart only contains digital products (e.g. event tickets delivered digitally), while preserving existing behavior for physical shipments.

### High-Level Behavior

- **Digital-only carts**
  - **Do not** show `Shipping` or `Estimated Shipping` lines in the checkout summary.
  - `Total` uses `cart.total` directly (no extra estimated shipping added).
  - `Subtotal`, `Discount` (when present), and `Taxes` are still displayed as usual.
- **Non-digital carts**
  - Existing behavior is preserved:
    - If a shipping method is selected, show a `Shipping` line using `cart.shipping_total`.
    - If no shipping method is selected, show `Estimated Shipping` based on available options.
    - `Total` includes either the selected shipping amount or the estimated shipping amount.

### Implementation Details

- **File updated**
  - `apps/storefront/app/components/checkout/CheckoutOrderSummary/CheckoutOrderSummaryTotals.tsx`

- **Key changes**
  - Import and use the existing helper `isDigitalOnlyCart(cart, shippingOptions)` to determine whether the current cart is digital-only.
  - Compute a new boolean `isDigitalOnly` and use it to:
    - Short-circuit the `Total` calculation so that for digital-only carts it uses `cart.total` without adding estimated shipping.
    - Guard the rendering of `Shipping` and `Estimated Shipping` lines so they only appear when **not** digital-only.
  - Removed temporary `console.log` debug output from the totals item component for a cleaner production checkout experience.

### Logic Summary (Pseudo-Code)

```ts
const isDigitalOnly = isDigitalOnlyCart(cart, shippingOptions);

const hasShippingMethod = cart.shipping_methods?.length > 0;
const estimatedShipping = calculateEstimatedShipping(shippingOptions);
const discountTotal = cart.discount_total ?? 0;
const shippingAmount = cart.shipping_total ?? 0;
const cartTotal = cart.total ?? 0;

const total = isDigitalOnly
  ? cartTotal
  : hasShippingMethod
    ? cartTotal
    : cartTotal + estimatedShipping;

// Render:
// - Always: Subtotal, optional Discount, Taxes, Total.
// - Only when !isDigitalOnly:
//   - If hasShippingMethod: Shipping
//   - Else: Estimated Shipping
```

