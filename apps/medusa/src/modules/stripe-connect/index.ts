/**
 * Stripe Connect Payment Provider Module
 *
 * Registers the Stripe Connect payment provider with Medusa's payment module.
 * This enables platform fee collection via Stripe Connect destination charges.
 *
 * Configuration:
 * - apiKey: Platform's Stripe secret key
 * - connectedAccountId: SDOA's connected account ID
 * - feePercent: Platform fee percentage (default: 5)
 * - refundApplicationFee: Whether to refund platform fee on refunds (default: false)
 * - webhookSecret: Stripe webhook secret for signature verification
 */

import { ModuleProvider, Modules } from '@medusajs/framework/utils';
import StripeConnectProviderService from './service';

export default ModuleProvider(Modules.PAYMENT, {
  services: [StripeConnectProviderService],
});
