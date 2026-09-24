import type { AffiliateSource } from './affiliate-attribution';

export type PromotionCodeKind = '' | 'native_coupon' | 'nakama_manual';
export type PromotionChoice = '' | 'affiliate' | 'coupon';

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
  couponKind: PromotionCodeKind;
  promotionChoice: PromotionChoice;
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

  const couponCode = input.couponCode.trim().toUpperCase();
  const affiliateCode = input.affiliateCode.trim().toUpperCase();
  if (input.promotionChoice === 'coupon' && input.couponKind === 'nakama_manual' && couponCode) {
    params.set('nakama_code', couponCode);
  } else if (input.promotionChoice === 'affiliate' && affiliateCode) {
    params.set('affiliate_code', affiliateCode);
    params.set('affiliate_source', input.affiliateSource === 'referral' ? 'referral' : 'manual');
  } else if (input.promotionChoice === 'coupon' && input.couponKind === 'native_coupon' && couponCode) {
    params.set('coupon', couponCode);
  }

  return `https://nakamabordados.com/index.php?${params.toString()}`;
}
