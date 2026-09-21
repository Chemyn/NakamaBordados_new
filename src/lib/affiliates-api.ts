import { apiOrigin } from './api-host';

export type FiscalStatus = 'missing' | 'pending' | 'approved' | 'rejected';

export interface AffiliateAccess {
  can: boolean;
  vip: boolean;
  hasProfile: boolean;
  status: string;
}

export interface AffiliateFiscalDocument {
  id: number;
  status: Exclude<FiscalStatus, 'missing'>;
  fileName: string;
  fileSize?: number;
  uploadedAt?: string;
  reviewedAt?: string | null;
  reason?: string | null;
}

export interface AffiliateMe {
  can: boolean;
  vip?: boolean;
  supportMode?: boolean;
  financialAccess: boolean;
  message?: string;
  profile?: {
    code: string;
    status: string;
    discountPercentage: number;
    commissionPercentage: number;
    referralUrl: string;
  };
  fiscal: {
    required: boolean;
    status: FiscalStatus;
    document: AffiliateFiscalDocument | null;
  };
}

export interface AffiliateDashboardData {
  success: boolean;
  period: string;
  code: string;
  referralUrl: string;
  summary: {
    salesCount: number;
    refundCount: number;
    salesMxn: number;
    commissionMxn: number;
  };
}

export interface AffiliateSaleEvent {
  id: number;
  eventType: 'sale' | 'refund' | 'reversal' | 'adjustment';
  orderId: number;
  period: string;
  sourceCurrency: string;
  sourceBase: number;
  rateToMxn: number;
  baseMxn: number;
  commissionMxn: number;
  status: 'posted' | 'review';
  occurredAt: string;
}

export interface AffiliateSalesPage {
  success: boolean;
  page: number;
  hasMore: boolean;
  items: AffiliateSaleEvent[];
}

export interface AffiliatePaymentPeriod {
  id: number;
  period: string;
  status: 'draft' | 'closed' | 'approved' | 'paid';
  salesMxn: number;
  refundsMxn: number;
  adjustmentsMxn: number;
  commissionGrossMxn: number;
  isrWithheldMxn: number;
  ivaWithheldMxn: number;
  otherAdjustmentsMxn: number;
  netMxn: number;
  paidNetMxn: number;
  paidAt: string | null;
  reference: string;
  receiptId: number;
  reversedAt: string | null;
  reversalReason: string | null;
}

export interface AffiliatePaymentsPage {
  success: boolean;
  page: number;
  hasMore: boolean;
  items: AffiliatePaymentPeriod[];
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...(extra || {}) };
  const token = typeof window !== 'undefined' ? localStorage.getItem('wp-jwt') : null;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function affiliateUrl(path: string, params?: Record<string, string | number>): string {
  let url = `${apiOrigin()}/?rest_route=/nakama/v1/affiliates${path}`;
  for (const [key, value] of Object.entries(params || {})) {
    url += `&${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`;
  }
  return `${url}&_cb=${Date.now()}`;
}

async function authenticatedRequest<T>(path: string, init: RequestInit = {}, params?: Record<string, string | number>): Promise<T> {
  const response = await fetch(affiliateUrl(path, params), {
    ...init,
    headers: authHeaders(init.headers as Record<string, string> | undefined),
    credentials: 'omit',
    cache: 'no-store',
  });
  if (!response.ok) {
    let message = 'No pudimos consultar el programa de afiliados.';
    try {
      const body = await response.json();
      message = body?.message || message;
    } catch { /* keep recoverable fallback */ }
    if (response.status === 401) throw new Error('SESSION_EXPIRED');
    if (response.status === 403) throw new Error('ACCESS_DENIED');
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export async function fetchAffiliateAccess(): Promise<AffiliateAccess> {
  try {
    return await authenticatedRequest<AffiliateAccess>('/access');
  } catch {
    return { can: false, vip: false, hasProfile: false, status: 'none' };
  }
}

export function fetchAffiliateMe(): Promise<AffiliateMe> {
  return authenticatedRequest<AffiliateMe>('/me');
}

export function fetchAffiliateDashboard(): Promise<AffiliateDashboardData> {
  return authenticatedRequest<AffiliateDashboardData>('/me/dashboard');
}

export function fetchAffiliateSales(page = 1): Promise<AffiliateSalesPage> {
  return authenticatedRequest<AffiliateSalesPage>('/me/sales', {}, { page });
}

export function fetchAffiliatePayments(page = 1): Promise<AffiliatePaymentsPage> {
  return authenticatedRequest<AffiliatePaymentsPage>('/me/payments', {}, { page });
}

export async function downloadAffiliateReceipt(receiptId: number): Promise<void> {
  const response = await fetch(affiliateUrl(`/me/payments/${receiptId}/download`), {
    headers: authHeaders(),
    credentials: 'omit',
    cache: 'no-store',
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error('SESSION_EXPIRED');
    if (response.status === 403) throw new Error('ACCESS_DENIED');
    throw new Error('No pudimos descargar el comprobante.');
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = `comprobante-comisiones-${receiptId}.pdf`;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

export function uploadFiscalDocument(file: File): Promise<{ success: boolean; message?: string }> {
  const body = new FormData();
  body.append('file', file);
  return authenticatedRequest('/me/fiscal-document', { method: 'POST', body });
}
