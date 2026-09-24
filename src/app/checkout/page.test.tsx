import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CheckoutPage from './page';

const router = { replace: vi.fn() };
const checkoutMocks = {
  user: null as null | { id: string },
  seedWpSession: vi.fn<() => Promise<boolean>>(),
  buildCheckoutBridgeUrl: vi.fn<(input: unknown) => string>(() => 'https://nakamabordados.com/index.php?nk_bridge=1'),
};
const cartContext = {
  cart: [{
    product: { id: 'p1', databaseId: 10, name: 'Gorra', price: 300, images: ['/gorra.jpg'] },
    variation: null,
    quantity: 1,
  }],
  quoteItems: [],
  subtotal: 300,
  shipping: 150,
  discount: 0,
  total: 450,
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
  clearCart: vi.fn(),
};

vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
}));
vi.mock('@/lib/wp-sso', () => ({ seedWpSession: () => checkoutMocks.seedWpSession() }));
vi.mock('@/lib/checkout-bridge', () => ({
  buildCheckoutBridgeUrl: (input: unknown) => checkoutMocks.buildCheckoutBridgeUrl(input),
}));
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: checkoutMocks.user, isLoading: false }),
}));
vi.mock('../context/CurrencyContext', () => ({
  useCurrency: () => ({
    formatPrice: (value: number) => `$${value}`,
    currencyInfo: { currency: 'MXN' },
  }),
}));
vi.mock('../context/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => ({
      'checkout.coupon.toggle': '¿Tienes un código?',
      'checkout.coupon.help': 'Escribe una promoción, cupón o código de afiliado.',
      'checkout.coupon.label': 'Código de descuento o afiliado',
      'checkout.coupon.placeholder': 'Escribe tu código',
      'checkout.coupon.apply': 'Aplicar',
    }[key] || key),
  }),
}));
vi.mock('../context/CartContext', () => ({
  useCart: () => cartContext,
}));

describe('Checkout promotional-code disclosure', () => {
  beforeEach(() => {
    checkoutMocks.user = null;
    checkoutMocks.seedWpSession.mockReset().mockImplementation(() => new Promise(() => {}));
    checkoutMocks.buildCheckoutBridgeUrl.mockClear();
    cartContext.couponCode = '';
    cartContext.couponKind = '';
    cartContext.promotionChoice = '';
    cartContext.affiliateCode = '';
    cartContext.affiliateSource = '';
  });

  it('keeps the manual field collapsed and explains its accepted codes', () => {
    render(<CheckoutPage />);

    const disclosure = screen.getByText('¿Tienes un código?');
    expect(disclosure.closest('details')).not.toHaveAttribute('open');
    expect(screen.getByLabelText('Código de descuento o afiliado')).toBeInTheDocument();
    expect(screen.getByText(/promoción, cupón o código de afiliado/i)).toBeInTheDocument();
  });

  it('uses one field for promotional and affiliate codes', () => {
    render(<CheckoutPage />);
    expect(screen.getByLabelText('Código de descuento o afiliado')).toBeInTheDocument();
    expect(screen.queryByLabelText('Escribe el código del afiliado')).not.toBeInTheDocument();
  });

  it('forwards only code and source when preparing an affiliate checkout', async () => {
    checkoutMocks.user = { id: 'customer-1' };
    cartContext.couponCode = 'RECUPERA20';
    cartContext.couponKind = 'native_coupon';
    cartContext.affiliateCode = 'NICO';
    cartContext.affiliateSource = 'manual';
    cartContext.promotionChoice = 'affiliate';
    render(<CheckoutPage />);

    await waitFor(() => expect(checkoutMocks.buildCheckoutBridgeUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        couponCode: 'RECUPERA20',
        couponKind: 'native_coupon',
        promotionChoice: 'affiliate',
        affiliateCode: 'NICO',
        affiliateSource: 'manual',
      }),
    ));
  });
});
