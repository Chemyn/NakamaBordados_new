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
}

export interface ProdOrderDetail {
  id: number;
  number: string;
  status: string;
  taken: boolean;
  taken_by: string;
  products: ProdProduct[];
  progress: ProdProgress;
  is_quote?: boolean;
  quote_folio?: string;
  quote_pdf_url?: string;
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

// El alta y baja de patrones se administra desde la web: subir un PDF exige
// teclear el SKU exacto, algo incómodo en el teléfono. La app sigue mostrando
// el patrón de cada producto desde el detalle del pedido (ProdProduct.pdf_url).

/** Registra el token de notificaciones de este dispositivo (plugin >= 1.4.0). */
export async function registerPushToken(token: string): Promise<void> {
  await request('/push-token', { method: 'POST', json: { token } }, 'No se pudo activar las notificaciones.');
}

export async function unregisterPushToken(token: string): Promise<void> {
  await request('/push-token', { method: 'DELETE', json: { token } }, 'No se pudo desactivar las notificaciones.');
}
