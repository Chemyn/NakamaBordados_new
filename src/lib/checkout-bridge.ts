import type { AffiliateSource } from './affiliate-attribution';

type CheckoutBridgeItem = {
  id: string | number;
  quantity: number;
};

type CheckoutBridgeQuote = {
  orderId: number;
  orderKey: string;
};

type CheckoutBridgeInput = {
  items: CheckoutBridgeItem[];
  quotes: CheckoutBridgeQuote[];
  currency: string;
  couponCode: string;
  affiliateCode: string;
  affiliateSource: AffiliateSource | '';
};

export function buildCheckoutBridgeUrl(input: CheckoutBridgeInput): string {
  const params = new URLSearchParams({ nk_bridge: '1' });
  const items = input.items
    .filter(item => String(item.id).trim() && item.quantity > 0)
    .map(item => `${item.id}:${item.quantity}`)
    .join(',');
  const quotes = input.quotes
    .filter(quote => quote.orderId > 0 && quote.orderKey.trim())
    .map(quote => `${quote.orderId}:${quote.orderKey}`)
    .join(',');

  if (items) params.set('items', items);
  if (quotes) params.set('quotes', quotes);
  params.set('currency', input.currency.toUpperCase());

  const affiliateCode = input.affiliateCode.trim().toUpperCase();
  if (affiliateCode) {
    params.set('affiliate_code', affiliateCode);
    params.set('affiliate_source', input.affiliateSource === 'referral' ? 'referral' : 'manual');
  } else if (input.couponCode.trim()) {
    params.set('coupon', input.couponCode.trim().toUpperCase());
  }

  return `https://nakamabordados.com/index.php?${params.toString()}`;
}
