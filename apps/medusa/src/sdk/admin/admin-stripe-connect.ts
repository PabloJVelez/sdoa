import type { Client } from '@medusajs/js-sdk';

export type StripeConnectStatus =
  | 'not_connected'
  | 'onboarding_incomplete'
  | 'pending_verification'
  | 'active';

export interface StripeConnectAccountDTO {
  id: string;
  stripe_account_id: string;
  details_submitted: boolean;
  charges_enabled: boolean;
}

export interface StripeConnectStripeAccountSnapshot {
  id: string;
  details_submitted: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  business_profile: { name?: string; url?: string } | null;
}

export interface StripeConnectStatusResponse {
  account: StripeConnectAccountDTO | null;
  stripe_account: StripeConnectStripeAccountSnapshot | null;
  status: StripeConnectStatus;
}

export interface StripeConnectAccountLinkBody {
  business_name?: string;
  email?: string;
  country?: string;
}

export class AdminStripeConnectResource {
  constructor(private client: Client) {}

  async getStatus() {
    return this.client.fetch<StripeConnectStatusResponse>(
      '/admin/stripe-connect',
      { method: 'GET' },
    );
  }

  async createAccountLink(body: StripeConnectAccountLinkBody = {}) {
    return this.client.fetch<{ url: string }>(
      '/admin/stripe-connect/account-link',
      { method: 'POST', body },
    );
  }

  async deleteAccount() {
    return this.client.fetch<{ deleted: boolean }>('/admin/stripe-connect', {
      method: 'DELETE',
    });
  }

  async createExpressLoginLink() {
    return this.client.fetch<{ url: string }>(
      '/admin/stripe-connect/express-login',
      { method: 'POST' },
    );
  }
}
