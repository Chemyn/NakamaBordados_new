import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AffiliateCodeField from './AffiliateCodeField';

const mocks = {
  affiliateCode: '',
  affiliateSource: '' as '' | 'manual' | 'referral',
  applyAffiliateCode: vi.fn(),
  removeAffiliateCode: vi.fn(),
};

vi.mock('../context/CartContext', () => ({ useCart: () => mocks }));
vi.mock('../context/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => ({
      'checkout.affiliate.title': 'Código de afiliado',
      'checkout.affiliate.help': 'Si agregas otro código, podrás elegir cuál usar.',
      'checkout.affiliate.label': 'Escribe el código del afiliado',
      'checkout.affiliate.placeholder': 'Ej. NICO',
      'checkout.affiliate.apply': 'Aplicar código',
      'checkout.affiliate.validating': 'Validando…',
      'checkout.affiliate.empty': 'Escribe un código.',
      'checkout.affiliate.invalid': 'Código no válido.',
      'checkout.affiliate.remove': 'Quitar código de afiliado',
      'checkout.affiliate.referral': 'Referencia guardada',
    }[key] || key),
  }),
}));

describe('AffiliateCodeField', () => {
  beforeEach(() => {
    mocks.affiliateCode = '';
    mocks.affiliateSource = '';
    mocks.applyAffiliateCode.mockReset().mockResolvedValue({ success: true });
    mocks.removeAffiliateCode.mockReset();
  });

  it('submits a manual code with accessible non-combination guidance', async () => {
    const user = userEvent.setup();
    render(<AffiliateCodeField />);

    expect(screen.getByText('Si agregas otro código, podrás elegir cuál usar.')).toBeVisible();
    await user.type(screen.getByLabelText('Escribe el código del afiliado'), ' nico ');
    await user.click(screen.getByRole('button', { name: 'Aplicar código' }));

    expect(mocks.applyAffiliateCode).toHaveBeenCalledWith(' nico ', 'manual');
  });

  it('shows and removes an active referral without exposing a percentage as trusted input', async () => {
    mocks.affiliateCode = 'NICO';
    mocks.affiliateSource = 'referral';
    const user = userEvent.setup();
    render(<AffiliateCodeField />);

    expect(screen.getByRole('status')).toHaveTextContent('NICO');
    expect(screen.getByRole('status')).toHaveTextContent('Referencia guardada');
    await user.click(screen.getByRole('button', { name: 'Quitar código de afiliado' }));
    expect(mocks.removeAffiliateCode).toHaveBeenCalledOnce();
  });
});

