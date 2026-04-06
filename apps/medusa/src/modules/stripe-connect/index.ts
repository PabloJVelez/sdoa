/**
 * Stripe Connect Payment Provider Module
 *
 * Registers the Stripe Connect payment provider with Medusa's payment module.
 * Direct charges on the connected Express account plus application_fee_amount.
 *
 * Configuration:
 * - apiKey: Platform's Stripe secret key
 * - refundApplicationFee: Whether to refund application fee on refunds (default: false)
 * - webhookSecret: Signing secret for /hooks/payment/stripe-connect (Connect webhook, connected-account events)
 */

import { ModuleProvider, Modules } from '@medusajs/framework/utils';
import StripeConnectProviderService from './service';

export default ModuleProvider(Modules.PAYMENT, {
  services: [StripeConnectProviderService],
});
