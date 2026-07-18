/**
 * Cliente del Panel de Producción (endpoints nakama/v1/production/*).
 *
 * Autenticación: JWT de WPGraphQL guardado en localStorage['wp-jwt'], enviado
 * como Authorization: Bearer — el mismo patrón que MaintenanceToggle. El
 * permission_callback del servidor (current_user_can) resuelve el usuario a
 * partir del token, así que estas llamadas quedan protegidas del lado servidor.
 * Como el frontend y WordPress comparten origen (apiOrigin), no hay CORS.
 */

import { apiOrigin } from './api-host';

export interface ProdCard {
  id: number;
  number: string;
  age: string;
  item_count: number;
  products: string[];
  taken: boolean;
  taken_by: string;
  taken_age: string;
}

export interface ProdOrdersResponse {
  orders: ProdCard[];
  has_more: boolean;
  page: number;
}

export interface ProdProduct {
  name: string;
  qty: number;
  talla: string;
  estilo: string;
  color: string;
  pdf_url: string;
}

export interface ProdOrderDetail {
  id: number;
  number: string;
  status: string;
  taken: boolean;
  taken_by: string;
  products: ProdProduct[];
}

export interface ProdPdf {
  id: number;
  product_id: number;
  product_name: string;
  pdf_url: string;
  uploaded_at: string;
}

export interface ProdUploadResult {
  success: boolean;
  product_name?: string;
  pdf_url?: string;
  message?: string;
  suggestions?: string[];
}

/** Columnas del tablero (coinciden con el estatus de WooCommerce). */
export type ProdColumn = 'processing' | 'pendiente-guia';

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...(extra || {}) };
  const token = typeof window !== 'undefined' ? localStorage.getItem('wp-jwt') : null;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/** Construye la URL del endpoint vía ?rest_route= (para el no-cache del .htaccess). */
function prodUrl(path: string, params?: Record<string, string | number>): string {
  let url = `${apiOrigin()}/?rest_route=/nakama/v1/production${path}`;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url += `&${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`;
    }
  }
  return `${url}&_cb=${Date.now()}`;
}

/** ¿El usuario actual tiene permiso para el Panel de Producción? Nunca lanza. */
export async function fetchProductionAccess(): Promise<boolean> {
  try {
    const res = await fetch(prodUrl('/access'), { headers: authHeaders() });
    if (!res.ok) return false;
    const data = await res.json();
    return !!data?.can;
  } catch {
    return false;
  }
}

export async function fetchProductionOrders(column: ProdColumn, page: number): Promise<ProdOrdersResponse> {
  const res = await fetch(prodUrl('/orders', { column, page }), { headers: authHeaders() });
  if (!res.ok) throw new Error('No se pudieron cargar los pedidos.');
  return res.json();
}

export async function fetchProductionOrderDetail(id: number): Promise<ProdOrderDetail> {
  const res = await fetch(prodUrl(`/orders/${id}`), { headers: authHeaders() });
  if (!res.ok) throw new Error('No se pudo cargar el detalle del pedido.');
  return res.json();
}

export async function takeProductionOrder(orderId: number): Promise<void> {
  const res = await fetch(prodUrl('/take'), {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ order_id: orderId }),
  });
  if (!res.ok) throw new Error('No se pudo tomar el pedido.');
}

export async function finishProductionOrder(orderId: number): Promise<void> {
  const res = await fetch(prodUrl('/finish'), {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ order_id: orderId }),
  });
  if (!res.ok) throw new Error('No se pudo finalizar la producción.');
}

export async function listProductionPdfs(): Promise<ProdPdf[]> {
  const res = await fetch(prodUrl('/pdfs'), { headers: authHeaders() });
  if (!res.ok) throw new Error('No se pudieron cargar los patrones.');
  const data = await res.json();
  return data?.pdfs || [];
}

export async function uploadProductionPdf(file: File): Promise<ProdUploadResult> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(prodUrl('/pdfs'), {
    method: 'POST',
    headers: authHeaders(), // sin Content-Type: el navegador pone el boundary de multipart
    body: fd,
  });
  return res.json();
}

export async function deleteProductionPdf(id: number): Promise<void> {
  const res = await fetch(prodUrl(`/pdfs/${id}`), {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('No se pudo eliminar el patrón.');
}
