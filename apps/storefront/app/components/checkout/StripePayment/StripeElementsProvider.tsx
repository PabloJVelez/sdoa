import { useCheckout } from '@app/hooks/useCheckout';
import { useEnv } from '@app/hooks/useEnv';
import { Elements } from '@stripe/react-stripe-js';
import { StripeElementsOptions, loadStripe, type StripeConstructorOptions } from '@stripe/stripe-js';
import { FC, PropsWithChildren, useMemo } from 'react';

export interface StripeElementsProviderProps extends PropsWithChildren {
  options?: StripeElementsOptions;
}

export const StripeElementsProvider: FC<StripeElementsProviderProps> = ({ options, children }) => {
  const { env } = useEnv();
  const { cart } = useCheckout();

  const stripeSession = useMemo(
    () => cart?.payment_collection?.payment_sessions?.find((s) => s.provider_id === 'pp_stripe-connect_stripe-connect'),
    [cart?.payment_collection?.payment_sessions],
  ) as unknown as {
    data: Record<string, unknown> | undefined;
  } | undefined;

  const sessionData = stripeSession?.data;
  const clientSecret = typeof sessionData?.client_secret === 'string' ? sessionData.client_secret : undefined;
  const connectedAccountId =
    typeof sessionData?.connected_account_id === 'string' && sessionData.connected_account_id.startsWith('acct_')
      ? sessionData.connected_account_id
      : undefined;

  if (sessionData && clientSecret && !connectedAccountId) {
    console.warn(
      '[StripeElementsProvider] Payment session has client_secret but no connected_account_id. ' +
        'This will cause a 400 error if the PaymentIntent was created as a direct charge on a connected account. ' +
        'Session data keys:',
      Object.keys(sessionData),
    );
  }

  const stripePromise = useMemo(() => {
    if (!env.STRIPE_PUBLIC_KEY) return null;
    const opts: StripeConstructorOptions | undefined = connectedAccountId
      ? { stripeAccount: connectedAccountId }
      : undefined;
    return loadStripe(env.STRIPE_PUBLIC_KEY, opts);
  }, [env.STRIPE_PUBLIC_KEY, connectedAccountId]);

  if (!stripeSession || !stripePromise || !clientSecret) return null;

  return (
    <Elements
      stripe={stripePromise}
      key={`${clientSecret}:${connectedAccountId ?? ''}`}
      options={
        options ?? {
          clientSecret,
        }
      }
    >
      {children}
    </Elements>
  );
};
