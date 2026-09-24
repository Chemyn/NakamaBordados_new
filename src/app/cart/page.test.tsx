import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CartPage from './page';

const router = { push: vi.fn() };
const cartContext = {
  cart: [],
  quoteItems: [{ orderId: 116015, orderKey: 'wc_order_quote', folio: 'NK-110', totalMXN: 1150 }],
  removeQuoteFromCart: vi.fn(),
  subtotal: 1150,
  shipping: 150,
  discount: 0,
  total: 1300,
  removeFromCart: vi.fn(),
  updateQuantity: vi.fn(),
  couponCode: '',
  couponKind: '' as '' | 'native_coupon' | 'nakama_manual',
  promotionChoice: '' as '' | 'affiliate' | 'coupon',
  applyCoupon: vi.fn(async () => ({ success: false, message: 'Cupón inválido' })),
  applyCheckoutCode: vi.fn(async () => ({ success: false, message: 'Código no válido' })),
  removeCoupon: vi.fn(),
  affiliateCode: '',
  affiliateSource: '' as '' | 'manual' | 'referral',
  promotionReady: true,
  applyAffiliateCode: vi.fn(async () => ({ success: false, message: 'Código no válido' })),
  removeAffiliateCode: vi.fn(),
  selectPromotion: vi.fn(),
};

vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/lib/wp-sso', () => ({ seedWpSession: vi.fn(async () => true) }));
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'customer-1' }, isLoading: false }),
}));
vi.mock('../context/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => ({
      'checkout.coupon.toggle': '¿Tienes un código?',
      'checkout.coupon.help': 'Escribe una promoción, cupón o código de afiliado.',
      'checkout.coupon.label': 'Código de descuento o afiliado',
    }[key] || key),
  }),
}));
vi.mock('../context/CurrencyContext', () => ({
  useCurrency: () => ({
    formatPrice: (value: number) => `$${value}`,
    formatQuotePrice: (value: number) => `$${value}`,
    currencyInfo: { currency: 'MXN' },
  }),
}));
vi.mock('../context/CartContext', () => ({
  getVariationAttr: vi.fn(),
  useCart: () => cartContext,
}));

describe('CartPage quote checkout recovery', () => {
  beforeEach(() => {
    router.push.mockReset();
    cartContext.couponCode = '';
    cartContext.couponKind = '';
    cartContext.promotionChoice = '';
    cartContext.affiliateCode = '';
    cartContext.affiliateSource = '';
    window.history.replaceState(null, '', '/cart/?quote_error=unavailable');
  });

  it('explains that checkout stopped before charging an incomplete cart', async () => {
    render(<CartPage />);

    const alert = await screen.findByRole('alert');

    expect(alert).toHaveTextContent(
      /no pudimos preparar una de tus cotizaciones/i,
    );
    expect(alert).toHaveTextContent(
      /no se realizó ningún cobro/i,
    );
  });

  it('offers the promotional-code field before leaving for WooCommerce', () => {
    render(<CartPage />);

    const disclosure = screen.getByText('¿Tienes un código?');
    expect(disclosure.closest('details')).not.toHaveAttribute('open');
    expect(screen.getByLabelText('Código de descuento o afiliado')).toBeInTheDocument();
  });

  it('uses one field for promotional and affiliate codes before checkout', () => {
    render(<CartPage />);
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    expect(screen.queryByLabelText('Escribe el código del afiliado')).not.toBeInTheDocument();
  });

  it('passes affiliate attribution to the bridge and omits the native coupon', () => {
    cartContext.couponCode = 'RECUPERA20';
    cartContext.couponKind = 'native_coupon';
    cartContext.affiliateCode = 'NICO';
    cartContext.affiliateSource = 'referral';
    cartContext.promotionChoice = 'affiliate';
    render(<CartPage />);

    const link = document.querySelector<HTMLAnchorElement>('a[href*="nk_bridge"]');
    expect(link).not.toBeNull();
    const url = new URL(link!.href);
    expect(url.searchParams.get('affiliate_code')).toBe('NICO');
    expect(url.searchParams.get('affiliate_source')).toBe('referral');
    expect(url.searchParams.has('coupon')).toBe(false);
  });
});
