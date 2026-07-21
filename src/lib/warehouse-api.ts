/**
 * Cliente del Panel de Almacén (endpoints nakama/v1/warehouse/*).
 *
 * Autenticación: JWT de WPGraphQL guardado en localStorage['wp-jwt'], enviado
 * como Authorization: Bearer — el mismo patrón que production-api.ts. El
 * permission_callback del servidor (current_user_can) resuelve el usuario a
 * partir del token, así que estas llamadas quedan protegidas del lado servidor.
 * Como el frontend y WordPress comparten origen (apiOrigin), no hay CORS.
 */

import { apiOrigin } from './api-host';

export type WhStatus = 'ok' | 'low' | 'out';

export interface WhItem {
  id: number;
  sku_key: string;
  prenda: string;
  color: string;
  talla: string;
  label: string;
  stock: number;
  min_stock: number;
  status: WhStatus;
}

export interface WhUpsertInput {
  prenda: string;
  color: string;
  talla: string;
  stock: number;
  min_stock: number;
  label?: string;
}

export interface WhAdjustInput {
  stock?: number;
  delta?: number;
  min_stock?: number;
}

/** Un cambio pendiente para el guardado por lotes (set absoluto de stock/mínimo). */
export interface WhBulkChange {
  id: number;
  stock?: number;
  min_stock?: number;
}

export interface WhGenerateResult {
  created: number;
  skipped: number;
  merged: number;
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...(extra || {}) };
  const token = typeof window !== 'undefined' ? localStorage.getItem('wp-jwt') : null;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/** Construye la URL del endpoint vía ?rest_route= (para el no-cache del .htaccess). */
function whUrl(path: string, params?: Record<string, string | number>): string {
  let url = `${apiOrigin()}/?rest_route=/nakama/v1/warehouse${path}`;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === '' || v == null) continue;
      url += `&${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`;
    }
  }
  return `${url}&_cb=${Date.now()}`;
}

/** ¿El usuario actual tiene permiso para el Panel de Almacén? Nunca lanza. */
export async function fetchWarehouseAccess(): Promise<boolean> {
  try {
    const res = await fetch(whUrl('/access'), { headers: authHeaders() });
    if (!res.ok) return false;
    const data = await res.json();
    return !!data?.can;
  } catch {
    return false;
  }
}

export async function listWarehouseItems(search?: string): Promise<WhItem[]> {
  const res = await fetch(whUrl('/items', search ? { search } : undefined), { headers: authHeaders() });
  if (!res.ok) throw new Error('No se pudieron cargar los SKU base.');
  const data = await res.json();
  return data?.items || [];
}

export async function listWarehouseAlerts(): Promise<WhItem[]> {
  const res = await fetch(whUrl('/alerts'), { headers: authHeaders() });
  if (!res.ok) throw new Error('No se pudieron cargar las alertas.');
  const data = await res.json();
  return data?.items || [];
}

export async function upsertWarehouseItem(input: WhUpsertInput): Promise<WhItem> {
  const res = await fetch(whUrl('/items'), {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('No se pudo guardar el SKU base.');
  return res.json();
}

export async function adjustWarehouseStock(id: number, input: WhAdjustInput): Promise<WhItem> {
  const res = await fetch(whUrl('/adjust'), {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ id, ...input }),
  });
  if (!res.ok) throw new Error('No se pudo ajustar el stock.');
  return res.json();
}

export async function deleteWarehouseItem(id: number): Promise<void> {
  const res = await fetch(whUrl(`/items/${id}`), {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('No se pudo eliminar el SKU base.');
}

export async function generateFromCatalog(): Promise<WhGenerateResult> {
  const res = await fetch(whUrl('/generate'), {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('No se pudo generar desde el catálogo.');
  return res.json();
}

/**
 * Aplica un lote de cambios (≤5 por llamada desde el panel) SIN sincronizar la
 * cascada de agotado: eso lo hace syncWarehouse una sola vez al final. Devuelve
 * las filas actualizadas y las claves afectadas (para el sync final).
 */
export async function bulkAdjustWarehouse(
  items: WhBulkChange[],
): Promise<{ items: WhItem[]; keys: string[] }> {
  const res = await fetch(whUrl('/bulk'), {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw new Error('No se pudo aplicar el lote de cambios.');
  const data = await res.json();
  return { items: data?.items || [], keys: data?.keys || [] };
}

/** Sincroniza la cascada de "agotado" una sola vez (solo las claves indicadas). */
export async function syncWarehouse(keys?: string[]): Promise<number> {
  const res = await fetch(whUrl('/sync'), {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(keys && keys.length ? { keys } : {}),
  });
  if (!res.ok) throw new Error('No se pudo sincronizar el inventario.');
  const data = await res.json();
  return Number(data?.changed) || 0;
}
