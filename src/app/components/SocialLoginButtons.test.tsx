import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SocialLoginButtons from './SocialLoginButtons';

vi.mock('../../lib/social-login', () => ({
  socialLoginUrl: (provider: string, backPath: string) => `https://example.test/${provider}?back=${encodeURIComponent(backPath)}`,
}));

describe('SocialLoginButtons', () => {
  it('keeps action text at 16px and metadata at 14px minimum', () => {
    render(<SocialLoginButtons backPath="/mi-cuenta/" note="Volverás al terminar." />);

    expect(screen.getByRole('link', { name: 'Continuar con Google' })).toHaveStyle({ fontSize: '1rem' });
    expect(screen.getByText('o continúa con').parentElement).toHaveStyle({
      color: 'var(--nk-text-sec)',
      fontSize: '0.875rem',
    });
    expect(screen.getByText('Volverás al terminar.')).toHaveStyle({
      color: 'var(--nk-text-sec)',
      fontSize: '0.875rem',
    });
  });
});
