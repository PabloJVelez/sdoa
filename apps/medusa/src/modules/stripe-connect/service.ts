/**
 * Stripe Connect Payment Provider
 *
 * When USE_STRIPE_CONNECT is true: destination charges with application_fee_amount
 * and transfer_data.destination. When false: standard PaymentIntent (no Connect).
 */
import Stripe from 'stripe';
import {
  AbstractPaymentProvider,
  MedusaError,
  PaymentSessionStatus,
  BigNumber,
} from '@medusajs/framework/utils';
import type {
  Logger,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  RefundPaymentInput,
  RefundPaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  ProviderWebhookPayload,
  WebhookActionResult,
} from '@medusajs/framework/types';
import type {
  StripeConnectProviderOptions,
  StripeConnectConfig,
  StripeConnectPaymentData,
} from './types';
import { getSmallestUnit } from './utils/get-smallest-unit';

type InjectedDependencies = {
  logger: Logger;
};

class StripeConnectProviderService extends AbstractPaymentProvider<StripeConnectProviderOptions> {
  static identifier = 'stripe-connect';

  protected config_: StripeConnectConfig;
  protected logger_: Logger;
  protected stripe_: Stripe;

  private static readonly LOG_PREFIX = '[stripe-connect]';

  constructor(
    { logger }: InjectedDependencies,
    options: StripeConnectProviderOptions,
  ) {
    super({ logger }, options);

    if (!options.apiKey) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Stripe API key is required for stripe-connect provider',
      );
    }

    const useStripeConnect = options.useStripeConnect === true;

    let connectedAccountId = options.connectedAccountId || '';
    if (connectedAccountId && !connectedAccountId.startsWith('acct_')) {
      logger.warn(
        `${StripeConnectProviderService.LOG_PREFIX} Invalid connected account ID format: "${connectedAccountId}". Must start with "acct_".`,
      );
      connectedAccountId = '';
    }

    if (useStripeConnect && !connectedAccountId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'STRIPE_CONNECTED_ACCOUNT_ID is required when USE_STRIPE_CONNECT is true.',
      );
    }

    if (!useStripeConnect) {
      connectedAccountId = '';
    }

    this.config_ = {
      apiKey: options.apiKey,
      useStripeConnect: useStripeConnect && !!connectedAccountId,
      connectedAccountId,
      feePercent: options.feePercent ?? 5,
      refundApplicationFee: options.refundApplicationFee ?? false,
      passStripeFeeToChef: options.passStripeFeeToChef ?? false,
      stripeFeePercent: options.stripeFeePercent ?? 2.9,
      stripeFeeFlatCents: options.stripeFeeFlatCents ?? 30,
      webhookSecret: options.webhookSecret,
      automaticPaymentMethods: options.automaticPaymentMethods ?? true,
      captureMethod: options.captureMethod ?? 'automatic',
    };

    this.logger_ = logger;
    this.stripe_ = new Stripe(this.config_.apiKey);

    if (this.config_.useStripeConnect) {
      this.logger_.info(
        `${StripeConnectProviderService.LOG_PREFIX} Connect enabled: account ${this.config_.connectedAccountId}, fee ${this.config_.feePercent}%`,
      );
    } else {
      this.logger_.info(
        `${StripeConnectProviderService.LOG_PREFIX} Standard Stripe mode (Connect not enabled).`,
      );
    }
  }

  private isConnectEnabled(): boolean {
    return this.config_.useStripeConnect && !!this.config_.connectedAccountId;
  }

  private calculateApplicationFee(amount: number): number {
    if (this.config_.feePercent <= 0) {
      return 0;
    }

    const baseFee = Math.round(amount * (this.config_.feePercent / 100));

    if (!this.config_.passStripeFeeToChef) {
      return baseFee;
    }

    const estimatedStripeFee =
      Math.round(amount * (this.config_.stripeFeePercent / 100)) +
      this.config_.stripeFeeFlatCents;

    return baseFee + estimatedStripeFee;
  }

  private mapStripeStatus(
    stripeStatus: Stripe.PaymentIntent.Status,
  ): PaymentSessionStatus {
    switch (stripeStatus) {
      case 'succeeded':
        return PaymentSessionStatus.CAPTURED;
      case 'processing':
        return PaymentSessionStatus.PENDING;
      case 'requires_capture':
        return PaymentSessionStatus.AUTHORIZED;
      case 'requires_action':
      case 'requires_confirmation':
      case 'requires_payment_method':
        return PaymentSessionStatus.REQUIRES_MORE;
      case 'canceled':
        return PaymentSessionStatus.CANCELED;
      default:
        return PaymentSessionStatus.PENDING;
    }
  }

  private getPaymentIntentId(data?: Record<string, unknown>): string | undefined {
    if (!data) return undefined;
    return data.id as string | undefined;
  }

  async initiatePayment(
    input: InitiatePaymentInput,
  ): Promise<InitiatePaymentOutput> {
    const { amount, currency_code, context } = input;
    const amountInCents = getSmallestUnit(
      amount as unknown as number,
      currency_code,
    );
    const applicationFeeAmount = this.calculateApplicationFee(amountInCents);

    try {
      const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
        amount: amountInCents,
        currency: currency_code.toLowerCase(),
        capture_method: this.config_.captureMethod,
        metadata: {
          ...(context && {
            session_id: String(
              (context as Record<string, unknown>).session_id || '',
            ),
            resource_id: String(
              (context as Record<string, unknown>).resource_id || '',
            ),
          }),
        },
      };

      if (this.config_.automaticPaymentMethods) {
        paymentIntentParams.automatic_payment_methods = { enabled: true };
      }

      if (this.isConnectEnabled()) {
        paymentIntentParams.on_behalf_of = this.config_.connectedAccountId;
        paymentIntentParams.transfer_data = {
          destination: this.config_.connectedAccountId,
        };
        if (applicationFeeAmount > 0) {
          paymentIntentParams.application_fee_amount = applicationFeeAmount;
        }
      }

      const paymentIntent =
        await this.stripe_.paymentIntents.create(paymentIntentParams);

      this.logger_.info(
        `${StripeConnectProviderService.LOG_PREFIX} Created PaymentIntent ${paymentIntent.id}: ${amountInCents} ${currency_code}` +
          (this.isConnectEnabled()
            ? `, fee: ${applicationFeeAmount} (${this.config_.feePercent}%)`
            : ''),
      );

      const paymentData: StripeConnectPaymentData = {
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret || undefined,
        status: paymentIntent.status,
        amount: amountInCents,
        currency: currency_code.toLowerCase(),
        connected_account_id: this.isConnectEnabled()
          ? this.config_.connectedAccountId
          : undefined,
        application_fee_amount: this.isConnectEnabled()
          ? applicationFeeAmount
          : undefined,
      };

      return {
        id: paymentIntent.id,
        data: paymentData as unknown as Record<string, unknown>,
      };
    } catch (error) {
      const stripeError = error as Stripe.errors.StripeError;
      this.logger_.error(
        `${StripeConnectProviderService.LOG_PREFIX} Failed to create PaymentIntent: ${stripeError.message}` +
          (stripeError.code ? ` (code: ${stripeError.code})` : '') +
          (stripeError.param ? ` (param: ${stripeError.param})` : ''),
      );

      if (
        stripeError.code === 'account_invalid' ||
        stripeError.param === 'transfer_data[destination]'
      ) {
        this.logger_.error(
          `${StripeConnectProviderService.LOG_PREFIX} Connected account "${this.config_.connectedAccountId}" is invalid or not onboarded.`,
        );
      }

      throw new MedusaError(
        MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
        `Failed to initiate payment: ${stripeError.message}`,
      );
    }
  }

  async authorizePayment(
    input: AuthorizePaymentInput,
  ): Promise<AuthorizePaymentOutput> {
    const { data } = input;
    const paymentIntentId = this.getPaymentIntentId(data);

    if (!paymentIntentId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'PaymentIntent ID is required for authorization',
      );
    }

    try {
      const paymentIntent =
        await this.stripe_.paymentIntents.retrieve(paymentIntentId);

      let status: PaymentSessionStatus;
      if (
        paymentIntent.status === 'succeeded' ||
        paymentIntent.status === 'requires_capture'
      ) {
        status = PaymentSessionStatus.AUTHORIZED;
      } else {
        status = this.mapStripeStatus(paymentIntent.status);
      }

      return {
        status,
        data: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
        },
      };
    } catch (error) {
      this.logger_.error(
        `${StripeConnectProviderService.LOG_PREFIX} Failed to authorize payment: ${(error as Error).message}`,
      );
      throw new MedusaError(
        MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
        `Failed to authorize payment: ${(error as Error).message}`,
      );
    }
  }

  async capturePayment(
    input: CapturePaymentInput,
  ): Promise<CapturePaymentOutput> {
    const { data } = input;
    const paymentIntentId = this.getPaymentIntentId(data);

    if (!paymentIntentId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'PaymentIntent ID is required for capture',
      );
    }

    try {
      const existingIntent =
        await this.stripe_.paymentIntents.retrieve(paymentIntentId);

      if (existingIntent.status === 'succeeded') {
        return {
          data: {
            id: existingIntent.id,
            status: existingIntent.status,
            amount: existingIntent.amount,
            currency: existingIntent.currency,
          },
        };
      }

      if (existingIntent.status === 'requires_capture') {
        const paymentIntent =
          await this.stripe_.paymentIntents.capture(paymentIntentId);
        return {
          data: {
            id: paymentIntent.id,
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
          },
        };
      }

      this.logger_.warn(
        `${StripeConnectProviderService.LOG_PREFIX} PaymentIntent ${paymentIntentId} in unexpected state for capture: ${existingIntent.status}`,
      );
      return {
        data: {
          id: existingIntent.id,
          status: existingIntent.status,
          amount: existingIntent.amount,
          currency: existingIntent.currency,
        },
      };
    } catch (error) {
      this.logger_.error(
        `${StripeConnectProviderService.LOG_PREFIX} Failed to capture payment: ${(error as Error).message}`,
      );
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to capture payment: ${(error as Error).message}`,
      );
    }
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const { data, amount } = input;
    const currencyCode = (data?.currency_code as string) || 'usd';
    const paymentIntentId = this.getPaymentIntentId(data);

    if (!paymentIntentId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'PaymentIntent ID is required for refund',
      );
    }

    try {
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
        refund_application_fee: this.config_.refundApplicationFee,
      };

      if (amount) {
        refundParams.amount = getSmallestUnit(
          amount as unknown as number,
          currencyCode,
        );
      }

      const refund = await this.stripe_.refunds.create(refundParams);

      this.logger_.info(
        `${StripeConnectProviderService.LOG_PREFIX} Refunded ${refund.amount} for PaymentIntent ${paymentIntentId}, refund_application_fee: ${this.config_.refundApplicationFee}`,
      );

      return {
        data: {
          id: refund.id,
          payment_intent: paymentIntentId,
          amount: refund.amount,
          status: refund.status,
        },
      };
    } catch (error) {
      this.logger_.error(
        `${StripeConnectProviderService.LOG_PREFIX} Failed to refund payment: ${(error as Error).message}`,
      );
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to refund payment: ${(error as Error).message}`,
      );
    }
  }

  async cancelPayment(
    input: CancelPaymentInput,
  ): Promise<CancelPaymentOutput> {
    const { data } = input;
    const paymentIntentId = this.getPaymentIntentId(data);

    if (!paymentIntentId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'PaymentIntent ID is required for cancellation',
      );
    }

    try {
      const paymentIntent =
        await this.stripe_.paymentIntents.cancel(paymentIntentId);

      this.logger_.info(
        `${StripeConnectProviderService.LOG_PREFIX} Canceled PaymentIntent ${paymentIntentId}`,
      );

      return {
        data: {
          id: paymentIntent.id,
          status: paymentIntent.status,
        },
      };
    } catch (error) {
      if (
        (error as Stripe.errors.StripeError).code ===
        'payment_intent_unexpected_state'
      ) {
        this.logger_.warn(
          `${StripeConnectProviderService.LOG_PREFIX} PaymentIntent ${paymentIntentId} already in final state`,
        );
        return { data: { id: paymentIntentId, status: 'canceled' } };
      }

      this.logger_.error(
        `${StripeConnectProviderService.LOG_PREFIX} Failed to cancel payment: ${(error as Error).message}`,
      );
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to cancel payment: ${(error as Error).message}`,
      );
    }
  }

  async deletePayment(
    input: DeletePaymentInput,
  ): Promise<DeletePaymentOutput> {
    const { data } = input;
    const paymentIntentId = this.getPaymentIntentId(data);

    if (!paymentIntentId) {
      return { data: {} };
    }

    try {
      const paymentIntent =
        await this.stripe_.paymentIntents.retrieve(paymentIntentId);
      if (
        paymentIntent.status !== 'canceled' &&
        paymentIntent.status !== 'succeeded'
      ) {
        await this.stripe_.paymentIntents.cancel(paymentIntentId);
        this.logger_.info(
          `${StripeConnectProviderService.LOG_PREFIX} Deleted (canceled) PaymentIntent ${paymentIntentId}`,
        );
      }
      return { data: {} };
    } catch (error) {
      this.logger_.warn(
        `${StripeConnectProviderService.LOG_PREFIX} Could not delete PaymentIntent ${paymentIntentId}: ${(error as Error).message}`,
      );
      return { data: {} };
    }
  }

  async retrievePayment(
    input: RetrievePaymentInput,
  ): Promise<RetrievePaymentOutput> {
    const { data } = input;
    const paymentIntentId = this.getPaymentIntentId(data);

    if (!paymentIntentId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'PaymentIntent ID is required for retrieval',
      );
    }

    try {
      const paymentIntent =
        await this.stripe_.paymentIntents.retrieve(paymentIntentId);
      return {
        data: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          client_secret: paymentIntent.client_secret,
        },
      };
    } catch (error) {
      this.logger_.error(
        `${StripeConnectProviderService.LOG_PREFIX} Failed to retrieve payment: ${(error as Error).message}`,
      );
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Failed to retrieve payment: ${(error as Error).message}`,
      );
    }
  }

  async getPaymentStatus(
    input: GetPaymentStatusInput,
  ): Promise<GetPaymentStatusOutput> {
    const { data } = input;
    const paymentIntentId = this.getPaymentIntentId(data);

    if (!paymentIntentId) {
      return { status: PaymentSessionStatus.PENDING };
    }

    try {
      const paymentIntent =
        await this.stripe_.paymentIntents.retrieve(paymentIntentId);
      return {
        status: this.mapStripeStatus(paymentIntent.status),
        data: {
          id: paymentIntent.id,
          stripe_status: paymentIntent.status,
        },
      };
    } catch (error) {
      this.logger_.warn(
        `${StripeConnectProviderService.LOG_PREFIX} Could not get payment status: ${(error as Error).message}`,
      );
      return { status: PaymentSessionStatus.ERROR };
    }
  }

  async updatePayment(
    input: UpdatePaymentInput,
  ): Promise<UpdatePaymentOutput> {
    const { data, amount, currency_code } = input;
    const paymentIntentId = this.getPaymentIntentId(data);

    if (!paymentIntentId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'PaymentIntent ID is required for update',
      );
    }

    try {
      const updateParams: Stripe.PaymentIntentUpdateParams = {};

      if (amount !== undefined) {
        const amountInCents = getSmallestUnit(
          amount as unknown as number,
          currency_code,
        );
        updateParams.amount = amountInCents;

        if (this.isConnectEnabled()) {
          const applicationFeeAmount =
            this.calculateApplicationFee(amountInCents);
          if (applicationFeeAmount > 0) {
            updateParams.application_fee_amount = applicationFeeAmount;
          }
        }
      }

      if (currency_code) {
        updateParams.currency = currency_code.toLowerCase();
      }

      const paymentIntent = await this.stripe_.paymentIntents.update(
        paymentIntentId,
        updateParams,
      );

      this.logger_.info(
        `${StripeConnectProviderService.LOG_PREFIX} Updated PaymentIntent ${paymentIntentId}`,
      );

      const paymentData: StripeConnectPaymentData = {
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret || undefined,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        connected_account_id: this.isConnectEnabled()
          ? this.config_.connectedAccountId
          : undefined,
        application_fee_amount: this.isConnectEnabled()
          ? (paymentIntent.application_fee_amount ?? undefined)
          : undefined,
      };

      return {
        data: paymentData as unknown as Record<string, unknown>,
      };
    } catch (error) {
      this.logger_.error(
        `${StripeConnectProviderService.LOG_PREFIX} Failed to update payment: ${(error as Error).message}`,
      );
      throw new MedusaError(
        MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
        `Failed to update payment: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Handles Stripe webhook events.
   * Session correlation: resource_id (Medusa session) or session_id, then PaymentIntent id.
   */
  async getWebhookActionAndData(
    payload: ProviderWebhookPayload['payload'],
  ): Promise<WebhookActionResult> {
    const { data, rawData, headers } = payload;

    if (this.config_.webhookSecret && rawData && headers) {
      const signature = headers['stripe-signature'];
      if (signature) {
        try {
          this.stripe_.webhooks.constructEvent(
            rawData as string | Buffer,
            signature as string,
            this.config_.webhookSecret,
          );
        } catch (error) {
          this.logger_.error(
            `${StripeConnectProviderService.LOG_PREFIX} Webhook signature verification failed: ${(error as Error).message}`,
          );
          return {
            action: 'failed',
            data: { session_id: '', amount: new BigNumber(0) },
          };
        }
      }
    }

    const event = data as unknown as Stripe.Event;

    if (!event || !event.type) {
      this.logger_.warn(
        `${StripeConnectProviderService.LOG_PREFIX} Received webhook with no event type`,
      );
      return {
        action: 'not_supported',
        data: { session_id: '', amount: new BigNumber(0) },
      };
    }

    try {
      switch (event.type) {
        case 'payment_intent.succeeded': {
          const pi = event.data.object as Stripe.PaymentIntent;
          const sessionId =
            pi.metadata?.resource_id || pi.metadata?.session_id || pi.id;

          this.logger_.info(
            `${StripeConnectProviderService.LOG_PREFIX} Webhook: payment_intent.succeeded for ${pi.id} (session: ${sessionId})`,
          );

          return {
            action: 'captured',
            data: {
              session_id: sessionId,
              amount: new BigNumber(pi.amount),
            },
          };
        }

        case 'payment_intent.amount_capturable_updated': {
          const pi = event.data.object as Stripe.PaymentIntent;
          const sessionId =
            pi.metadata?.resource_id || pi.metadata?.session_id || pi.id;

          this.logger_.info(
            `${StripeConnectProviderService.LOG_PREFIX} Webhook: payment_intent.amount_capturable_updated for ${pi.id} (session: ${sessionId})`,
          );

          return {
            action: 'authorized',
            data: {
              session_id: sessionId,
              amount: new BigNumber(pi.amount_capturable || 0),
            },
          };
        }

        case 'payment_intent.payment_failed': {
          const pi = event.data.object as Stripe.PaymentIntent;
          const sessionId =
            pi.metadata?.resource_id || pi.metadata?.session_id || pi.id;

          this.logger_.warn(
            `${StripeConnectProviderService.LOG_PREFIX} Webhook: payment_intent.payment_failed for ${pi.id} (session: ${sessionId})`,
          );

          return {
            action: 'failed',
            data: {
              session_id: sessionId,
              amount: new BigNumber(pi.amount),
            },
          };
        }

        case 'charge.refunded': {
          const charge = event.data.object as Stripe.Charge;
          const paymentIntentId = charge.payment_intent as string;
          const sessionId = paymentIntentId || charge.id;

          this.logger_.info(
            `${StripeConnectProviderService.LOG_PREFIX} Webhook: charge.refunded for ${sessionId}`,
          );

          return {
            action: 'not_supported',
            data: {
              session_id: sessionId,
              amount: new BigNumber(charge.amount_refunded || 0),
            },
          };
        }

        default:
          this.logger_.debug(
            `${StripeConnectProviderService.LOG_PREFIX} Webhook: unhandled event type ${event.type}`,
          );
          return {
            action: 'not_supported',
            data: { session_id: '', amount: new BigNumber(0) },
          };
      }
    } catch (error) {
      this.logger_.error(
        `${StripeConnectProviderService.LOG_PREFIX} Webhook processing error: ${(error as Error).message}`,
      );
      return {
        action: 'failed',
        data: { session_id: '', amount: new BigNumber(0) },
      };
    }
  }
}

export default StripeConnectProviderService;
