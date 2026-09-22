import type { ComponentProps } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PedidoConfirmadoPage from './page';

const mocks = vi.hoisted(() => ({
  clearCart: vi.fn(),
  fbq: vi.fn(),
}));

vi.mock('../context/CartContext', () => ({
  useCart: () => ({ clearCart: mocks.clearCart }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: ComponentProps<'a'>) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const transferConfirmation = {
  orderNumber: '115',
  status: 'on-hold',
  isPaid: false,
  total: '610.41',
  currency: 'MXN',
  dateCreated: '2026-09-09T12:00:00+00:00',
  paymentMethod: 'bacs',
  paymentTitle: 'Transferencia bancaria',
  firstName: 'Samantha',
  transferInstructions: 'Incluye tu número de pedido como referencia.',
  bankAccounts: [{
    accountName: 'Nakama Bordados',
    bankName: 'Banco de prueba',
    accountNumber: '1234567890',
    iban: '',
    bic: '',
    sortCode: '',
  }],
};

describe('PedidoConfirmadoPage', () => {
  beforeEach(() => {
    mocks.clearCart.mockReset();
    mocks.fbq.mockReset();
    window.fbq = mocks.fbq;
    window.localStorage.clear();
    window.history.replaceState({}, '', '/pedido-confirmado/order-received/#order=115&key=wc_order_secret');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => transferConfirmation,
    }));
  });

  it('shows the branded transfer confirmation and clears the completed cart', async () => {
    render(<PedidoConfirmadoPage />);

    expect(await screen.findByRole('heading', { name: /tu pedido ya está en marcha/i })).toBeInTheDocument();
    expect(screen.getByText('Pedido #115')).toBeInTheDocument();
    expect(screen.getByText('Pago pendiente de confirmación')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /completa tu transferencia/i })).toBeInTheDocument();
    expect(screen.getByText('Banco de prueba')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ver seguimiento en mi cuenta/i })).toHaveAttribute('href', '/mi-cuenta/');
    expect(screen.getByRole('link', { name: /enviar comprobante por whatsapp/i })).toHaveAttribute('href', expect.stringContaining('wa.me'));
    await waitFor(() => expect(mocks.clearCart).toHaveBeenCalledTimes(1));
  });

  it('sends the validated order as the Meta Purchase standard event', async () => {
    render(<PedidoConfirmadoPage />);

    expect(await screen.findByRole('heading', { name: /tu pedido ya está en marcha/i })).toBeInTheDocument();
    await waitFor(() => expect(mocks.fbq).toHaveBeenCalledWith(
      'track',
      'Purchase',
      {
        value: 610.41,
        currency: 'MXN',
        order_id: '115',
      },
      { eventID: 'nakama-purchase-115' },
    ));
  });

  it('sends Purchase when Pixel becomes ready after the order confirmation', async () => {
    delete window.fbq;
    render(<PedidoConfirmadoPage />);

    expect(await screen.findByRole('heading', { name: /tu pedido ya está en marcha/i })).toBeInTheDocument();
    expect(mocks.fbq).not.toHaveBeenCalled();

    window.fbq = mocks.fbq;
    window.dispatchEvent(new Event('nakama:analytics-ready'));

    await waitFor(() => expect(mocks.fbq).toHaveBeenCalledWith(
      'track',
      'Purchase',
      expect.objectContaining({ order_id: '115' }),
      { eventID: 'nakama-purchase-115' },
    ));
  });

  it('does not count the same order twice when the confirmation is reopened', async () => {
    const firstView = render(<PedidoConfirmadoPage />);

    expect(await screen.findByRole('heading', { name: /tu pedido ya está en marcha/i })).toBeInTheDocument();
    await waitFor(() => expect(mocks.fbq).toHaveBeenCalledTimes(1));
    firstView.unmount();

    render(<PedidoConfirmadoPage />);
    expect(await screen.findByRole('heading', { name: /tu pedido ya está en marcha/i })).toBeInTheDocument();

    await waitFor(() => expect(mocks.fbq).toHaveBeenCalledTimes(1));
  });

  it('does not reveal order information when the confirmation cannot be validated', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'No pudimos validar este pedido.' }),
    }));

    render(<PedidoConfirmadoPage />);

    expect(await screen.findByRole('heading', { name: /no pudimos mostrar tu pedido/i })).toBeInTheDocument();
    expect(screen.queryByText('Banco de prueba')).not.toBeInTheDocument();
    expect(mocks.clearCart).not.toHaveBeenCalled();
    expect(mocks.fbq).not.toHaveBeenCalledWith('track', 'Purchase', expect.anything(), expect.anything());
  });
});
