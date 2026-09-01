/**
 * Cliente del Panel de Producción (endpoints nakama/v1/production/*).
 *
 * Port de src/lib/production-api.ts de la web: mismos tipos y mismas rutas. El
 * transporte (token, reintento de sesión) vive en rest.ts, compartido con el
 * cliente de Almacén.
 */

import { createRestClient } from './rest';

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

export interface ProdUploadFile {
  uri: string;
  name: string;
  mimeType?: string | null;
}

/** Columnas del tablero. 'tomados' es la vista de los pedidos en fabricación. */
export type ProdColumn = 'processing' | 'tomados' | 'pendiente-guia';

/** Estatus de pedido en los que se puede trabajar (validar y finalizar). */
export const WORKABLE_STATUSES = ['processing', 'fabricando'];

const { send, request } = createRestClient('production');

/**
 * ¿El usuario actual tiene permiso para el Panel de Producción? Lanza si la
 * consulta no llega al servidor, para no confundir "sin red" con "sin permiso".
 */
export async function checkProductionAccess(): Promise<boolean> {
  const res = await send('/access');
  if (!res.ok) throw new Error('No se pudo verificar el acceso al panel.');
  const data = (await res.json()) as { can?: boolean };
  return !!data?.can;
}

export async function fetchProductionOrders(column: ProdColumn, page: number): Promise<ProdOrdersResponse> {
  return request<ProdOrdersResponse>(
    '/orders',
    { params: { column, page } },
    'No se pudieron cargar los pedidos.',
  );
}

export async function fetchProductionOrderDetail(id: number): Promise<ProdOrderDetail> {
  return request<ProdOrderDetail>(`/orders/${id}`, {}, 'No se pudo cargar el detalle del pedido.');
}

export async function takeProductionOrder(orderId: number): Promise<void> {
  await request('/take', { method: 'POST', json: { order_id: orderId } }, 'No se pudo tomar el pedido.');
}

export async function finishProductionOrder(orderId: number): Promise<void> {
  // El servidor devuelve el motivo (ej. "Faltan 2 productos por validar").
  await request(
    '/finish',
    { method: 'POST', json: { order_id: orderId } },
    'No se pudo finalizar la producción.',
  );
}

/** Marca/desmarca una línea de producto como validada. Devuelve el progreso. */
export async function validateProductionItem(
  orderId: number,
  itemId: number,
  validated: boolean,
): Promise<ProdProgress> {
  const data = await request<{ progress: ProdProgress }>(
    '/validate',
    { method: 'POST', json: { order_id: orderId, item_id: itemId, validated } },
    'No se pudo actualizar la validación.',
  );
  return data.progress;
}

export async function reviewProductionOrder(
  orderId: number,
  decision: 'approved' | 'rework',
  items: ProdReviewItemInput[] = [],
): Promise<void> {
  await request(
    '/review',
    { method: 'POST', json: { order_id: orderId, decision, items } },
    'No se pudo guardar la revision.',
  );
}

export async function reassignProductionOrder(orderId: number, reason: string): Promise<void> {
  await request(
    '/reassign',
    { method: 'POST', json: { order_id: orderId, reason } },
    'No se pudo liberar el pedido.',
  );
}

export async function listProductionPdfs(): Promise<ProdPdf[]> {
  const data = await request<{ pdfs?: ProdPdf[] }>(
    '/pdfs',
    {},
    'No se pudieron cargar los patrones.',
  );
  return data.pdfs ?? [];
}

/** Sube un PDF elegido con DocumentPicker al endpoint multipart existente. */
export async function uploadProductionPdf(file: ProdUploadFile): Promise<ProdUploadResult> {
  const form = new FormData();
  form.append(
    'file',
    {
      uri: file.uri,
      name: file.name,
      type: file.mimeType || 'application/pdf',
    } as unknown as Blob,
  );

  const res = await send('/pdfs', { method: 'POST', form });
  let data: Partial<ProdUploadResult> | null = null;
  try {
    data = (await res.json()) as Partial<ProdUploadResult>;
  } catch {
    /* El servidor normalmente responde JSON; se usa el fallback de abajo. */
  }

  // Un SKU sin coincidencia es un resultado recuperable del lote: no debe
  // impedir que los demás archivos continúen subiendo.
  if (data && typeof data.success === 'boolean') return data as ProdUploadResult;
  if (data?.message) throw new Error(data.message);
  if (!res.ok) throw new Error('No se pudo subir el patrón.');
  throw new Error('El servidor devolvió una respuesta inesperada.');
}

export async function deleteProductionPdf(id: number): Promise<void> {
  await request(
    `/pdfs/${id}`,
    { method: 'DELETE' },
    'No se pudo eliminar el patrón.',
  );
}

/** Registra el token de notificaciones de este dispositivo (plugin >= 1.4.0). */
export async function registerPushToken(token: string): Promise<void> {
  await request('/push-token', { method: 'POST', json: { token } }, 'No se pudo activar las notificaciones.');
}

export async function unregisterPushToken(token: string): Promise<void> {
  await request('/push-token', { method: 'DELETE', json: { token } }, 'No se pudo desactivar las notificaciones.');
}
