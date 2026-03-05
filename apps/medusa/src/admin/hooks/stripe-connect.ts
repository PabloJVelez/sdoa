import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sdk } from '../../sdk';
import type {
  StripeConnectStatusResponse,
  StripeConnectAccountLinkBody,
} from '../../sdk/admin/admin-stripe-connect';

const QUERY_KEY = ['stripe-connect'];

export function useStripeConnectStatus() {
  return useQuery<StripeConnectStatusResponse>({
    queryKey: QUERY_KEY,
    queryFn: () => sdk.admin.stripeConnect.getStatus(),
  });
}

export function useStripeConnectAccountLinkMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body?: StripeConnectAccountLinkBody) =>
      sdk.admin.stripeConnect.createAccountLink(body ?? {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useStripeConnectDeleteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => sdk.admin.stripeConnect.deleteAccount(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
