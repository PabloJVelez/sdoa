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
    data: { client_secret: string; connected_account_id?: string };
  };

  const clientSecret = stripeSession?.data?.client_secret as string;
  const connectedAccountId =
    typeof stripeSession?.data?.connected_account_id === 'string' &&
    stripeSession.data.connected_account_id.startsWith('acct_')
      ? stripeSession.data.connected_account_id
      : undefined;

  const stripeOptions: StripeConstructorOptions | undefined = connectedAccountId
    ? { stripeAccount: connectedAccountId }
    : undefined;

  const stripePromise = useMemo(() => {
    if (!env.STRIPE_PUBLIC_KEY) return null;
    return loadStripe(env.STRIPE_PUBLIC_KEY, stripeOptions);
  }, [env.STRIPE_PUBLIC_KEY, connectedAccountId]);

  if (!stripeSession || !stripePromise || !clientSecret) return null;

  return (
    <Elements
      stripe={stripePromise}
      key={`${clientSecret}:${connectedAccountId ?? ''}`}
      options={
        options ?? {
          clientSecret: clientSecret,
        }
      }
    >
      {children}
    </Elements>
  );
};
