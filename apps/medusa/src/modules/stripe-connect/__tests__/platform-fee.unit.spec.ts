import { isTicket, calculatePlatformFeeFromLines } from '../utils/platform-fee';
import type { PlatformFeeLineItem, PlatformFeeMode, StripeConnectConfig } from '../types';

const baseConfig: StripeConnectConfig = {
  apiKey: 'sk_test',
  connectedAccountId: '',
  feePercent: 5,
  refundApplicationFee: false,
  automaticPaymentMethods: true,
  captureMethod: 'automatic',
  feePerUnitBased: true,
  feeModeTickets: 'percent',
  feeModeBento: 'percent',
  feePerTicketCents: 0,
  feePerBoxCents: 0,
  feePercentTickets: 5,
  feePercentBento: 5,
};

describe('isTicket', () => {
  it('returns true for SKU starting with EVENT-', () => {
    expect(isTicket('EVENT-123')).toBe(true);
    expect(isTicket('EVENT-abc-2026-01-01-plated_dinner')).toBe(true);
  });

  it('returns false for other SKUs', () => {
    expect(isTicket('BENTO-SALMON-SINGLE')).toBe(false);
    expect(isTicket('')).toBe(false);
    expect(isTicket('EVENT')).toBe(false);
  });
});

describe('calculatePlatformFeeFromLines', () => {
  it('returns 0 for empty lines', () => {
    expect(calculatePlatformFeeFromLines([], baseConfig)).toBe(0);
  });

  it('computes percent fee for ticket-only cart', () => {
    const lines: PlatformFeeLineItem[] = [
      { sku: 'EVENT-1', quantity: 2, unit_price_cents: 10000 },
    ];
    const config: StripeConnectConfig = { ...baseConfig, feeModeTickets: 'percent' as PlatformFeeMode, feePercentTickets: 10 };
    expect(calculatePlatformFeeFromLines(lines, config)).toBe(2000); // 10% of 20000
  });

  it('computes per_unit fee for ticket-only cart', () => {
    const lines: PlatformFeeLineItem[] = [
      { sku: 'EVENT-1', quantity: 3, unit_price_cents: 10000 },
    ];
    const config: StripeConnectConfig = {
      ...baseConfig,
      feeModeTickets: 'per_unit' as PlatformFeeMode,
      feePerTicketCents: 100,
    };
    expect(calculatePlatformFeeFromLines(lines, config)).toBe(300); // 100 * 3
  });

  it('computes percent fee for bento-only cart', () => {
    const lines: PlatformFeeLineItem[] = [
      { sku: 'BENTO-SALMON', quantity: 1, unit_price_cents: 2200 },
    ];
    const config: StripeConnectConfig = { ...baseConfig, feeModeBento: 'percent' as PlatformFeeMode, feePercentBento: 5 };
    expect(calculatePlatformFeeFromLines(lines, config)).toBe(110); // 5% of 2200
  });

  it('computes per_unit fee for bento-only cart', () => {
    const lines: PlatformFeeLineItem[] = [
      { sku: 'BENTO-OMAKASE', quantity: 2, unit_price_cents: 3000 },
    ];
    const config: StripeConnectConfig = {
      ...baseConfig,
      feeModeBento: 'per_unit' as PlatformFeeMode,
      feePerBoxCents: 50,
    };
    expect(calculatePlatformFeeFromLines(lines, config)).toBe(100); // 50 * 2
  });

  it('computes mixed cart: tickets per_unit + bento percent', () => {
    const lines: PlatformFeeLineItem[] = [
      { sku: 'EVENT-1', quantity: 2, unit_price_cents: 10000 },
      { sku: 'BENTO-A', quantity: 1, unit_price_cents: 2000 },
    ];
    const config: StripeConnectConfig = {
      ...baseConfig,
      feeModeTickets: 'per_unit' as PlatformFeeMode,
      feePerTicketCents: 75,
      feeModeBento: 'percent' as PlatformFeeMode,
      feePercentBento: 10,
    };
    expect(calculatePlatformFeeFromLines(lines, config)).toBe(350); // 75*2 + 10% of 2000
  });
});
