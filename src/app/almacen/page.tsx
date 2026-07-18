'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import {
  fetchWarehouseAccess,
  listWarehouseItems,
  listWarehouseAlerts,
  upsertWarehouseItem,
  adjustWarehouseStock,
  deleteWarehouseItem,
  generateFromCatalog,
  WhItem,
} from '@/lib/warehouse-api';

type AccessState = 'checking' | 'granted' | 'denied' | 'guest';
type Tab = 'stock' | 'alerts';

/**
 * Panel de Almacén (SKU base) en el frontend headless. La protección real la
 * impone el servidor (permission_callback current_user_can en
 * nakama/v1/warehouse/*); este gate es solo UX. Reutiliza los mismos endpoints
 * REST que la versión de wp-admin, autenticados con el JWT de la sesión.
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
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const replaceItem = (updated: WhItem) => {
    setItems(prev => prev.map(it => (it.id === updated.id ? updated : it)));
    setAlerts(prev => prev.map(it => (it.id === updated.id ? updated : it)));
  };

  const handleAdjust = async (id: number, input: { stock?: number; delta?: number; min_stock?: number }) => {
    try {
      const updated = await adjustWarehouseStock(id, input);
      replaceItem(updated);
      // El estado de alertas puede cambiar tras el ajuste.
      if (tab === 'alerts' || input.stock !== undefined || input.delta !== undefined || input.min_stock !== undefined) {
        loadAlerts();
      }
    } catch {
      /* noop */
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este SKU base?')) return;
    try {
      await deleteWarehouseItem(id);
      setItems(prev => prev.filter(it => it.id !== id));
      setAlerts(prev => prev.filter(it => it.id !== id));
    } catch {
      /* noop */
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
    } catch {
      /* noop */
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await generateFromCatalog();
      alert(`Creados: ${res.created} · Omitidos (fuera del sistema): ${res.skipped}`);
      loadItems(search.trim());
      loadAlerts();
    } catch {
      /* noop */
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
            onAdjust={handleAdjust}
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
            onAdjust={handleAdjust}
            onDelete={handleDelete}
          />
        </div>
      )}

      <style jsx>{panelStyles}</style>
    </div>
  );
}

/* ---- Tabla de SKU base ---- */
function ItemsTable({ items, loading, emptyText, onAdjust, onDelete }: {
  items: WhItem[];
  loading: boolean;
  emptyText: string;
  onAdjust: (id: number, input: { stock?: number; delta?: number; min_stock?: number }) => void;
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
            items.map(it => <ItemRow key={it.id} item={it} onAdjust={onAdjust} onDelete={onDelete} />)
          )}
        </tbody>
      </table>
    </div>
  );
}

function ItemRow({ item, onAdjust, onDelete }: {
  item: WhItem;
  onAdjust: (id: number, input: { stock?: number; delta?: number; min_stock?: number }) => void;
  onDelete: (id: number) => void;
}) {
  const statusLabel = item.status === 'out' ? 'Agotado' : item.status === 'low' ? 'Bajo' : 'OK';
  return (
    <tr>
      <td className="nw-key">{item.sku_key}</td>
      <td>{item.prenda}</td>
      <td>{item.color}</td>
      <td>{item.talla}</td>
      <td>
        <div className="nw-stock-cell">
          <button className="nw-btn-mini" onClick={() => onAdjust(item.id, { delta: -1 })}>−</button>
          <input
            type="number"
            defaultValue={item.stock}
            key={`s-${item.id}-${item.stock}`}
            onBlur={e => {
              const v = Number(e.target.value);
              if (v !== item.stock) onAdjust(item.id, { stock: v });
            }}
          />
          <button className="nw-btn-mini" onClick={() => onAdjust(item.id, { delta: 1 })}>+</button>
        </div>
      </td>
      <td>
        <input
          className="nw-min"
          type="number"
          defaultValue={item.min_stock}
          key={`m-${item.id}-${item.min_stock}`}
          onBlur={e => {
            const v = Number(e.target.value);
            if (v !== item.min_stock) onAdjust(item.id, { min_stock: v });
          }}
        />
      </td>
      <td><span className={`nw-pill ${item.status}`}>{statusLabel}</span></td>
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
    padding: calc(var(--header-padding) + 10px) 0 60px;
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
  .nw-table { width: 100%; border-collapse: collapse; min-width: 720px; }
  .nw-table th, .nw-table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid var(--nk-border-soft, #e2ded3); font-size: .92rem; color: var(--nk-text-main); }
  .nw-table th { background: var(--nk-navy); color: #fff; font-size: .78rem; text-transform: uppercase; letter-spacing: .5px; }
  .nw-table tr:last-child td { border-bottom: none; }
  .nw-key { font-family: 'Teko', sans-serif; font-size: 1.1rem; }

  .nw-stock-cell { display: flex; align-items: center; gap: 6px; }
  .nw-stock-cell input { width: 66px; padding: 4px 6px; border: 2px solid var(--nk-border); text-align: center; font-weight: 700; background: var(--nk-bg-wrapper); color: var(--nk-text-main); }
  .nw-min { width: 60px; padding: 4px 6px; border: 2px solid var(--nk-border); text-align: center; background: var(--nk-bg-wrapper); color: var(--nk-text-main); }

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
`;
