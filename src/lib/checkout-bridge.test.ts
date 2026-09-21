import { describe, expect, it } from 'vitest';
import { buildCheckoutBridgeUrl } from './checkout-bridge';

describe('checkout bridge URL', () => {
  it('sends only the affiliate code and source when affiliate attribution is active', () => {
    const result = buildCheckoutBridgeUrl({
      items: [{ id: 25, quantity: 2 }],
      quotes: [{ orderId: 81, orderKey: 'wc key&secret' }],
      currency: 'MXN',
      couponCode: 'RECUPERA20',
      affiliateCode: 'NICO',
      affiliateSource: 'referral',
    });
    const url = new URL(result);

    expect(url.searchParams.get('affiliate_code')).toBe('NICO');
    expect(url.searchParams.get('affiliate_source')).toBe('referral');
    expect(url.searchParams.has('coupon')).toBe(false);
    expect(url.searchParams.has('affiliate_id')).toBe(false);
    expect(url.searchParams.has('discount_percentage')).toBe(false);
    expect(url.searchParams.get('quotes')).toBe('81:wc key&secret');
  });

  it('keeps the native coupon flow when no affiliate code is active', () => {
    const result = buildCheckoutBridgeUrl({
      items: [],
      quotes: [{ orderId: 81, orderKey: 'wc_order_quote' }],
      currency: 'USD',
      couponCode: 'RECUPERA20',
      affiliateCode: '',
      affiliateSource: '',
    });
    const url = new URL(result);

    expect(url.searchParams.get('coupon')).toBe('RECUPERA20');
    expect(url.searchParams.has('affiliate_code')).toBe(false);
  });
});
