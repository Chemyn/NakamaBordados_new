import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AbandonedCartCoupon from './AbandonedCartCoupon';

const mocks = {
  couponCode: '',
  couponKind: '' as '' | 'native_coupon' | 'nakama_manual',
  affiliateCode: '',
  affiliateSource: '' as '' | 'manual' | 'referral',
  promotionChoice: '' as '' | 'affiliate' | 'coupon',
  applyCoupon: vi.fn(),
  removeCoupon: vi.fn(),
  selectPromotion: vi.fn(),
};

vi.mock('../context/CartContext', () => ({ useCart: () => mocks }));
vi.mock('../context/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => ({
      'checkout.coupon.toggle': '¿Tienes otro código?',
      'checkout.coupon.help': 'Escribe un código manual de Nakama o el cupón que recibiste para recuperar tu carrito.',
      'checkout.coupon.label': 'Código promocional',
      'checkout.coupon.placeholder': 'Ej. NAKAMA15',
      'checkout.coupon.empty': 'Escribe un código promocional.',
      'checkout.coupon.invalid': 'El código no es válido.',
      'checkout.coupon.validating': 'Validando…',
      'checkout.coupon.apply': 'Aplicar código',
      'checkout.coupon.remove': 'Quitar código promocional',
      'checkout.coupon.manual_success': 'Código reconocido. En el checkout podrás comparar las promociones disponibles.',
      'checkout.coupon.native_success': 'Cupón aplicado. WooCommerce confirmará el descuento antes del pago.',
      'checkout.promotion_choice.title': 'Elige qué promoción usar',
      'checkout.promotion_choice.help': 'Solo se aplicará una promoción.',
      'checkout.promotion_choice.affiliate': 'Código de afiliado',
      'checkout.promotion_choice.coupon': 'Código promocional',
    }[key] || key),
  }),
}));

describe('AbandonedCartCoupon', () => {
  beforeEach(() => {
    mocks.couponCode = '';
    mocks.couponKind = '';
    mocks.affiliateCode = '';
    mocks.affiliateSource = '';
    mocks.promotionChoice = '';
    mocks.applyCoupon.mockReset().mockResolvedValue({ success: true, kind: 'nakama_manual' });
    mocks.removeCoupon.mockReset();
    mocks.selectPromotion.mockReset();
  });

  it('uses one accessible field for manual Nakama codes and recovery coupons', async () => {
    const user = userEvent.setup();
    render(<AbandonedCartCoupon />);

    await user.click(screen.getByText('¿Tienes otro código?'));
    expect(screen.getByLabelText('Código promocional')).toBeInTheDocument();
    expect(screen.getByText(/código manual de Nakama o el cupón/i)).toBeVisible();
  });

  it('focuses the required field when applying an empty value', async () => {
    const user = userEvent.setup();
    render(<AbandonedCartCoupon />);

    await user.click(screen.getByRole('button', { name: 'Aplicar código' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Escribe un código promocional.');
    expect(screen.getByLabelText('Código promocional')).toHaveFocus();
    expect(mocks.applyCoupon).not.toHaveBeenCalled();
  });

  it('explains and removes an active manual Nakama code', async () => {
    mocks.couponCode = 'MANUAL15';
    mocks.couponKind = 'nakama_manual';
    const user = userEvent.setup();
    render(<AbandonedCartCoupon />);

    expect(screen.getByRole('status')).toHaveTextContent('MANUAL15');
    expect(screen.getByRole('status')).toHaveTextContent(/comparar las promociones disponibles/i);
    await user.click(screen.getByRole('button', { name: 'Quitar código promocional' }));
    expect(mocks.removeCoupon).toHaveBeenCalledOnce();
  });

  it('lets the customer choose between an active affiliate and a newly entered code', async () => {
    mocks.couponCode = 'MANUAL15';
    mocks.couponKind = 'nakama_manual';
    mocks.affiliateCode = 'NICO';
    mocks.affiliateSource = 'manual';
    mocks.promotionChoice = 'affiliate';
    const user = userEvent.setup();
    render(<AbandonedCartCoupon />);

    const choices = screen.getByRole('group', { name: 'Elige qué promoción usar' });
    expect(choices).toHaveTextContent('NICO');
    expect(choices).toHaveTextContent('MANUAL15');
    expect(screen.getByRole('radio', { name: /Código de afiliado NICO/i })).toBeChecked();

    await user.click(screen.getByRole('radio', { name: /Código promocional MANUAL15/i }));
    expect(mocks.selectPromotion).toHaveBeenCalledWith('coupon');
  });
});
