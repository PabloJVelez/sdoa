/**
 * Stripe Connect payment provider types.
 * Options passed from medusa-config (env); config is normalized for internal use.
 */
export interface StripeConnectProviderOptions {
  apiKey: string;
  /** When true, use destination charges + application fee (requires connectedAccountId). */
  useStripeConnect?: boolean;
  /** Stripe Connect connected account id (acct_xxx). Required when useStripeConnect is true. */
  connectedAccountId?: string;
  /** Platform fee percentage (e.g. 5 for 5%). Default 5. */
  feePercent?: number;
  /** When true, refunds include application fee refund. Default false (platform keeps fee). */
  refundApplicationFee?: boolean;
  /** Optional: pass Stripe processing fee to connected account (gross-up application fee). */
  passStripeFeeToChef?: boolean;
  /** Stripe fee % for gross-up when passStripeFeeToChef is true. Default 2.9. */
  stripeFeePercent?: number;
  /** Stripe flat fee in cents for gross-up. Default 30. */
  stripeFeeFlatCents?: number;
  /** Webhook signing secret for signature verification. */
  webhookSecret?: string;
  /** Enable Stripe automatic_payment_methods. Default true. */
  automaticPaymentMethods?: boolean;
  /** capture_method: 'automatic' | 'manual'. Default 'automatic'. */
  captureMethod?: 'automatic' | 'manual';
}

export interface StripeConnectConfig {
  apiKey: string;
  useStripeConnect: boolean;
  connectedAccountId: string;
  feePercent: number;
  refundApplicationFee: boolean;
  passStripeFeeToChef: boolean;
  stripeFeePercent: number;
  stripeFeeFlatCents: number;
  webhookSecret?: string;
  automaticPaymentMethods: boolean;
  captureMethod: 'automatic' | 'manual';
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
