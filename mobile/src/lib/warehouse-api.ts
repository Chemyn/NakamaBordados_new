/**
 * Cliente del Almacén (endpoints nakama/v1/warehouse/*).
 *
 * Port de src/lib/warehouse-api.ts de la web, recortado a lo que se usa desde
 * el taller: consultar existencias y corregirlas. El alta de variantes, el
 * borrado y la generación desde el catálogo se quedan en la web, donde hay
 * teclado y pantalla para revisar lo que se crea.
 */

import { createRestClient } from './rest';

const { send, request } = createRestClient('warehouse');

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

/** Cambio pendiente de una fila; solo viajan los campos que se tocaron. */
export interface WhBulkChange {
  id: number;
  stock?: number;
  min_stock?: number;
}

/** El servidor rechaza lotes mayores; se corta antes para dar mejor mensaje. */
export const WH_BULK_LIMIT = 50;

/**
 * ¿El usuario actual tiene permiso de almacén? Lanza si la consulta no llega al
 * servidor, para no confundir "sin red" con "sin permiso".
 */
export async function fetchWarehouseAccess(): Promise<boolean> {
  const res = await send('/access');
  if (!res.ok) throw new Error('No se pudo verificar el acceso al almacén.');
  const data = (await res.json()) as { can?: boolean };
  return Boolean(data?.can);
}

export async function listWarehouseItems(search?: string): Promise<WhItem[]> {
  const params = search ? { search } : undefined;
  const data = await request<{ items?: WhItem[] }>(
    '/items',
    { params },
    'No se pudo cargar el almacén.',
  );
  return data.items ?? [];
}

/** Variantes agotadas o por debajo de su mínimo. */
export async function listWarehouseAlerts(): Promise<WhItem[]> {
  const data = await request<{ items?: WhItem[] }>('/alerts', {}, 'No se pudieron cargar las alertas.');
  return data.items ?? [];
}

/** Aplica varios cambios de una vez; devuelve las claves tocadas para el sync. */
export async function bulkAdjustWarehouse(
  items: WhBulkChange[],
): Promise<{ items: WhItem[]; keys: string[] }> {
  if (items.length > WH_BULK_LIMIT) {
    throw new Error(`No se pueden guardar más de ${WH_BULK_LIMIT} cambios a la vez.`);
  }
  const data = await request<{ items?: WhItem[]; keys?: string[] }>(
    '/bulk',
    { method: 'POST', json: { items } },
    'No se pudieron guardar los cambios.',
  );
  return { items: data.items ?? [], keys: data.keys ?? [] };
}

/**
 * Propaga a la tienda el "agotado" de las claves indicadas. Se llama una sola
 * vez al final de un guardado: es la parte cara y no hace falta por cada lote.
 */
export async function syncWarehouse(keys?: string[]): Promise<number> {
  const data = await request<{ changed?: number }>(
    '/sync',
    { method: 'POST', json: keys?.length ? { keys } : {} },
    'No se pudo sincronizar con la tienda.',
  );
  return data.changed ?? 0;
}
