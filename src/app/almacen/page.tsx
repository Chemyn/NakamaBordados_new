'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import {
  fetchWarehouseAccess,
  listWarehouseItems,
  listWarehouseAlerts,
  upsertWarehouseItem,
  deleteWarehouseItem,
  generateFromCatalog,
  bulkAdjustWarehouse,
  syncWarehouse,
  WhItem,
} from '@/lib/warehouse-api';

type AccessState = 'checking' | 'granted' | 'denied' | 'guest';
type Tab = 'stock' | 'alerts';
/** Cambio pendiente de una fila (valores absolutos aún no enviados). */
type Edit = { stock?: number; min_stock?: number };
type SaveState = 'saving' | 'saved' | 'error';
type Msg = { type: 'ok' | 'err'; text: string } | null;

/** Tamaño de lote para aplicar cambios sin saturar el servidor. */
const APPLY_BATCH = 5;

/**
 * Panel de Almacén (SKU base) en el frontend headless. La protección real la
 * impone el servidor (permission_callback current_user_can en
 * nakama/v1/warehouse/*); este gate es solo UX. Reutiliza los mismos endpoints
 * REST que la versión de wp-admin, autenticados con el JWT de la sesión.
 *
 * Edición: los cambios se acumulan en estado local (sin tocar el servidor) y se
 * envían con "Aplicar cambios" en lotes de 5 + una sola sincronización final,
 * para no barrer el catálogo en cada tecla.
 */
export default function AlmacenPage() {
  const { user, isLoading } = useAuth();

  const [access, setAccess] = useState<AccessState>('checking');
  const [tab, setTab] = useState<Tab>('stock');

  const [items, setItems] = useState<WhItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [search, setSearch] = useState('');

  const [alerts, setAlerts] = useState<WhItem[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Edición por lotes.
  const [edits, setEdits] = useState<Record<number, Edit>>({});
  const [saveState, setSaveState] = useState<Record<number, SaveState>>({});
  const [applying, setApplying] = useState(false);
  const [applyProgress, setApplyProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });

  const prenda = useRef<HTMLInputElement>(null);
  const color = useRef<HTMLInputElement>(null);
  const talla = useRef<HTMLInputElement>(null);
  const newStock = useRef<HTMLInputElement>(null);
  const newMin = useRef<HTMLInputElement>(null);

  const loadItems = useCallback(async (q: string) => {
    setItemsLoading(true);
    try {
      setItems(await listWarehouseItems(q));
    } catch {
      setItems([]);
    } finally {
      setItemsLoading(false);
    }
  }, []);

  const loadAlerts = useCallback(async () => {
    setAlertsLoading(true);
    try {
      setAlerts(await listWarehouseAlerts());
    } catch {
      setAlerts([]);
    } finally {
      setAlertsLoading(false);
    }
  }, []);

  // Gate de acceso.
  useEffect(() => {
    if (isLoading) return;
    if (!user) { setAccess('guest'); return; }
    let alive = true;
    setAccess('checking');
    fetchWarehouseAccess().then(can => {
      if (!alive) return;
      if (can) {
        setAccess('granted');
        loadItems('');
        loadAlerts();
      } else {
        setAccess('denied');
      }
    });
    return () => { alive = false; };
  }, [user, isLoading, loadItems, loadAlerts]);

  const onSearch = (value: string) => {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadItems(value.trim()), 300);
  };

  // Índice id→fila (de ambas listas) para comparar contra los cambios pendientes.
  const itemById = useMemo(() => {
    const map = new Map<number, WhItem>();
    items.forEach(it => map.set(it.id, it));
    alerts.forEach(it => { if (!map.has(it.id)) map.set(it.id, it); });
    return map;
  }, [items, alerts]);

  // Filas realmente modificadas (valor pendiente distinto del servidor).
  const dirtyIds = useMemo(() => {
    const out: number[] = [];
    for (const [idStr, e] of Object.entries(edits)) {
      const id = Number(idStr);
      const it = itemById.get(id);
      if (!it) continue;
      const stockChanged = e.stock !== undefined && e.stock !== it.stock;
      const minChanged = e.min_stock !== undefined && e.min_stock !== it.min_stock;
      if (stockChanged || minChanged) out.push(id);
    }
    return out;
  }, [edits, itemById]);

  const replaceItem = useCallback((updated: WhItem) => {
    setItems(prev => prev.map(it => (it.id === updated.id ? updated : it)));
    setAlerts(prev => prev.map(it => (it.id === updated.id ? updated : it)));
  }, []);

  // Editar una fila: guarda el valor pendiente en estado local (no toca el server).
  const onEdit = useCallback((id: number, patch: Edit) => {
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
    setSaveState(prev => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id]; // al reeditar, se limpia el ✓/✗ anterior
      return next;
    });
  }, []);

  const discardEdits = () => {
    setEdits({});
    setSaveState({});
    setApplyProgress({ done: 0, total: 0 });
  };

  // Aplica los cambios pendientes en lotes de 5 y sincroniza la cascada una vez.
  const handleApply = async () => {
    const ids = dirtyIds;
    if (ids.length === 0) return;
    setApplying(true);
    setMsg(null);
    setApplyProgress({ done: 0, total: ids.length });

    const affectedKeys = new Set<string>();
    let done = 0;
    let errors = 0;

    for (let i = 0; i < ids.length; i += APPLY_BATCH) {
      const chunkIds = ids.slice(i, i + APPLY_BATCH);
      setSaveState(prev => {
        const next = { ...prev };
        chunkIds.forEach(id => { next[id] = 'saving'; });
        return next;
      });

      const payload = chunkIds.map(id => {
        const e = edits[id] || {};
        const it = itemById.get(id);
        const change: { id: number; stock?: number; min_stock?: number } = { id };
        if (e.stock !== undefined && it && e.stock !== it.stock) change.stock = e.stock;
        if (e.min_stock !== undefined && it && e.min_stock !== it.min_stock) change.min_stock = e.min_stock;
        return change;
      });

      try {
        const res = await bulkAdjustWarehouse(payload);
        res.items.forEach(replaceItem);
        res.keys.forEach(k => affectedKeys.add(k));
        setSaveState(prev => {
          const next = { ...prev };
          chunkIds.forEach(id => { next[id] = 'saved'; });
          return next;
        });
        // Quitar del set de pendientes los ya guardados.
        setEdits(prev => {
          const next = { ...prev };
          chunkIds.forEach(id => delete next[id]);
          return next;
        });
      } catch {
        errors += chunkIds.length;
        setSaveState(prev => {
          const next = { ...prev };
          chunkIds.forEach(id => { next[id] = 'error'; });
          return next;
        });
      }

      done += chunkIds.length;
      setApplyProgress({ done, total: ids.length });
    }

    // Una sola sincronización de la cascada para todas las claves afectadas.
    if (affectedKeys.size > 0) {
      try {
        await syncWarehouse(Array.from(affectedKeys));
      } catch {
        /* la cascada se puede re-sincronizar; no bloquea el guardado */
      }
    }

    await loadAlerts();
    setApplying(false);
    setMsg(errors === 0
      ? { type: 'ok', text: `✓ ${ids.length} cambio${ids.length === 1 ? '' : 's'} aplicado${ids.length === 1 ? '' : 's'}.` }
      : { type: 'err', text: `Se aplicaron ${ids.length - errors} de ${ids.length}; ${errors} con error.` });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este SKU base?')) return;
    try {
      await deleteWarehouseItem(id);
      setItems(prev => prev.filter(it => it.id !== id));
      setAlerts(prev => prev.filter(it => it.id !== id));
      setEdits(prev => { const n = { ...prev }; delete n[id]; return n; });
      setMsg({ type: 'ok', text: 'SKU base eliminado.' });
    } catch {
      setMsg({ type: 'err', text: 'No se pudo eliminar el SKU base.' });
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = prenda.current?.value.trim() || '';
    const c = color.current?.value.trim() || '';
    const t = talla.current?.value.trim() || '';
    if (!p || !c || !t) return;
    try {
      await upsertWarehouseItem({
        prenda: p,
        color: c,
        talla: t,
        stock: Number(newStock.current?.value) || 0,
        min_stock: Number(newMin.current?.value) || 0,
      });
      if (prenda.current) prenda.current.value = '';
      if (color.current) color.current.value = '';
      if (talla.current) talla.current.value = '';
      if (newStock.current) newStock.current.value = '0';
      if (newMin.current) newMin.current.value = '0';
      loadItems(search.trim());
      loadAlerts();
      setMsg({ type: 'ok', text: '✓ SKU base añadido.' });
    } catch {
      setMsg({ type: 'err', text: 'No se pudo añadir el SKU base.' });
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setMsg(null);
    try {
      const res = await generateFromCatalog();
      loadItems(search.trim());
      loadAlerts();
      setMsg({
        type: 'ok',
        text: `✓ Creados: ${res.created} · Fusionados (duplicados de color): ${res.merged} · Omitidos: ${res.skipped}.`,
      });
    } catch (err) {
      setMsg({ type: 'err', text: err instanceof Error ? err.message : 'No se pudo generar desde el catálogo.' });
    } finally {
      setGenerating(false);
    }
  };

  // ---- Estados de acceso ----
  if (isLoading || access === 'checking') {
    return (
      <div className="nw-gate">
        <div className="nk-spinner" />
        <p>Verificando acceso…</p>
        <style jsx>{gateStyles}</style>
      </div>
    );
  }

  if (access === 'guest') {
    return (
      <div className="nw-gate">
        <h1>Panel de Almacén</h1>
        <p>Inicia sesión con una cuenta con permiso de almacén para continuar.</p>
        <Link href="/mi-cuenta?return=/almacen/" className="nk-btn">Iniciar sesión</Link>
        <style jsx>{gateStyles}</style>
      </div>
    );
  }

  if (access === 'denied') {
    return (
      <div className="nw-gate">
        <h1>Acceso denegado</h1>
        <p>Tu cuenta no tiene permiso para el Panel de Almacén. Solicítalo a un administrador.</p>
        <Link href="/mi-cuenta/" className="nk-btn-sec">Volver a Mi Cuenta</Link>
        <style jsx>{gateStyles}</style>
      </div>
    );
  }

  // ---- Panel ----
  const alertCount = alerts.length;
  const dirtyCount = dirtyIds.length;
  return (
    <div className="nw-page">
      <header className="nw-header">
        <h1>Almacén — Materia Prima</h1>
        <div className="nw-tabs">
          <button className={`nw-tab ${tab === 'stock' ? 'is-active' : ''}`} onClick={() => setTab('stock')}>Almacén</button>
          <button className={`nw-tab ${tab === 'alerts' ? 'is-active' : ''}`} onClick={() => { setTab('alerts'); loadAlerts(); }}>
            Alertas{alertCount > 0 && <span className="nw-badge">{alertCount}</span>}
          </button>
        </div>
      </header>

      {msg && <div className={`nw-msg ${msg.type}`} role="status">{msg.text}</div>}

      {tab === 'stock' && (
        <div className="nw-view">
          <div className="nw-toolbar">
            <input
              type="search"
              placeholder="Buscar prenda, color, talla…"
              value={search}
              onChange={e => onSearch(e.target.value)}
            />
            <button className="nk-btn" onClick={handleGenerate} disabled={generating}>
              {generating ? 'Generando…' : 'Generar desde catálogo'}
            </button>
          </div>

          <form className="nw-new" onSubmit={handleAdd}>
            <input type="text" placeholder="Prenda (Estilo)" ref={prenda} required />
            <input type="text" placeholder="Color" ref={color} required />
            <input type="text" placeholder="Talla" ref={talla} required />
            <input type="number" placeholder="Stock" defaultValue="0" ref={newStock} />
            <input type="number" placeholder="Mínimo" defaultValue="0" ref={newMin} />
            <button className="nk-btn" type="submit">Añadir</button>
          </form>

          <ItemsTable
            items={items}
            loading={itemsLoading}
            emptyText='Sin SKU base. Usa "Generar desde catálogo" o añade uno.'
            edits={edits}
            saveState={saveState}
            onEdit={onEdit}
            onDelete={handleDelete}
          />
        </div>
      )}

      {tab === 'alerts' && (
        <div className="nw-view">
          <ItemsTable
            items={alerts}
            loading={alertsLoading}
            emptyText="Sin faltantes. Todo el inventario está por encima del umbral."
            edits={edits}
            saveState={saveState}
            onEdit={onEdit}
            onDelete={handleDelete}
          />
        </div>
      )}

      {dirtyCount > 0 && (
        <div className="nw-apply-bar">
          <span className="nw-apply-info">
            {applying
              ? `Guardando ${applyProgress.done}/${applyProgress.total}…`
              : `${dirtyCount} cambio${dirtyCount === 1 ? '' : 's'} sin guardar`}
          </span>
          <div className="nw-apply-actions">
            <button className="nk-btn-sec" onClick={discardEdits} disabled={applying}>Descartar</button>
            <button className="nk-btn" onClick={handleApply} disabled={applying}>
              {applying ? 'Aplicando…' : `Aplicar cambios (${dirtyCount})`}
            </button>
          </div>
        </div>
      )}

      <style jsx>{panelStyles}</style>
    </div>
  );
}

/* ---- Tabla de SKU base ---- */
function ItemsTable({ items, loading, emptyText, edits, saveState, onEdit, onDelete }: {
  items: WhItem[];
  loading: boolean;
  emptyText: string;
  edits: Record<number, Edit>;
  saveState: Record<number, SaveState>;
  onEdit: (id: number, patch: Edit) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="nw-table-wrap">
      <table className="nw-table">
        <thead>
          <tr>
            <th>SKU base</th><th>Prenda</th><th>Color</th><th>Talla</th>
            <th>Stock</th><th>Mínimo</th><th>Estado</th><th></th>
          </tr>
        </thead>
        <tbody>
          {loading && items.length === 0 ? (
            <tr><td colSpan={8} className="nw-empty">Cargando…</td></tr>
          ) : items.length === 0 ? (
            <tr><td colSpan={8} className="nw-empty">{emptyText}</td></tr>
          ) : (
            items.map(it => (
              <ItemRow
                key={it.id}
                item={it}
                edit={edits[it.id]}
                save={saveState[it.id]}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function ItemRow({ item, edit, save, onEdit, onDelete }: {
  item: WhItem;
  edit?: Edit;
  save?: SaveState;
  onEdit: (id: number, patch: Edit) => void;
  onDelete: (id: number) => void;
}) {
  const stockVal = edit?.stock ?? item.stock;
  const minVal = edit?.min_stock ?? item.min_stock;
  const stockDirty = edit?.stock !== undefined && edit.stock !== item.stock;
  const minDirty = edit?.min_stock !== undefined && edit.min_stock !== item.min_stock;
  const dirty = stockDirty || minDirty;

  const statusLabel = item.status === 'out' ? 'Agotado' : item.status === 'low' ? 'Bajo' : 'OK';

  return (
    <tr className={dirty ? 'nw-row-dirty' : ''}>
      <td className="nw-key">{item.sku_key}</td>
      <td>{item.prenda}</td>
      <td>{item.color}</td>
      <td>{item.talla}</td>
      <td>
        <div className="nw-stock-cell">
          <button className="nw-btn-mini" onClick={() => onEdit(item.id, { stock: stockVal - 1 })}>−</button>
          <input
            type="number"
            value={stockVal}
            onChange={e => onEdit(item.id, { stock: Number(e.target.value) || 0 })}
          />
          <button className="nw-btn-mini" onClick={() => onEdit(item.id, { stock: stockVal + 1 })}>+</button>
        </div>
      </td>
      <td>
        <input
          className="nw-min"
          type="number"
          value={minVal}
          onChange={e => onEdit(item.id, { min_stock: Number(e.target.value) || 0 })}
        />
      </td>
      <td>
        <div className="nw-status-cell">
          <span className={`nw-pill ${item.status}`}>{statusLabel}</span>
          {dirty && !save && <span className="nw-flag" title="Sin guardar">●</span>}
          {save === 'saving' && <span className="nw-flag saving" title="Guardando">⋯</span>}
          {save === 'saved' && <span className="nw-flag saved" title="Guardado">✓</span>}
          {save === 'error' && <span className="nw-flag error" title="Error">✗</span>}
        </div>
      </td>
      <td><button className="nw-btn-mini nw-btn-del" onClick={() => onDelete(item.id)}>Eliminar</button></td>
    </tr>
  );
}

const gateStyles = `
  .nw-gate {
    min-height: 70vh;
    padding: calc(var(--header-padding) + 40px) 20px 60px;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    text-align: center; gap: 16px; background: var(--nk-bg-wrapper);
  }
  .nw-gate h1 { font-family: 'Teko', sans-serif; font-size: 3rem; text-transform: uppercase; color: var(--nk-text-main); margin: 0; }
  .nw-gate p { color: var(--nk-text-sec); max-width: 460px; margin: 0; }
  .nw-gate :global(.nk-btn), .nw-gate :global(.nk-btn-sec) { text-decoration: none; }
`;

const panelStyles = `
  .nw-page {
    min-height: 90vh;
    background:
      radial-gradient(color-mix(in srgb, var(--nk-border) 12%, transparent) 1px, transparent 1px) 0 0 / 20px 20px,
      var(--nk-bg-wrapper);
    padding: calc(var(--header-padding) + 10px) 0 90px;
  }

  .nw-header {
    display: flex; flex-wrap: wrap; gap: 12px 24px; align-items: center; justify-content: space-between;
    padding: 16px 24px; margin-bottom: 20px;
    background: var(--nk-navy); border-bottom: 4px solid var(--nk-primary);
  }
  .nw-header h1 {
    font-family: 'Teko', sans-serif; font-size: 2.4rem; line-height: 1; text-transform: uppercase;
    color: #fff; margin: 0;
  }
  .nw-tabs { display: flex; gap: 10px; }
  .nw-tab {
    font-family: 'Teko', sans-serif; font-size: 1.3rem; text-transform: uppercase; line-height: 1.1;
    padding: 6px 18px; background: var(--nk-bg-card); color: var(--nk-text-main);
    border: 2px solid var(--nk-border); box-shadow: 3px 3px 0 var(--nk-primary); cursor: pointer;
  }
  .nw-tab.is-active { background: var(--nk-primary); color: #fff; box-shadow: 3px 3px 0 var(--nk-border); }
  .nw-badge { display: inline-block; background: var(--nk-accent); color: #fff; font-family: 'Inter', sans-serif; font-size: .7rem; padding: 1px 6px; margin-left: 6px; }

  .nw-msg { margin: 0 24px 16px; padding: 10px 14px; font-weight: 700; font-size: .9rem; border: 2px solid var(--nk-border); }
  .nw-msg.ok  { background: #d7f5dd; color: #14532d; border-color: #14532d; }
  .nw-msg.err { background: #fde2e1; color: #b32d2e; border-color: #b32d2e; }

  .nw-view { padding: 0 24px; }

  .nw-toolbar { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 18px; }
  .nw-toolbar input[type=search] {
    flex: 1 1 260px; padding: 8px 12px; border: 2px solid var(--nk-border); font-size: 1rem;
    background: var(--nk-bg-card); color: var(--nk-text-main);
  }
  .nw-toolbar :global(.nk-btn) { text-decoration: none; }

  .nw-new {
    display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px;
    background: var(--nk-bg-card); border: 3px solid var(--nk-border); box-shadow: var(--nk-manga-shadow); padding: 14px;
  }
  .nw-new input {
    padding: 8px 10px; border: 2px solid var(--nk-border); font-size: .95rem;
    background: var(--nk-bg-wrapper); color: var(--nk-text-main);
  }
  .nw-new input[type=text] { flex: 1 1 140px; }
  .nw-new input[type=number] { width: 90px; }
  .nw-new :global(.nk-btn) { text-decoration: none; }

  .nw-table-wrap {
    overflow-x: auto; background: var(--nk-bg-card);
    border: 3px solid var(--nk-border); box-shadow: var(--nk-manga-shadow);
  }
  .nw-table { width: 100%; border-collapse: collapse; min-width: 760px; }
  .nw-table th, .nw-table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid var(--nk-border-soft, #e2ded3); font-size: .92rem; color: var(--nk-text-main); }
  .nw-table th { background: var(--nk-navy); color: #fff; font-size: .78rem; text-transform: uppercase; letter-spacing: .5px; }
  .nw-table tr:last-child td { border-bottom: none; }
  .nw-key { font-family: 'Teko', sans-serif; font-size: 1.1rem; }

  .nw-row-dirty td { background: color-mix(in srgb, var(--nk-accent) 12%, transparent); }
  .nw-row-dirty td:first-child { box-shadow: inset 4px 0 0 var(--nk-accent); }

  .nw-stock-cell { display: flex; align-items: center; gap: 6px; }
  .nw-stock-cell input { width: 66px; padding: 4px 6px; border: 2px solid var(--nk-border); text-align: center; font-weight: 700; background: var(--nk-bg-wrapper); color: var(--nk-text-main); }
  .nw-min { width: 60px; padding: 4px 6px; border: 2px solid var(--nk-border); text-align: center; background: var(--nk-bg-wrapper); color: var(--nk-text-main); }

  .nw-status-cell { display: flex; align-items: center; gap: 8px; }
  .nw-flag { font-weight: 900; font-size: 1rem; line-height: 1; }
  .nw-flag.saving { color: var(--nk-text-sec); }
  .nw-flag.saved { color: #1a7f37; }
  .nw-flag.error { color: #b32d2e; }
  .nw-flag:not(.saving):not(.saved):not(.error) { color: var(--nk-accent); }

  .nw-btn-mini {
    font-family: 'Inter', sans-serif; font-size: .9rem; font-weight: 800; padding: 2px 9px;
    border: 2px solid var(--nk-border); background: var(--nk-bg-card); color: var(--nk-text-main); cursor: pointer; line-height: 1.2;
  }
  .nw-btn-mini:hover { background: var(--nk-border); color: var(--nk-bg-card); }
  .nw-btn-del { color: #b32d2e; border-color: #b32d2e; }
  .nw-btn-del:hover { background: #b32d2e; color: #fff; }

  .nw-pill { display: inline-block; font-size: .72rem; font-weight: 800; text-transform: uppercase; padding: 2px 9px; border: 2px solid var(--nk-border); }
  .nw-pill.ok  { background: #d7f5dd; color: #14532d; }
  .nw-pill.low { background: #fbbf24; color: #1A1F2B; }
  .nw-pill.out { background: var(--nk-primary); color: #fff; }

  .nw-empty { font-style: italic; color: var(--nk-text-sec); padding: 16px; text-align: center; }

  /* Barra fija para aplicar los cambios pendientes */
  .nw-apply-bar {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 90;
    display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between;
    padding: 12px 24px; background: var(--nk-navy); border-top: 4px solid var(--nk-primary);
  }
  .nw-apply-info { font-family: 'Teko', sans-serif; font-size: 1.4rem; text-transform: uppercase; color: #fff; }
  .nw-apply-actions { display: flex; gap: 10px; }
  .nw-apply-actions :global(.nk-btn), .nw-apply-actions :global(.nk-btn-sec) { text-decoration: none; }
  .nw-apply-actions :global(.nk-btn):disabled { opacity: .6; cursor: not-allowed; }
`;
