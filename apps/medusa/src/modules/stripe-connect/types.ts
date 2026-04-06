/**
 * Stripe Connect payment provider types.
 * Options passed from medusa-config (env); config is normalized for internal use.
 */

/** Fee mode per product type: per_unit = fixed cents per item, percent = percentage of line total. */
export type PlatformFeeMode = 'per_unit' | 'percent';

export interface StripeConnectProviderOptions {
  apiKey: string;
  /** Stripe Connect connected account id (acct_xxx). Optional legacy override when not using DB. */
  connectedAccountId?: string;
  /** Platform fee percentage (e.g. 5 for 5%). Default 5. Used when mode is percent or as fallback when no line data. */
  feePercent?: number;
  /** When true, refunds include application fee refund. Default false (platform keeps fee). */
  refundApplicationFee?: boolean;
  /** Webhook signing secret for signature verification. */
  webhookSecret?: string;
  /** Enable Stripe automatic_payment_methods. Default true. */
  automaticPaymentMethods?: boolean;
  /** capture_method: 'automatic' | 'manual'. Default 'automatic'. */
  captureMethod?: 'automatic' | 'manual';
  /** When true, commission is per ticket / per bento box (using cart lines). When false, commission is per cart (single percentage of cart total). Default false. */
  feePerUnitBased?: boolean;
  /** Fee mode for tickets (EVENT-* SKU). Default 'percent'. Only used when feePerUnitBased is true. */
  feeModeTickets?: PlatformFeeMode;
  /** Fee mode for bento/other. Default 'percent'. Only used when feePerUnitBased is true. */
  feeModeBento?: PlatformFeeMode;
  /** Fixed fee in cents per ticket when feeModeTickets is per_unit. */
  feePerTicketCents?: number;
  /** Fixed fee in cents per box when feeModeBento is per_unit. */
  feePerBoxCents?: number;
  /** Percentage for tickets when feeModeTickets is percent. Defaults to feePercent if unset. */
  feePercentTickets?: number;
  /** Percentage for bento when feeModeBento is percent. Defaults to feePercent if unset. */
  feePercentBento?: number;
}

export interface StripeConnectConfig {
  apiKey: string;
  /** From env (legacy) or resolved from DB at runtime. */
  connectedAccountId: string;
  feePercent: number;
  refundApplicationFee: boolean;
  webhookSecret?: string;
  automaticPaymentMethods: boolean;
  captureMethod: 'automatic' | 'manual';
  /** When true, use per-line fee (ticket/bento). When false, always use cart-level percentage. */
  feePerUnitBased: boolean;
  feeModeTickets: PlatformFeeMode;
  feeModeBento: PlatformFeeMode;
  feePerTicketCents: number;
  feePerBoxCents: number;
  feePercentTickets: number;
  feePercentBento: number;
}

export interface StripeConnectPaymentData {
  id: string;
  client_secret?: string;
  status: string;
  amount: number;
  currency: string;
  connected_account_id?: string;
  application_fee_amount?: number;
}

/** Line item for platform fee calculation. unit_price_cents = price per unit in smallest currency unit. */
export interface PlatformFeeLineItem {
  sku: string;
  quantity: number;
  unit_price_cents: number;
}
