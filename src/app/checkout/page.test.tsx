import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CheckoutPage from './page';

const router = { replace: vi.fn() };

vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
}));
vi.mock('@/lib/wp-sso', () => ({ seedWpSession: vi.fn(async () => true) }));
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: null, isLoading: false }),
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
  useCart: () => ({
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
    affiliateSource: '',
    promotionReady: true,
    applyAffiliateCode: vi.fn(async () => ({ success: false, message: 'Código no válido' })),
    removeAffiliateCode: vi.fn(),
    clearCart: vi.fn(),
  }),
}));

describe('Checkout abandoned-cart coupon disclosure', () => {
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
});
