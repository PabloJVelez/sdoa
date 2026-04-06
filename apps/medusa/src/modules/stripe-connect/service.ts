/**
 * Stripe Connect Payment Provider
 *
 * Always uses Stripe Connect (Express + direct charges on the connected account)
 * via `{ stripeAccount }` request options, with `application_fee_amount` for platform commission.
 */
import Stripe from 'stripe';
import { AbstractPaymentProvider, MedusaError, PaymentSessionStatus, BigNumber } from '@medusajs/framework/utils';
import type {
  Logger,
  ICartModuleService,
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
  PlatformFeeLineItem,
} from './types';
import { getPlatformFeeConfigFromEnv } from './utils/get-fee-config';
import { getSmallestUnit } from './utils/get-smallest-unit';
import { calculatePlatformFeeFromLines } from './utils/platform-fee';

interface StripeConnectAccountService {
  getConnectedAccountId(): Promise<string | null>;
}

type InjectedDependencies = {
  logger: Logger;
  stripeConnectAccountModuleService?: StripeConnectAccountService;
  cart?: ICartModuleService;
};

const NO_ACCOUNT_MESSAGE =
  'No Stripe account has been onboarded. Complete Stripe onboarding in the admin first.';

class StripeConnectProviderService extends AbstractPaymentProvider<StripeConnectProviderOptions> {
  static identifier = 'stripe-connect';

  protected config_: StripeConnectConfig;
  protected logger_: Logger;
  protected stripe_: Stripe;
  protected stripeConnectAccountService_?: StripeConnectAccountService;
  private cartModuleService_?: ICartModuleService;
  private static readonly LOG_PREFIX = '[stripe-connect]';

  constructor(
    { logger, stripeConnectAccountModuleService, cart }: InjectedDependencies,
    options: StripeConnectProviderOptions,
  ) {
    super({ logger, stripeConnectAccountModuleService, cart }, options);
    this.cartModuleService_ = cart;

    if (!options.apiKey) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, 'Stripe API key is required for stripe-connect provider');
    }

    const envAccountId = options.connectedAccountId || '';
    if (envAccountId && !envAccountId.startsWith('acct_')) {
      logger.warn(
        `${StripeConnectProviderService.LOG_PREFIX} Invalid connected account ID format (env). Must start with "acct_".`,
      );
    }

    this.stripeConnectAccountService_ = stripeConnectAccountModuleService;
    const feeConfig = getPlatformFeeConfigFromEnv();
    this.config_ = {
      apiKey: options.apiKey,
      connectedAccountId: envAccountId.startsWith('acct_') ? envAccountId : '',
      refundApplicationFee: options.refundApplicationFee ?? false,
      webhookSecret: options.webhookSecret,
      automaticPaymentMethods: options.automaticPaymentMethods ?? true,
      captureMethod: options.captureMethod ?? 'automatic',
      ...feeConfig,
    };

    this.logger_ = logger;
    this.stripe_ = new Stripe(this.config_.apiKey);

    const feeSummary = this.config_.feePerUnitBased
      ? `per-unit — events: ${
          this.config_.feeModeTickets === 'per_unit'
            ? `${this.config_.feePerTicketCents}¢/ticket`
            : `${this.config_.feePercentTickets ?? this.config_.feePercent}% of ticket lines`
        }; products: ${
          this.config_.feeModeBento === 'per_unit'
            ? `${this.config_.feePerBoxCents}¢/item`
            : `${this.config_.feePercentBento ?? this.config_.feePercent}% of product lines`
        }`
      : `${this.config_.feePercent}% of order total`;
    this.logger_.info(
      `${StripeConnectProviderService.LOG_PREFIX} Connect enabled (account from DB or env), fee ${feeSummary}`,
    );
    this.logger_.info(
      `${StripeConnectProviderService.LOG_PREFIX} [fee] config: feePerUnitBased=${this.config_.feePerUnitBased} feeModeTickets=${this.config_.feeModeTickets} feePerTicketCents=${this.config_.feePerTicketCents} feeModeBento=${this.config_.feeModeBento} feePerBoxCents=${this.config_.feePerBoxCents} feePercentTickets=${this.config_.feePercentTickets} feePercentBento=${this.config_.feePercentBento}`,
    );
  }

  private async getConnectedAccountId(): Promise<string | null> {
    if (this.config_.connectedAccountId) return this.config_.connectedAccountId;

    if (!this.stripeConnectAccountService_) {
      this.logger_.warn(
        `${StripeConnectProviderService.LOG_PREFIX} stripeConnectAccountModuleService not available — add it to the payment module's dependencies in medusa-config.ts.`,
      );
      return null;
    }

    try {
      return await this.stripeConnectAccountService_.getConnectedAccountId();
    } catch (e) {
      this.logger_.warn(
        `${StripeConnectProviderService.LOG_PREFIX} Failed to resolve connected account: ${(e as Error).message}`,
      );
      return null;
    }
  }

  /**
   * Resolves cart to line items with sku, quantity, unit_price_cents via cart module.
   * Returns [] if cart module is unavailable or cart has no items. Used for per-line platform fee.
   */
  private async getCartLines(cartId: string): Promise<PlatformFeeLineItem[]> {
    if (!this.cartModuleService_) {
      this.logger_.warn(
        `${StripeConnectProviderService.LOG_PREFIX} [fee] getCartLines: no cartModuleService, returning []`,
      );
      return [];
    }
    try {
      const items = await this.cartModuleService_.listLineItems({ cart_id: cartId }, { take: 500 });
      this.logger_.info(
        `${StripeConnectProviderService.LOG_PREFIX} [fee] getCartLines(cartId=${cartId}) raw items=${items.length}`,
      );
      return items.map((item) => ({
        sku: item.variant_sku ?? '',
        quantity: Number(item.quantity) || 0,
        unit_price_cents: Math.round(Number(item.unit_price) || 0),
      }));
    } catch (e) {
      this.logger_.warn(`${StripeConnectProviderService.LOG_PREFIX} getCartLines failed: ${(e as Error).message}`);
      throw e;
    }
  }

  private calculateApplicationFee(amount: number): number {
    if (this.config_.feePercent <= 0) {
      return 0;
    }
    return Math.round(amount * (this.config_.feePercent / 100));
  }

  /**
   * For direct charges, PaymentIntents live on the connected account — pass stripeAccount on API calls.
   * Legacy destination-charge payments may omit connected_account_id on data; those PIs live on the platform.
   */
  private stripeAccountOptionsForPaymentData(
    data?: Record<string, unknown>,
  ): Stripe.RequestOptions | undefined {
    const acct = data?.connected_account_id;
    if (typeof acct === 'string' && acct.startsWith('acct_')) {
      return { stripeAccount: acct };
    }
    return undefined;
  }

  private mapStripeStatus(stripeStatus: Stripe.PaymentIntent.Status): PaymentSessionStatus {
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

  /**
   * Persist Connect-related PI fields on Medusa Payment.data (e.g. admin “platform commission” widget).
   * Direct charges: pass knownConnectedAccountId from session (transfer_data is absent).
   * Legacy destination charges: fall back to transfer_data.destination when present.
   */
  private persistDataFromPaymentIntent(
    pi: Stripe.PaymentIntent,
    knownConnectedAccountId?: string | null,
  ): {
    application_fee_amount?: number;
    connected_account_id?: string;
  } {
    const fee = pi.application_fee_amount;
    const out: { application_fee_amount?: number; connected_account_id?: string } = {};
    if (typeof fee === 'number') {
      out.application_fee_amount = fee;
    }
    if (knownConnectedAccountId && knownConnectedAccountId.startsWith('acct_')) {
      out.connected_account_id = knownConnectedAccountId;
    } else {
      const dest = pi.transfer_data?.destination;
      const connected = typeof dest === 'string' ? dest : dest != null ? String(dest) : undefined;
      if (connected) {
        out.connected_account_id = connected;
      }
    }
    return out;
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const { amount, currency_code, context, data: inputData } = input;
    const amountInCents = getSmallestUnit(amount as unknown as number, currency_code);

    const dataObj = inputData as Record<string, unknown> | undefined;
    const ctx = context as Record<string, unknown> | undefined;
    const cartIdFromData = typeof dataObj?.cart_id === 'string' ? dataObj.cart_id : undefined;
    const cartIdFromContext = (ctx?.cart_id ?? ctx?.resource_id) as string | undefined;
    const cartId = cartIdFromData ?? cartIdFromContext;

    let applicationFeeAmount: number;
    if (!this.config_.feePerUnitBased) {
      applicationFeeAmount = this.calculateApplicationFee(amountInCents);
      this.logger_.info(
        `${StripeConnectProviderService.LOG_PREFIX} [fee] mode=per_cart amount=${amountInCents} cents → application_fee=${applicationFeeAmount} (${this.config_.feePercent}% of cart)`,
      );
    } else {
      this.logger_.info(
        `${StripeConnectProviderService.LOG_PREFIX} [fee] mode=per_unit cart_id=${cartId ?? 'none'} (from data=${!!cartIdFromData} context_keys=${ctx ? Object.keys(ctx).join(',') : 'none'})`,
      );
      if (cartId && typeof cartId === 'string') {
        try {
          const lines = await this.getCartLines(cartId);
          this.logger_.info(
            `${StripeConnectProviderService.LOG_PREFIX} [fee] cart lines count=${lines.length} items=${JSON.stringify(lines.map((l) => ({ sku: l.sku, qty: l.quantity, unit_cents: l.unit_price_cents })))}`,
          );
          if (lines.length > 0) {
            applicationFeeAmount = calculatePlatformFeeFromLines(lines, this.config_);
            this.logger_.info(
              `${StripeConnectProviderService.LOG_PREFIX} [fee] platform fee from lines=${applicationFeeAmount} cents`,
            );
          } else {
            applicationFeeAmount = this.calculateApplicationFee(amountInCents);
            this.logger_.info(
              `${StripeConnectProviderService.LOG_PREFIX} [fee] no cart lines, fallback to cart % → application_fee=${applicationFeeAmount}`,
            );
          }
        } catch (e) {
          this.logger_.warn(
            `${StripeConnectProviderService.LOG_PREFIX} Could not resolve cart lines for per-line fee, using percentage of total: ${(e as Error).message}`,
          );
          applicationFeeAmount = this.calculateApplicationFee(amountInCents);
        }
      } else {
        applicationFeeAmount = this.calculateApplicationFee(amountInCents);
        this.logger_.info(
          `${StripeConnectProviderService.LOG_PREFIX} [fee] no cart_id in context/data, fallback to cart % → application_fee=${applicationFeeAmount}`,
        );
      }
    }

    try {
      const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
        amount: amountInCents,
        currency: currency_code.toLowerCase(),
        capture_method: this.config_.captureMethod,
        metadata: {
          ...(context && {
            session_id: String((context as Record<string, unknown>).session_id || ''),
            resource_id: String((context as Record<string, unknown>).resource_id || ''),
          }),
        },
      };

      if (this.config_.automaticPaymentMethods) {
        paymentIntentParams.automatic_payment_methods = { enabled: true };
      }

      let connectedAccountId: string | null = null;

      connectedAccountId = await this.getConnectedAccountId();
      if (!connectedAccountId) {
        this.logger_.error(`${StripeConnectProviderService.LOG_PREFIX} ${NO_ACCOUNT_MESSAGE}`);
        throw new MedusaError(MedusaError.Types.NOT_ALLOWED, NO_ACCOUNT_MESSAGE);
      }
      if (applicationFeeAmount > 0) {
        paymentIntentParams.application_fee_amount = applicationFeeAmount;
      }

      const paymentIntent = await this.stripe_.paymentIntents.create(
        paymentIntentParams,
        { stripeAccount: connectedAccountId },
      );

      this.logger_.info(
        `${StripeConnectProviderService.LOG_PREFIX} Created PaymentIntent ${paymentIntent.id}: amount=${amountInCents} ${currency_code}` +
          ` application_fee_amount=${applicationFeeAmount}`,
      );

      const paymentData: StripeConnectPaymentData = {
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret || undefined,
        status: paymentIntent.status,
        amount: amountInCents,
        currency: currency_code.toLowerCase(),
        connected_account_id: connectedAccountId ?? undefined,
        application_fee_amount: applicationFeeAmount > 0 ? applicationFeeAmount : undefined,
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

      if (stripeError.code === 'account_invalid') {
        this.logger_.error(
          `${StripeConnectProviderService.LOG_PREFIX} Connected account is invalid or not onboarded.`,
        );
      }

      throw new MedusaError(
        MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
        `Failed to initiate payment: ${stripeError.message}`,
      );
    }
  }

  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    const { data } = input;
    const paymentIntentId = this.getPaymentIntentId(data);
    const dataObj = data as Record<string, unknown> | undefined;
    const stripeOpts = this.stripeAccountOptionsForPaymentData(dataObj);
    const knownAcct =
      typeof dataObj?.connected_account_id === 'string' ? dataObj.connected_account_id : null;

    if (!paymentIntentId) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, 'PaymentIntent ID is required for authorization');
    }

    try {
      const paymentIntent = await this.stripe_.paymentIntents.retrieve(paymentIntentId, stripeOpts);

      let status: PaymentSessionStatus;
      if (paymentIntent.status === 'succeeded' || paymentIntent.status === 'requires_capture') {
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
          ...this.persistDataFromPaymentIntent(paymentIntent, knownAcct),
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

  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    const { data } = input;
    const paymentIntentId = this.getPaymentIntentId(data);
    const dataObj = data as Record<string, unknown> | undefined;
    const stripeOpts = this.stripeAccountOptionsForPaymentData(dataObj);
    const knownAcct =
      typeof dataObj?.connected_account_id === 'string' ? dataObj.connected_account_id : null;

    if (!paymentIntentId) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, 'PaymentIntent ID is required for capture');
    }

    try {
      const existingIntent = await this.stripe_.paymentIntents.retrieve(paymentIntentId, stripeOpts);

      if (existingIntent.status === 'succeeded') {
        return {
          data: {
            id: existingIntent.id,
            status: existingIntent.status,
            amount: existingIntent.amount,
            currency: existingIntent.currency,
            ...this.persistDataFromPaymentIntent(existingIntent, knownAcct),
          },
        };
      }

      if (existingIntent.status === 'requires_capture') {
        const paymentIntent = await this.stripe_.paymentIntents.capture(paymentIntentId, {}, stripeOpts);
        return {
          data: {
            id: paymentIntent.id,
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            ...this.persistDataFromPaymentIntent(paymentIntent, knownAcct),
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
          ...this.persistDataFromPaymentIntent(existingIntent, knownAcct),
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
    const dataObj = data as Record<string, unknown> | undefined;
    const stripeOpts = this.stripeAccountOptionsForPaymentData(dataObj);

    if (!paymentIntentId) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, 'PaymentIntent ID is required for refund');
    }

    try {
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
        refund_application_fee: this.config_.refundApplicationFee,
      };

      if (amount) {
        refundParams.amount = getSmallestUnit(amount as unknown as number, currencyCode);
      }

      const refund = await this.stripe_.refunds.create(refundParams, stripeOpts);

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

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    const { data } = input;
    const paymentIntentId = this.getPaymentIntentId(data);
    const dataObj = data as Record<string, unknown> | undefined;
    const stripeOpts = this.stripeAccountOptionsForPaymentData(dataObj);

    if (!paymentIntentId) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, 'PaymentIntent ID is required for cancellation');
    }

    try {
      const paymentIntent = await this.stripe_.paymentIntents.cancel(paymentIntentId, {}, stripeOpts);

      this.logger_.info(`${StripeConnectProviderService.LOG_PREFIX} Canceled PaymentIntent ${paymentIntentId}`);

      return {
        data: {
          id: paymentIntent.id,
          status: paymentIntent.status,
        },
      };
    } catch (error) {
      if ((error as Stripe.errors.StripeError).code === 'payment_intent_unexpected_state') {
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

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    const { data } = input;
    const paymentIntentId = this.getPaymentIntentId(data);
    const dataObj = data as Record<string, unknown> | undefined;
    const stripeOpts = this.stripeAccountOptionsForPaymentData(dataObj);

    if (!paymentIntentId) {
      return { data: {} };
    }

    try {
      const paymentIntent = await this.stripe_.paymentIntents.retrieve(paymentIntentId, stripeOpts);
      if (paymentIntent.status !== 'canceled' && paymentIntent.status !== 'succeeded') {
        await this.stripe_.paymentIntents.cancel(paymentIntentId, {}, stripeOpts);
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

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    const { data } = input;
    const paymentIntentId = this.getPaymentIntentId(data);
    const dataObj = data as Record<string, unknown> | undefined;
    const stripeOpts = this.stripeAccountOptionsForPaymentData(dataObj);
    const knownAcct =
      typeof dataObj?.connected_account_id === 'string' ? dataObj.connected_account_id : null;

    if (!paymentIntentId) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, 'PaymentIntent ID is required for retrieval');
    }

    try {
      const paymentIntent = await this.stripe_.paymentIntents.retrieve(paymentIntentId, stripeOpts);
      return {
        data: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          client_secret: paymentIntent.client_secret,
          ...this.persistDataFromPaymentIntent(paymentIntent, knownAcct),
        },
      };
    } catch (error) {
      this.logger_.error(
        `${StripeConnectProviderService.LOG_PREFIX} Failed to retrieve payment: ${(error as Error).message}`,
      );
      throw new MedusaError(MedusaError.Types.NOT_FOUND, `Failed to retrieve payment: ${(error as Error).message}`);
    }
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    const { data } = input;
    const paymentIntentId = this.getPaymentIntentId(data);
    const dataObj = data as Record<string, unknown> | undefined;
    const stripeOpts = this.stripeAccountOptionsForPaymentData(dataObj);

    if (!paymentIntentId) {
      return { status: PaymentSessionStatus.PENDING };
    }

    try {
      const paymentIntent = await this.stripe_.paymentIntents.retrieve(paymentIntentId, stripeOpts);
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

  /**
   * Updates payment (e.g. cart amount changed). Fee is recalculated as percentage of new amount;
   * no cart/line context is available on update, so per-line fee is not applied here.
   */
  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    const { data, amount, currency_code } = input;
    const paymentIntentId = this.getPaymentIntentId(data);
    const dataObj = data as Record<string, unknown> | undefined;
    const stripeOpts = this.stripeAccountOptionsForPaymentData(dataObj);
    const knownAcctFromData =
      typeof dataObj?.connected_account_id === 'string' ? dataObj.connected_account_id : null;

    if (!paymentIntentId) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, 'PaymentIntent ID is required for update');
    }

    try {
      const updateParams: Stripe.PaymentIntentUpdateParams = {};

      if (amount !== undefined) {
        const amountInCents = getSmallestUnit(amount as unknown as number, currency_code);
        updateParams.amount = amountInCents;

        const applicationFeeAmount = this.calculateApplicationFee(amountInCents);
        if (applicationFeeAmount > 0) {
          updateParams.application_fee_amount = applicationFeeAmount;
        }
      }

      if (currency_code) {
        updateParams.currency = currency_code.toLowerCase();
      }

      const paymentIntent = await this.stripe_.paymentIntents.update(
        paymentIntentId,
        updateParams,
        stripeOpts,
      );

      this.logger_.info(`${StripeConnectProviderService.LOG_PREFIX} Updated PaymentIntent ${paymentIntentId}`);

      const connectedAccountIdForUpdate =
        knownAcctFromData && knownAcctFromData.startsWith('acct_')
          ? knownAcctFromData
          : await this.getConnectedAccountId();

      const paymentData: StripeConnectPaymentData = {
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret || undefined,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        connected_account_id: connectedAccountIdForUpdate ?? undefined,
        application_fee_amount: paymentIntent.application_fee_amount ?? undefined,
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
  async getWebhookActionAndData(payload: ProviderWebhookPayload['payload']): Promise<WebhookActionResult> {
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
      this.logger_.warn(`${StripeConnectProviderService.LOG_PREFIX} Received webhook with no event type`);
      return {
        action: 'not_supported',
        data: { session_id: '', amount: new BigNumber(0) },
      };
    }

    try {
      switch (event.type) {
        case 'payment_intent.succeeded': {
          const pi = event.data.object as Stripe.PaymentIntent;
          const sessionId = pi.metadata?.resource_id || pi.metadata?.session_id || pi.id;

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
          const sessionId = pi.metadata?.resource_id || pi.metadata?.session_id || pi.id;

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
          const sessionId = pi.metadata?.resource_id || pi.metadata?.session_id || pi.id;

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

          this.logger_.info(`${StripeConnectProviderService.LOG_PREFIX} Webhook: charge.refunded for ${sessionId}`);

          return {
            action: 'not_supported',
            data: {
              session_id: sessionId,
              amount: new BigNumber(charge.amount_refunded || 0),
            },
          };
        }

        default:
          this.logger_.debug(`${StripeConnectProviderService.LOG_PREFIX} Webhook: unhandled event type ${event.type}`);
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
