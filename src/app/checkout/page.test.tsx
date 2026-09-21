import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CheckoutPage from './page';

const router = { replace: vi.fn() };
const checkoutMocks = {
  user: null as null | { id: string },
  seedWpSession: vi.fn<() => Promise<boolean>>(),
  buildCheckoutBridgeUrl: vi.fn(() => 'https://nakamabordados.com/index.php?nk_bridge=1'),
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
  applyCoupon: vi.fn(async () => ({ success: false, message: 'Cupón inválido' })),
  removeCoupon: vi.fn(),
  affiliateCode: '',
  affiliateSource: '' as '' | 'manual' | 'referral',
  promotionReady: true,
  applyAffiliateCode: vi.fn(async () => ({ success: false, message: 'Código no válido' })),
  removeAffiliateCode: vi.fn(),
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
      'checkout.coupon.toggle': '¿Tienes otro código?',
      'checkout.coupon.abandoned_help': 'Usa el código que recibiste para recuperar tu carrito.',
      'checkout.coupon.label': 'Código de carrito abandonado',
      'checkout.coupon.placeholder': 'Escribe tu código',
      'checkout.coupon.apply': 'Aplicar',
      'checkout.affiliate.title': 'Código de afiliado',
      'checkout.affiliate.help': 'No se combina con otras promociones.',
      'checkout.affiliate.label': 'Escribe el código del afiliado',
    }[key] || key),
  }),
}));
vi.mock('../context/CartContext', () => ({
  useCart: () => cartContext,
}));

describe('Checkout abandoned-cart coupon disclosure', () => {
  beforeEach(() => {
    checkoutMocks.user = null;
    checkoutMocks.seedWpSession.mockReset().mockImplementation(() => new Promise(() => {}));
    checkoutMocks.buildCheckoutBridgeUrl.mockClear();
    cartContext.couponCode = '';
    cartContext.affiliateCode = '';
    cartContext.affiliateSource = '';
  });

  it('keeps the manual field collapsed and explains its single purpose', () => {
    render(<CheckoutPage />);

    const disclosure = screen.getByText('¿Tienes otro código?');
    expect(disclosure.closest('details')).not.toHaveAttribute('open');
    expect(screen.getByLabelText('Código de carrito abandonado')).toBeInTheDocument();
    expect(screen.getByText(/código que recibiste para recuperar tu carrito/i)).toBeInTheDocument();
  });

  it('keeps affiliate codes separate from abandoned-cart coupons', () => {
    render(<CheckoutPage />);
    expect(screen.getByLabelText('Escribe el código del afiliado')).toBeInTheDocument();
    expect(screen.getByText('No se combina con otras promociones.')).toBeVisible();
  });

  it('forwards only code and source when preparing an affiliate checkout', async () => {
    checkoutMocks.user = { id: 'customer-1' };
    cartContext.couponCode = 'RECUPERA20';
    cartContext.affiliateCode = 'NICO';
    cartContext.affiliateSource = 'manual';
    render(<CheckoutPage />);

    await waitFor(() => expect(checkoutMocks.buildCheckoutBridgeUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        couponCode: 'RECUPERA20',
        affiliateCode: 'NICO',
        affiliateSource: 'manual',
      }),
    ));
  });
});
