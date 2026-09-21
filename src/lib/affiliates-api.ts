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
	progress?: AffiliateProgressData;
}

export interface AffiliateProgressData {
  salesMxn: number;
  tier: number;
  quota: number;
  next: { thresholdMxn: number; remainingMxn: number; rewardQuota: number } | null;
  milestones: {
    second: AffiliateMilestone;
    third: AffiliateMilestone;
  };
}

export interface AffiliateMilestone {
  thresholdMxn: number;
  remainingMxn: number;
  reached: boolean;
  progressPercent: number;
}

export interface AffiliateBenefit {
  id: number;
  period: string;
  sourcePeriod: string;
  sourceClosureId: number;
  validSalesMxn: number;
  tier: number;
  quota: number;
  manualReason: string;
  isDefault: boolean;
}

export interface AffiliateCatalogVariation {
  id: number;
  label: string;
  price: number;
}

export interface AffiliateCatalogProduct {
  id: number;
  name: string;
  price: number;
  image: string;
  restricted: boolean;
  vipVisible: boolean;
  variations: AffiliateCatalogVariation[];
}

export interface AffiliateProductsPage {
  success: boolean;
  page: number;
  pages: number;
  total: number;
  hasMore: boolean;
  items: AffiliateCatalogProduct[];
}

export interface AffiliateShippingAddress {
  name: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  phone: string;
}

export interface AffiliateProductRequestItem {
  id?: number;
  position: number;
  productId: number;
  variationId: number;
  productName: string;
  variationLabel: string;
  quantity: number;
}

export interface AffiliateProductRequestRecord {
  id: number;
  period: string;
  status: 'draft' | 'submitted' | 'approved' | 'preparing' | 'shipped' | 'completed' | 'rejected' | 'cancelled';
  shippingCovered: boolean;
  carrier: string;
  trackingCode: string;
  rejectionReason: string;
  submittedAt: string | null;
  completedAt: string | null;
  address: AffiliateShippingAddress;
  items: AffiliateProductRequestItem[];
}

export interface AffiliateProductRequestData {
  success: boolean;
  period: string;
  benefit: AffiliateBenefit;
  request: AffiliateProductRequestRecord | null;
  shippingCovered: boolean;
  officialAccounts: string[];
}

export interface AffiliateProductRequestInput {
  items: Array<{ product_id: number; variation_id: number }>;
  address: AffiliateShippingAddress;
}

export interface AffiliateEvidenceItem {
  id: number;
  slotKey: 'reel_1' | 'reel_2' | 'story_1' | 'bonus';
  contentType: 'reel' | 'story' | 'bonus';
  position: number;
  url: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewReason: string;
  submittedAt: string;
  reviewedAt: string | null;
}

export interface AffiliateEvidenceData {
  success: boolean;
  items: AffiliateEvidenceItem[];
  requiredComplete: boolean;
  bonusPriorityPotential: boolean;
  bonusGuarantee: boolean;
}

export interface AffiliateEvidenceInput {
  requestId: number;
  urls: { reel_1: string; reel_2: string; story_1: string; bonus: string };
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

export async function fetchAffiliateProducts(page = 1): Promise<AffiliateProductsPage> {
  const data = await authenticatedRequest<AffiliateProductsPage & { has_more?: boolean }>('/me/products', {}, { page });
  return { ...data, hasMore: data.hasMore ?? Boolean(data.has_more) };
}

export function fetchAffiliateProductRequest(): Promise<AffiliateProductRequestData> {
  return authenticatedRequest<AffiliateProductRequestData>('/me/product-request');
}

export function submitAffiliateProductRequest(input: AffiliateProductRequestInput): Promise<{ success: boolean; request?: AffiliateProductRequestRecord; reason?: string }> {
  return authenticatedRequest('/me/product-request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function fetchAffiliateEvidence(requestId: number): Promise<AffiliateEvidenceData> {
  return authenticatedRequest<AffiliateEvidenceData>('/me/evidence', {}, { request_id: requestId });
}

export function submitAffiliateEvidence(input: AffiliateEvidenceInput): Promise<AffiliateEvidenceData & { reason?: string }> {
  return authenticatedRequest('/me/evidence', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
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
