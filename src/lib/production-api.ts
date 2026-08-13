import { apiOrigin } from './api-host';

export interface ProdProgress {
  validated: number;
  total: number;
  pct: number;
}

export interface ProdCard {
  id: number;
  number: string;
  age: string;
  item_count: number;
  products: string[];
  taken: boolean;
  taken_by: string;
  taken_age: string;
  progress: ProdProgress;
  is_quote?: boolean;
  cycle_number: number;
  rework_units: number;
  quality_status: 'production' | 'pending_review' | 'approved';
}

export interface ProdOrdersResponse {
  orders: ProdCard[];
  has_more: boolean;
  page: number;
}

export interface ProdProduct {
  item_id: number;
  name: string;
  sku?: string;
  qty: number;
  talla: string;
  estilo: string;
  color: string;
  pdf_url: string;
  image_url: string;
  image_full: string;
  validated: boolean;
  validated_by: string;
  rework_quantity: number;
  rework_comment: string;
}

export interface ProdReworkItem {
  item_id: number;
  product_name: string;
  quantity_ordered: number;
  quantity_rejected: number;
  comment: string;
}

export interface ProdRework {
  review_id: number;
  cycle_id: number;
  supervisor_name: string;
  reviewed_at: string;
  units_rejected: number;
  items: ProdReworkItem[];
}

export interface ProdActiveCycle {
  id: number;
  number: number;
  type: 'initial' | 'rework';
  operator_name: string;
  started_at: string;
}

export interface ProdCycleHistory {
  id: number;
  number: number;
  type: 'initial' | 'rework';
  operator_user_id: number;
  operator_name: string;
  units_total: number;
  started_at: string;
  finished_at: string;
  duration_seconds: number;
  status: 'active' | 'finished' | 'approved' | 'rejected' | 'released';
}

export interface ProdOrderDetail {
  id: number;
  number: string;
  status: string;
  taken: boolean;
  taken_by: string;
  is_cycle_owner: boolean;
  can_review: boolean;
  quality_status: 'production' | 'pending_review' | 'approved';
  has_shipping_guide: boolean;
  active_cycle: ProdActiveCycle | null;
  cycle_number: number;
  cycles: ProdCycleHistory[];
  total_duration_seconds: number;
  rework: ProdRework | null;
  products: ProdProduct[];
  progress: ProdProgress;
  is_quote?: boolean;
  quote_folio?: string;
  quote_pdf_url?: string;
}

export interface ProdAccess {
  can: boolean;
  can_review: boolean;
}

export interface ProdReviewItemInput {
  item_id: number;
  quantity_rejected: number;
  comment: string;
}

export interface ProdPdf {
  id: number;
  product_id: number;
  product_name: string;
  sku?: string;
  pdf_url: string;
  uploaded_at: string;
}

export interface ProdUploadResult {
  success: boolean;
  product_name?: string;
  sku?: string;
  pdf_url?: string;
  message?: string;
  suggestions?: string[];
}

export type ProdColumn = 'processing' | 'tomados' | 'pendiente-guia';
export type ProdReportPeriod = 'week' | 'month';

export interface ProdReport {
  period: { type: ProdReportPeriod; start: string; end: string; label: string };
  summary: {
    orders_reviewed: number;
    rework_orders: number;
    reviewed_units: number;
    rejected_units: number;
    rework_rate: number;
    cycles_completed: number;
    avg_cycle_seconds: number;
    avg_order_seconds: number;
    first_pass_approved: number;
    first_pass_rate: number;
  };
  series: Array<{ key: string; label: string; reviewed_units: number; rejected_units: number }>;
  operators: Array<{
    user_id: number;
    name: string;
    cycles_completed: number;
    rework_cycles: number;
    units_produced: number;
    units_rejected: number;
    total_seconds: number;
    avg_seconds: number;
    rework_rate: number;
  }>;
  details: Array<{
    id: number;
    order_id: number;
    order_number: string;
    cycle_number: number;
    product_name: string;
    quantity_ordered: number;
    quantity_rejected: number;
    comment: string;
    operator_name: string;
    supervisor_name: string;
    duration_seconds: number;
    reviewed_at: string;
  }>;
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...(extra || {}) };
  const token = typeof window !== 'undefined' ? localStorage.getItem('wp-jwt') : null;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function prodUrl(path: string, params?: Record<string, string | number>): string {
  let url = `${apiOrigin()}/?rest_route=/nakama/v1/production${path}`;
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url += `&${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`;
    }
  }
  return `${url}&_cb=${Date.now()}`;
}

async function responseError(res: Response, fallback: string): Promise<Error> {
  try {
    const data = await res.json();
    return new Error(data?.message || fallback);
  } catch {
    return new Error(fallback);
  }
}

export async function fetchProductionAccess(): Promise<ProdAccess> {
  try {
    const res = await fetch(prodUrl('/access'), { headers: authHeaders() });
    if (!res.ok) return { can: false, can_review: false };
    const data = await res.json();
    return { can: !!data?.can, can_review: !!data?.can_review };
  } catch {
    return { can: false, can_review: false };
  }
}

export async function fetchProductionOrders(column: ProdColumn, page: number): Promise<ProdOrdersResponse> {
  const res = await fetch(prodUrl('/orders', { column, page }), { headers: authHeaders() });
  if (!res.ok) throw await responseError(res, 'No se pudieron cargar los pedidos.');
  return res.json();
}

export async function fetchProductionOrderDetail(id: number): Promise<ProdOrderDetail> {
  const res = await fetch(prodUrl(`/orders/${id}`), { headers: authHeaders() });
  if (!res.ok) throw await responseError(res, 'No se pudo cargar el detalle del pedido.');
  return res.json();
}

export async function takeProductionOrder(orderId: number): Promise<void> {
  const res = await fetch(prodUrl('/take'), {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ order_id: orderId }),
  });
  if (!res.ok) throw await responseError(res, 'No se pudo tomar el pedido.');
}

export async function finishProductionOrder(orderId: number): Promise<void> {
  const res = await fetch(prodUrl('/finish'), {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ order_id: orderId }),
  });
  if (!res.ok) throw await responseError(res, 'No se pudo finalizar la produccion.');
}

export async function validateProductionItem(
  orderId: number,
  itemId: number,
  validated: boolean,
): Promise<ProdProgress> {
  const res = await fetch(prodUrl('/validate'), {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ order_id: orderId, item_id: itemId, validated }),
  });
  if (!res.ok) throw await responseError(res, 'No se pudo actualizar la validacion.');
  const data = await res.json();
  return data.progress as ProdProgress;
}

export async function reviewProductionOrder(
  orderId: number,
  decision: 'approved' | 'rework',
  items: ProdReviewItemInput[] = [],
): Promise<{ completed: boolean }> {
  const res = await fetch(prodUrl('/review'), {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ order_id: orderId, decision, items }),
  });
  if (!res.ok) throw await responseError(res, 'No se pudo guardar la revision.');
  return res.json();
}

export async function reassignProductionOrder(orderId: number, reason: string): Promise<void> {
  const res = await fetch(prodUrl('/reassign'), {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ order_id: orderId, reason }),
  });
  if (!res.ok) throw await responseError(res, 'No se pudo liberar el pedido.');
}

export async function fetchProductionReport(period: ProdReportPeriod, anchor: string): Promise<ProdReport> {
  const res = await fetch(prodUrl('/reports', { period, anchor }), { headers: authHeaders() });
  if (!res.ok) throw await responseError(res, 'No se pudo cargar el reporte.');
  return res.json();
}

export async function listProductionPdfs(): Promise<ProdPdf[]> {
  const res = await fetch(prodUrl('/pdfs'), { headers: authHeaders() });
  if (!res.ok) throw await responseError(res, 'No se pudieron cargar los patrones.');
  const data = await res.json();
  return data?.pdfs || [];
}

export async function uploadProductionPdf(file: File): Promise<ProdUploadResult> {
  const data = new FormData();
  data.append('file', file);
  const res = await fetch(prodUrl('/pdfs'), { method: 'POST', headers: authHeaders(), body: data });
  return res.json();
}

export async function deleteProductionPdf(id: number): Promise<void> {
  const res = await fetch(prodUrl(`/pdfs/${id}`), { method: 'DELETE', headers: authHeaders() });
  if (!res.ok) throw await responseError(res, 'No se pudo eliminar el patron.');
}
