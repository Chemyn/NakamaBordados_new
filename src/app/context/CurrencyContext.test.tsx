import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CurrencyProvider, useCurrency } from './CurrencyContext';

vi.mock('@/lib/api-host', () => ({ apiOrigin: () => 'https://shop.test' }));

function CurrencyProbe() {
  const { currencyInfo, currencySelection, rateStatus, setCurrencyManual } = useCurrency();
  return (
    <>
      <button type="button" onClick={() => void setCurrencyManual('USD')}>Elegir USD</button>
      <span data-testid="selection">{currencySelection}</span>
      <span data-testid="active-currency">{currencyInfo.currency}</span>
      <span data-testid="rate-status">{rateStatus}</span>
    </>
  );
}

describe('CurrencyProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
  });

  it('keeps the USD preference visible without applying an unsafe conversion when providers fail', async () => {
    render(<CurrencyProvider><CurrencyProbe /></CurrencyProvider>);

    fireEvent.click(screen.getByRole('button', { name: 'Elegir USD' }));

    await waitFor(() => expect(screen.getByTestId('rate-status')).toHaveTextContent('unavailable'));
    expect(screen.getByTestId('selection')).toHaveTextContent('USD');
    expect(screen.getByTestId('active-currency')).toHaveTextContent('MXN');
    expect(localStorage.getItem('user-currency-selection')).toBe('USD');
  });
});
