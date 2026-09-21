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
  fetchPayments: vi.fn(),
  fetchProducts: vi.fn(),
  fetchProductRequest: vi.fn(),
  fetchEvidence: vi.fn(),
  submitProductRequest: vi.fn(),
  submitEvidence: vi.fn(),
  downloadReceipt: vi.fn(),
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
      'affiliates.history.title': 'Cierres y pagos',
      'affiliates.history.kicker': 'Historial mensual',
      'affiliates.history.period': 'Periodo',
      'affiliates.history.empty': 'Aún no hay cierres mensuales.',
      'affiliates.history.sales': 'Ventas del periodo',
      'affiliates.history.refunds': 'Devoluciones',
      'affiliates.history.ledgerAdjustments': 'Ajustes de ventas',
      'affiliates.history.gross': 'Comisión bruta',
      'affiliates.history.isr': 'ISR retenido (capturado por administración)',
      'affiliates.history.iva': 'IVA retenido (capturado por administración)',
      'affiliates.history.adjustments': 'Otros ajustes (capturados por administración)',
      'affiliates.history.net': 'Neto del periodo',
      'affiliates.history.paid': 'Pagado',
      'affiliates.history.approved': 'Pago pendiente',
      'affiliates.history.closed': 'Cierre en revisión',
      'affiliates.history.draft': 'Cierre en proceso',
      'affiliates.history.receipt': 'Descargar comprobante',
      'affiliates.history.receiptDownloading': 'Preparando comprobante…',
      'affiliates.history.receiptError': 'No pudimos descargar tu comprobante.',
      'affiliates.history.reversed': 'Pago revertido',
      'affiliates.history.carry': 'Las devoluciones posteriores a un cierre se descuentan en el siguiente mes abierto; el cierre anterior no se modifica.',
      'affiliates.history.manual': 'Estos importes fueron capturados por administración siguiendo las indicaciones del contador; no son un cálculo fiscal automático.',
      'affiliates.retry': 'Reintentar',
      'affiliates.error': 'No pudimos cargar tu panel.',
      'affiliates.loading': 'Cargando panel de afiliados…',
      'affiliates.sessionExpired': 'Tu sesión terminó.',
      'affiliates.mission.label': 'Centro de misión mensual',
      'affiliates.mission.kicker': 'Programa mensual',
      'affiliates.mission.title': 'Manga impacto',
      'affiliates.mission.intro': 'Convierte tu alcance en recompensas.',
      'affiliates.mission.loading': 'Cargando misión…',
      'affiliates.mission.loadError': 'No pudimos cargar la misión mensual.',
      'affiliates.mission.progressKicker': 'Meta del próximo mes',
      'affiliates.mission.progressTitle': 'Tu impacto mensual',
      'affiliates.mission.currentReward': 'Recompensa actual',
      'affiliates.mission.oneProduct': '1 prenda',
      'affiliates.mission.manyProducts': '{count} prendas',
      'affiliates.mission.remaining': 'Te faltan {amount} para desbloquear {count} prendas.',
      'affiliates.mission.maxReached': 'Meta máxima alcanzada.',
      'affiliates.mission.noCarry': 'El cupo se recalcula cada mes y no se acumula.',
      'affiliates.mission.milestones': 'Metas de prendas del mes',
      'affiliates.mission.productKicker': 'Recompensa mensual',
      'affiliates.mission.productTitle': 'Elige tu prenda',
      'affiliates.mission.unit': 'unidad disponible',
      'affiliates.mission.units': 'unidades disponibles',
      'affiliates.mission.standardCatalog': 'Drops y Edición especial están excluidos de esta selección.',
      'affiliates.mission.noPriceLimit': 'Sin límite de precio dentro del catálogo elegible.',
      'affiliates.mission.selected': 'seleccionadas',
      'affiliates.mission.productsEmpty': 'No hay productos disponibles.',
      'affiliates.mission.addressTitle': 'Dirección confirmada',
      'affiliates.mission.shippingCovered': 'Nakama cubre el costo del envío.',
      'affiliates.mission.addressConfirm': 'Confirmo que esta dirección es correcta.',
      'affiliates.mission.sendRequest': 'Enviar solicitud',
      'affiliates.mission.sending': 'Enviando…',
    }[key] || key),
  }),
}));
vi.mock('@/lib/affiliates-api', () => ({
  fetchAffiliateMe: () => mocks.fetchMe(),
  fetchAffiliateDashboard: () => mocks.fetchDashboard(),
  fetchAffiliateSales: () => mocks.fetchSales(),
  fetchAffiliatePayments: () => mocks.fetchPayments(),
  fetchAffiliateProducts: () => mocks.fetchProducts(),
  fetchAffiliateProductRequest: () => mocks.fetchProductRequest(),
  fetchAffiliateEvidence: (id: number) => mocks.fetchEvidence(id),
  submitAffiliateProductRequest: (input: unknown) => mocks.submitProductRequest(input),
  submitAffiliateEvidence: (input: unknown) => mocks.submitEvidence(input),
  downloadAffiliateReceipt: (id: number) => mocks.downloadReceipt(id),
  uploadFiscalDocument: (file: File) => mocks.upload(file),
}));

describe('AffiliateDashboard', () => {
  beforeEach(() => {
    mocks.user = null;
    mocks.authLoading = false;
    mocks.fetchMe.mockReset();
    mocks.fetchDashboard.mockReset();
    mocks.fetchSales.mockReset();
    mocks.fetchPayments.mockReset().mockResolvedValue({ success: true, page: 1, hasMore: false, items: [] });
    mocks.fetchProducts.mockReset().mockResolvedValue({ success: true, page: 1, pages: 1, total: 0, hasMore: false, items: [] });
    mocks.fetchProductRequest.mockReset().mockResolvedValue({ success: true, period: '2026-10', benefit: { id: 1, period: '2026-10', sourcePeriod: '2026-09', sourceClosureId: 1, validSalesMxn: 0, tier: 1, quota: 1, isDefault: false }, request: null, shippingCovered: true, officialAccounts: ['@nakamabordados'] });
    mocks.fetchEvidence.mockReset().mockResolvedValue({ success: true, items: [], requiredComplete: false, bonusPriorityPotential: true, bonusGuarantee: false });
    mocks.submitProductRequest.mockReset();
    mocks.submitEvidence.mockReset();
    mocks.downloadReceipt.mockReset().mockResolvedValue(undefined);
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
      progress: {
        salesMxn: 10000, tier: 2, quota: 2,
        next: { thresholdMxn: 30000, remainingMxn: 20000, rewardQuota: 3 },
        milestones: {
          second: { thresholdMxn: 10000, remainingMxn: 0, reached: true, progressPercent: 100 },
          third: { thresholdMxn: 30000, remainingMxn: 20000, reached: false, progressPercent: 33.33 },
        },
      },
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
    const mission = await screen.findByRole('region', { name: 'Centro de misión mensual' });
    expect(within(mission).getByText('Manga impacto')).toBeVisible();
    expect(within(mission).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '10000');
    expect(screen.queryByText(/correo del cliente|nombre del comprador/i)).not.toBeInTheDocument();
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

  it('shows manual withholdings, payment state, carryover guidance, and the own receipt action', async () => {
    mocks.user = { id: 'affiliate-7' };
    mocks.fetchMe.mockResolvedValue({
      can: true,
      financialAccess: true,
      profile: { code: 'NICO', status: 'active', discountPercentage: 10, commissionPercentage: 10, referralUrl: 'https://nakamabordados.com/?ref=NICO' },
      fiscal: { required: true, status: 'approved', document: { id: 2, status: 'approved', fileName: 'constancia.pdf' } },
    });
    mocks.fetchDashboard.mockResolvedValue({ success: true, period: '2026-10', code: 'NICO', referralUrl: 'https://nakamabordados.com/?ref=NICO', summary: { salesCount: 0, refundCount: 1, salesMxn: -500, commissionMxn: -50 } });
    mocks.fetchSales.mockResolvedValue({ success: true, page: 1, hasMore: false, items: [] });
    mocks.fetchPayments.mockResolvedValue({
      success: true,
      page: 1,
      hasMore: false,
      items: [{ id: 12, period: '2026-09', status: 'paid', salesMxn: 11000, refundsMxn: -1000, adjustmentsMxn: 0, commissionGrossMxn: 1000, isrWithheldMxn: 90, ivaWithheldMxn: 40, otherAdjustmentsMxn: -10, netMxn: 860, paidNetMxn: 860, paidAt: '2026-10-05 12:00:00', reference: 'SPEI-001', receiptId: 22, reversedAt: null, reversalReason: null }],
    });
    render(<AffiliateDashboard />);

    const history = await screen.findByRole('region', { name: 'Cierres y pagos' });
    expect(within(history).getByText('ISR retenido (capturado por administración)')).toBeVisible();
    expect(within(history).getByText('IVA retenido (capturado por administración)')).toBeVisible();
    expect(within(history).getByText('Pagado')).toBeVisible();
    expect(within(history).getByText(/no son un cálculo fiscal automático/i)).toBeVisible();
    expect(within(history).getByText(/siguiente mes abierto/i)).toBeVisible();

    fireEvent.click(within(history).getByRole('button', { name: 'Descargar comprobante' }));
    await waitFor(() => expect(mocks.downloadReceipt).toHaveBeenCalledWith(22));
  });
});
