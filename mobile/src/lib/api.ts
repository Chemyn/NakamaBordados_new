/**
 * Cliente del Panel de Producción (endpoints nakama/v1/production/*).
 *
 * Port de src/lib/production-api.ts de la web: mismos tipos, mismas rutas y el
 * mismo patrón `?rest_route=` (necesario por el no-cache del .htaccess). Las
 * diferencias en móvil son dos: el token sale del Keystore en vez de
 * localStorage, y ante un 401 se intenta renovar la sesión antes de rendirse.
 */

import { API_ORIGIN } from './config';
import { refreshAccessToken } from './auth';
import { getSession, getToken } from './session';

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

/** Columnas del tablero. 'tomados' es la vista de los pedidos en fabricación. */
export type ProdColumn = 'processing' | 'tomados' | 'pendiente-guia';

/** Estatus de pedido en los que se puede trabajar (validar y finalizar). */
export const WORKABLE_STATUSES = ['processing', 'fabricando'];

/** Se avisa a la app cuando la sesión deja de ser válida para volver al login. */
type SessionExpiredHandler = () => void;
let onSessionExpired: SessionExpiredHandler | null = null;

export function setSessionExpiredHandler(handler: SessionExpiredHandler | null): void {
  onSessionExpired = handler;
}

function prodUrl(path: string, params?: Record<string, string | number>): string {
  let url = `${API_ORIGIN}/?rest_route=/nakama/v1/production${path}`;
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url += `&${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`;
    }
  }
  return `${url}&_cb=${Date.now()}`;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE';
  params?: Record<string, string | number>;
  json?: unknown;
  form?: FormData;
}

async function send(path: string, options: RequestOptions, allowRetry: boolean): Promise<Response> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.json !== undefined) headers['Content-Type'] = 'application/json';
  // Con FormData no se fija Content-Type: lo pone el runtime con su boundary.

  const res = await fetch(prodUrl(path, options.params), {
    method: options.method ?? 'GET',
    headers,
    body: options.json !== undefined ? JSON.stringify(options.json) : options.form,
  });

  // 401 = token vencido o ausente. 403 = sesión válida sin permiso de producción,
  // que renovar el token no arregla.
  if (res.status === 401) {
    if (allowRetry) {
      const renewed = await refreshAccessToken(getSession()?.refreshToken ?? null);
      if (renewed) return send(path, options, false);
    }
    // También llega aquí si el token recién renovado sigue sin servir: hay que
    // volver al login en vez de dejar al operador reintentando en bucle.
    onSessionExpired?.();
  }

  return res;
}

async function messageFrom(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { message?: string };
    if (data?.message) return data.message;
  } catch {
    /* respuesta sin JSON */
  }
  return fallback;
}

async function request<T>(path: string, options: RequestOptions, fallbackError: string): Promise<T> {
  const res = await send(path, options, true);
  if (!res.ok) {
    throw new Error(await messageFrom(res, fallbackError));
  }
  return (await res.json()) as T;
}

/**
 * ¿El usuario actual tiene permiso para el Panel de Producción? Lanza si la
 * consulta no llega al servidor, para no confundir "sin red" con "sin permiso".
 */
export async function checkProductionAccess(): Promise<boolean> {
  const res = await send('/access', {}, true);
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

export async function listProductionPdfs(): Promise<ProdPdf[]> {
  const data = await request<{ pdfs?: ProdPdf[] }>('/pdfs', {}, 'No se pudieron cargar los patrones.');
  return data.pdfs ?? [];
}

/**
 * Sube un PDF de patrón. El servidor exige que el nombre del archivo sea el SKU
 * del producto padre, y responde con `suggestions` cuando no reconoce el SKU.
 */
export async function uploadProductionPdf(uri: string, fileName: string): Promise<ProdUploadResult> {
  const form = new FormData();
  // En React Native el archivo se describe por su URI local, no como Blob.
  form.append('file', { uri, name: fileName, type: 'application/pdf' } as unknown as Blob);

  const res = await send('/pdfs', { method: 'POST', form }, true);
  try {
    return (await res.json()) as ProdUploadResult;
  } catch {
    return { success: false, message: 'El servidor no respondió correctamente.' };
  }
}

export async function deleteProductionPdf(id: number): Promise<void> {
  await request(`/pdfs/${id}`, { method: 'DELETE' }, 'No se pudo eliminar el patrón.');
}

/** Registra el token de notificaciones de este dispositivo (plugin >= 1.4.0). */
export async function registerPushToken(token: string): Promise<void> {
  await request('/push-token', { method: 'POST', json: { token } }, 'No se pudo activar las notificaciones.');
}

export async function unregisterPushToken(token: string): Promise<void> {
  await request('/push-token', { method: 'DELETE', json: { token } }, 'No se pudo desactivar las notificaciones.');
}
