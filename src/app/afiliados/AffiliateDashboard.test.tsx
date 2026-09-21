import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AffiliateDashboard from './AffiliateDashboard';

const mocks = vi.hoisted(() => ({
  user: null as null | { id: string },
  authLoading: false,
  fetchMe: vi.fn(),
  fetchDashboard: vi.fn(),
  fetchSales: vi.fn(),
  upload: vi.fn(),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: mocks.user, isLoading: mocks.authLoading }),
}));
vi.mock('../context/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'es',
    t: (key: string) => ({
      'affiliates.title': 'Panel de Afiliados',
      'affiliates.login': 'Inicia sesión para ver tu panel de afiliado.',
      'affiliates.loginCta': 'Ir a Mi Cuenta',
      'affiliates.denied': 'Tu cuenta no tiene acceso al programa de afiliados.',
      'affiliates.fiscal.title': 'Constancia de Situación Fiscal',
      'affiliates.fiscal.missing': 'Sube tu constancia para habilitar la información financiera.',
      'affiliates.fiscal.pending': 'Tu constancia está en revisión.',
      'affiliates.fiscal.rejected': 'Tu constancia fue rechazada.',
      'affiliates.fiscal.approved': 'Constancia aprobada.',
      'affiliates.fiscal.label': 'Selecciona tu constancia en PDF',
      'affiliates.fiscal.upload': 'Enviar constancia',
      'affiliates.fiscal.uploading': 'Enviando…',
      'affiliates.summary.sales': 'Ventas válidas',
      'affiliates.summary.commission': 'Comisión acumulada',
      'affiliates.summary.label': 'Resumen financiero del mes',
      'affiliates.summary.salesCount': 'ventas',
      'affiliates.summary.adjustmentsCount': 'ajustes',
      'affiliates.summary.commissionRule': '10% sobre subtotal elegible antes del descuento',
      'affiliates.code': 'Tu código',
      'affiliates.link': 'Tu enlace',
      'affiliates.sales.title': 'Movimientos del periodo',
      'affiliates.sales.empty': 'Aún no hay ventas registradas.',
      'affiliates.sales.sale': 'Venta',
      'affiliates.sales.adjustment': 'Ajuste',
      'affiliates.sales.base': 'Base MXN',
      'affiliates.sales.commission': 'Comisión',
      'affiliates.retry': 'Reintentar',
      'affiliates.error': 'No pudimos cargar tu panel.',
      'affiliates.loading': 'Cargando panel de afiliados…',
      'affiliates.sessionExpired': 'Tu sesión terminó.',
    }[key] || key),
  }),
}));
vi.mock('@/lib/affiliates-api', () => ({
  fetchAffiliateMe: () => mocks.fetchMe(),
  fetchAffiliateDashboard: () => mocks.fetchDashboard(),
  fetchAffiliateSales: () => mocks.fetchSales(),
  uploadFiscalDocument: (file: File) => mocks.upload(file),
}));

describe('AffiliateDashboard', () => {
  beforeEach(() => {
    mocks.user = null;
    mocks.authLoading = false;
    mocks.fetchMe.mockReset();
    mocks.fetchDashboard.mockReset();
    mocks.fetchSales.mockReset();
    mocks.upload.mockReset();
  });

  it('asks visitors to sign in without requesting private data', () => {
    render(<AffiliateDashboard />);
    expect(screen.getByText('Inicia sesión para ver tu panel de afiliado.')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Ir a Mi Cuenta' })).toHaveAttribute('href', '/mi-cuenta?return=/afiliados/');
    expect(mocks.fetchMe).not.toHaveBeenCalled();
  });

  it('shows only the fiscal workflow while approval is pending', async () => {
    mocks.user = { id: 'affiliate-7' };
    mocks.fetchMe.mockResolvedValue({
      can: true,
      financialAccess: false,
      profile: { code: 'NICO', status: 'active', discountPercentage: 10, commissionPercentage: 10, referralUrl: 'https://nakamabordados.com/?ref=NICO' },
      fiscal: { required: true, status: 'pending', document: { id: 2, status: 'pending', fileName: 'constancia.pdf' } },
    });
    render(<AffiliateDashboard />);

    expect(await screen.findByText('Tu constancia está en revisión.')).toBeVisible();
    expect(screen.getByLabelText('Selecciona tu constancia en PDF')).toBeInTheDocument();
    expect(screen.queryByText('Ventas válidas')).not.toBeInTheDocument();
    expect(mocks.fetchDashboard).not.toHaveBeenCalled();
  });

  it('shows access denied without requesting financial data', async () => {
    mocks.user = { id: 'customer-8' };
    mocks.fetchMe.mockRejectedValue(new Error('ACCESS_DENIED'));
    render(<AffiliateDashboard />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Tu cuenta no tiene acceso al programa de afiliados.');
    expect(mocks.fetchDashboard).not.toHaveBeenCalled();
    expect(mocks.fetchSales).not.toHaveBeenCalled();
  });

  it('shows server-ledger sales and commission after fiscal approval without buyer PII', async () => {
    mocks.user = { id: 'affiliate-7' };
    mocks.fetchMe.mockResolvedValue({
      can: true,
      financialAccess: true,
      profile: { code: 'NICO', status: 'active', discountPercentage: 10, commissionPercentage: 10, referralUrl: 'https://nakamabordados.com/?ref=NICO' },
      fiscal: { required: true, status: 'approved', document: { id: 2, status: 'approved', fileName: 'constancia.pdf' } },
    });
    mocks.fetchDashboard.mockResolvedValue({
      success: true,
      period: '2026-09',
      code: 'NICO',
      referralUrl: 'https://nakamabordados.com/?ref=NICO',
      summary: { salesCount: 2, refundCount: 0, salesMxn: 10000, commissionMxn: 1000 },
    });
    mocks.fetchSales.mockResolvedValue({
      success: true,
      page: 1,
      hasMore: false,
      items: [{ id: 1, eventType: 'sale', orderId: 501, period: '2026-09', sourceCurrency: 'MXN', sourceBase: 10000, rateToMxn: 1, baseMxn: 10000, commissionMxn: 1000, status: 'posted', occurredAt: '2026-09-20 12:00:00' }],
    });
    render(<AffiliateDashboard />);

    expect(await screen.findByText('NICO')).toBeVisible();
    const summary = screen.getByRole('region', { name: 'Resumen financiero del mes' });
    expect(within(summary).getByText('$10,000.00')).toBeVisible();
    expect(within(summary).getByText('$1,000.00')).toBeVisible();
    expect(screen.getByText('#501')).toBeVisible();
    expect(screen.queryByText(/correo|dirección|cliente/i)).not.toBeInTheDocument();
  });

  it('uploads a selected PDF and refreshes fiscal state', async () => {
    mocks.user = { id: 'affiliate-7' };
    mocks.fetchMe
      .mockResolvedValueOnce({ can: true, financialAccess: false, profile: { code: 'NICO' }, fiscal: { required: true, status: 'missing', document: null } })
      .mockResolvedValueOnce({ can: true, financialAccess: false, profile: { code: 'NICO' }, fiscal: { required: true, status: 'pending', document: { id: 3, status: 'pending', fileName: 'constancia.pdf' } } });
    mocks.upload.mockResolvedValue({ success: true });
    render(<AffiliateDashboard />);

    const input = await screen.findByLabelText('Selecciona tu constancia en PDF');
    const file = new File(['%PDF-1.4'], 'constancia.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar constancia' }));

    await waitFor(() => expect(mocks.upload).toHaveBeenCalledWith(file));
    await waitFor(() => expect(mocks.fetchMe).toHaveBeenCalledTimes(2));
  });
});
