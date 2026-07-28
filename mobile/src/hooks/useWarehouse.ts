import { useCallback, useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  bulkAdjustWarehouse,
  fetchWarehouseAccess,
  listWarehouseAlerts,
  listWarehouseItems,
  syncWarehouse,
  type WhBulkChange,
  type WhItem,
} from '@/lib/warehouse-api';

export const WH_ITEMS_KEY = 'wh-items';
export const WH_ALERTS_KEY = 'wh-alerts';
export const WH_ACCESS_KEY = 'wh-access';

/**
 * El servidor acepta hasta 50 por petición, pero el hosting se atraganta con
 * lotes grandes: de a 5 el guardado avanza a la vista y ninguna petición tarda
 * tanto como para parecer colgada.
 */
const APPLY_BATCH = 5;

export type RowSaveState = 'saving' | 'saved' | 'error';

export function useWarehouseAccess(enabled: boolean) {
  return useQuery({
    queryKey: [WH_ACCESS_KEY],
    queryFn: fetchWarehouseAccess,
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useWarehouseItems(search: string) {
  return useQuery({
    queryKey: [WH_ITEMS_KEY, search],
    queryFn: () => listWarehouseItems(search || undefined),
    // Al teclear, mantener la lista anterior evita que la pantalla parpadee.
    placeholderData: keepPreviousData,
  });
}

export function useWarehouseAlerts() {
  return useQuery({
    queryKey: [WH_ALERTS_KEY],
    queryFn: listWarehouseAlerts,
  });
}

export interface ApplyResult {
  saved: number;
  failed: number;
}

/**
 * Guarda los cambios pendientes por lotes, informando del avance fila por fila,
 * y sincroniza la cascada de "agotado" una sola vez al final.
 */
export function useApplyWarehouse() {
  const queryClient = useQueryClient();
  const [applying, setApplying] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [rowState, setRowState] = useState<Record<number, RowSaveState>>({});

  const markRows = useCallback((ids: number[], state: RowSaveState) => {
    setRowState((prev) => {
      const next = { ...prev };
      for (const id of ids) next[id] = state;
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setRowState({});
    setProgress({ done: 0, total: 0 });
  }, []);

  const apply = useCallback(
    async (changes: WhBulkChange[], onSaved: (ids: number[], items: WhItem[]) => void): Promise<ApplyResult> => {
      if (changes.length === 0) return { saved: 0, failed: 0 };

      setApplying(true);
      setProgress({ done: 0, total: changes.length });

      const affectedKeys = new Set<string>();
      let saved = 0;
      let failed = 0;

      for (let i = 0; i < changes.length; i += APPLY_BATCH) {
        const chunk = changes.slice(i, i + APPLY_BATCH);
        const ids = chunk.map((c) => c.id);
        markRows(ids, 'saving');

        try {
          const res = await bulkAdjustWarehouse(chunk);
          res.keys.forEach((key) => affectedKeys.add(key));
          markRows(ids, 'saved');
          onSaved(ids, res.items);
          saved += chunk.length;
        } catch {
          // Un lote que falla no detiene a los demás: es mejor guardar lo que se
          // pueda y señalar las filas con problema que perderlo todo.
          markRows(ids, 'error');
          failed += chunk.length;
        }

        setProgress({ done: Math.min(i + chunk.length, changes.length), total: changes.length });
      }

      if (affectedKeys.size > 0) {
        try {
          await syncWarehouse(Array.from(affectedKeys));
        } catch {
          /* la cascada se puede re-sincronizar; no invalida lo ya guardado */
        }
      }

      await queryClient.invalidateQueries({ queryKey: [WH_ITEMS_KEY] });
      await queryClient.invalidateQueries({ queryKey: [WH_ALERTS_KEY] });
      setApplying(false);

      return { saved, failed };
    },
    [markRows, queryClient],
  );

  return { apply, applying, progress, rowState, reset };
}
