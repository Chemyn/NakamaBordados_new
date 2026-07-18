'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import {
  fetchProductionAccess,
  fetchProductionOrders,
  fetchProductionOrderDetail,
  takeProductionOrder,
  finishProductionOrder,
  listProductionPdfs,
  uploadProductionPdf,
  deleteProductionPdf,
  ProdCard,
  ProdColumn,
  ProdOrderDetail,
  ProdPdf,
} from '@/lib/production-api';

type AccessState = 'checking' | 'granted' | 'denied' | 'guest';
type ColState = { orders: ProdCard[]; page: number; hasMore: boolean; loading: boolean };
type Tab = 'board' | 'pdfs';

const EMPTY_COL: ColState = { orders: [], page: 1, hasMore: false, loading: false };

/**
 * Panel de Producción en el frontend headless. La protección real la impone el
 * servidor (permission_callback current_user_can en nakama/v1/production/*); este
 * gate es solo UX. Reutiliza los mismos endpoints REST que la versión de
 * wp-admin, autenticados con el JWT de la sesión.
 */
export default function ProduccionPage() {
  const { user, isLoading } = useAuth();

  const [access, setAccess] = useState<AccessState>('checking');
  const [tab, setTab] = useState<Tab>('board');
  const [board, setBoard] = useState<Record<ProdColumn, ColState>>({
    'processing': { ...EMPTY_COL },
    'pendiente-guia': { ...EMPTY_COL },
  });
  const [detail, setDetail] = useState<ProdOrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  const [pdfs, setPdfs] = useState<ProdPdf[]>([]);
  const [pdfsLoading, setPdfsLoading] = useState(false);
  const [pdfMsg, setPdfMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadColumn = useCallback(async (col: ProdColumn, page: number, append: boolean) => {
    setBoard(prev => ({ ...prev, [col]: { ...prev[col], loading: true } }));
    try {
      const res = await fetchProductionOrders(col, page);
      setBoard(prev => ({
        ...prev,
        [col]: {
          orders: append ? [...prev[col].orders, ...res.orders] : res.orders,
          page: res.page,
          hasMore: res.has_more,
          loading: false,
        },
      }));
    } catch {
      setBoard(prev => ({ ...prev, [col]: { ...prev[col], loading: false } }));
    }
  }, []);

  // Gate de acceso: al resolver la sesión, preguntar al servidor si el usuario
  // tiene el permiso; si lo tiene, cargar ambas columnas.
  useEffect(() => {
    if (isLoading) return;
    if (!user) { setAccess('guest'); return; }
    let alive = true;
    setAccess('checking');
    fetchProductionAccess().then(can => {
      if (!alive) return;
      if (can) {
        setAccess('granted');
        loadColumn('processing', 1, false);
        loadColumn('pendiente-guia', 1, false);
      } else {
        setAccess('denied');
      }
    });
    return () => { alive = false; };
  }, [user, isLoading, loadColumn]);

  const loadPdfs = useCallback(async () => {
    setPdfsLoading(true);
    try {
      setPdfs(await listProductionPdfs());
    } catch {
      setPdfs([]);
    } finally {
      setPdfsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (access === 'granted' && tab === 'pdfs') {
      loadPdfs();
    }
  }, [access, tab, loadPdfs]);

  const openDetail = async (id: number) => {
    setDetail(null);
    setDetailLoading(true);
    try {
      setDetail(await fetchProductionOrderDetail(id));
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeModal = () => { setDetail(null); setDetailLoading(false); };

  const handleTake = async (id: number) => {
    setActionBusy(true);
    try {
      await takeProductionOrder(id);
      closeModal();
      loadColumn('processing', 1, false);
    } finally {
      setActionBusy(false);
    }
  };

  const handleFinish = async (id: number) => {
    setActionBusy(true);
    try {
      await finishProductionOrder(id);
      closeModal();
      loadColumn('processing', 1, false);
      loadColumn('pendiente-guia', 1, false);
    } finally {
      setActionBusy(false);
    }
  };

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) { setPdfMsg({ type: 'err', text: 'Selecciona un PDF.' }); return; }
    setUploading(true);
    setPdfMsg(null);
    try {
      const res = await uploadProductionPdf(file);
      if (res.success) {
        setPdfMsg({ type: 'ok', text: `✓ PDF vinculado a "${res.product_name}".` });
        if (fileRef.current) fileRef.current.value = '';
        loadPdfs();
      } else {
        let text = res.message || 'Error al subir.';
        if (res.suggestions && res.suggestions.length) {
          text += ` ¿Quisiste decir?: ${res.suggestions.join(' · ')}`;
        }
        setPdfMsg({ type: 'err', text });
      }
    } catch {
      setPdfMsg({ type: 'err', text: 'Error de red al subir el PDF.' });
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePdf = async (id: number) => {
    if (!confirm('¿Eliminar este patrón?')) return;
    try {
      await deleteProductionPdf(id);
      loadPdfs();
    } catch {
      /* noop */
    }
  };

  // ---- Estados de acceso ----
  if (isLoading || access === 'checking') {
    return (
      <div className="np-gate">
        <div className="nk-spinner" />
        <p>Verificando acceso…</p>
        <style jsx>{gateStyles}</style>
      </div>
    );
  }

  if (access === 'guest') {
    return (
      <div className="np-gate">
        <h1>Panel de Producción</h1>
        <p>Inicia sesión con una cuenta con permiso de producción para continuar.</p>
        <Link href="/mi-cuenta?return=/produccion/" className="nk-btn">Iniciar sesión</Link>
        <style jsx>{gateStyles}</style>
      </div>
    );
  }

  if (access === 'denied') {
    return (
      <div className="np-gate">
        <h1>Acceso denegado</h1>
        <p>Tu cuenta no tiene permiso para el Panel de Producción. Solicítalo a un administrador.</p>
        <Link href="/mi-cuenta/" className="nk-btn-sec">Volver a Mi Cuenta</Link>
        <style jsx>{gateStyles}</style>
      </div>
    );
  }

  // ---- Panel ----
  return (
    <div className="np-page">
      <header className="np-header">
        <h1>Panel de Producción</h1>
        <div className="np-tabs">
          <button className={`np-tab ${tab === 'board' ? 'is-active' : ''}`} onClick={() => setTab('board')}>Tablero</button>
          <button className={`np-tab ${tab === 'pdfs' ? 'is-active' : ''}`} onClick={() => setTab('pdfs')}>Patrones (PDF)</button>
        </div>
      </header>

      {tab === 'board' && (
        <div className="np-board">
          <Column
            title="En proceso"
            variant="processing"
            state={board['processing']}
            onCard={openDetail}
            onMore={() => loadColumn('processing', board['processing'].page + 1, true)}
          />
          <Column
            title="Pendiente de guía"
            variant="pending"
            state={board['pendiente-guia']}
            onCard={openDetail}
            onMore={() => loadColumn('pendiente-guia', board['pendiente-guia'].page + 1, true)}
          />
        </div>
      )}

      {tab === 'pdfs' && (
        <div className="np-pdfs">
          <div className="np-pdf-upload">
            <h2>Subir patrón (PDF)</h2>
            <p>El nombre del archivo debe coincidir con el nombre del producto. Ej: <code>Hoodie One Piece.pdf</code></p>
            <input type="file" accept="application/pdf" ref={fileRef} />
            <button className="nk-btn" onClick={handleUpload} disabled={uploading}>
              {uploading ? 'Subiendo…' : 'Subir PDF'}
            </button>
            {pdfMsg && <div className={`np-pdf-msg ${pdfMsg.type}`}>{pdfMsg.text}</div>}
          </div>

          <div className="np-pdf-list">
            {pdfsLoading ? (
              <p className="np-empty">Cargando…</p>
            ) : pdfs.length === 0 ? (
              <p className="np-empty">Aún no hay patrones subidos.</p>
            ) : (
              pdfs.map(p => (
                <div key={p.id} className="np-pdf-item">
                  <span className="np-pdf-name">{p.product_name}</span>
                  <div className="np-pdf-actions">
                    <a href={p.pdf_url} target="_blank" rel="noopener noreferrer">Ver</a>
                    <button className="np-pdf-del" onClick={() => handleDeletePdf(p.id)}>Eliminar</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {(detail || detailLoading) && (
        <div className="np-modal" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="np-modal-box">
            <button className="np-modal-close" aria-label="Cerrar" onClick={closeModal}>&times;</button>
            {detailLoading || !detail ? (
              <p className="np-empty">Cargando…</p>
            ) : (
              <>
                <h2>Pedido #{detail.number}</h2>
                {detail.products.map((p, i) => (
                  <div key={i} className="np-prod-row">
                    <span className="np-prod-name">{p.name}</span>
                    <div className="np-prod-attrs">
                      {p.talla && <span className="np-attr">Talla: {p.talla}</span>}
                      {p.estilo && <span className="np-attr">Estilo: {p.estilo}</span>}
                      {p.color && <span className="np-attr">Color: {p.color}</span>}
                      <span className="np-attr">Cant: {p.qty}</span>
                    </div>
                    {p.pdf_url && (
                      <a className="nk-btn np-btn-sm" href={p.pdf_url} target="_blank" rel="noopener noreferrer">Ver patrón (PDF)</a>
                    )}
                  </div>
                ))}
                {detail.status === 'processing' && (
                  <div className="np-modal-actions">
                    <button className="nk-btn-sec" disabled={actionBusy} onClick={() => handleTake(detail.id)}>
                      {detail.taken ? 'Re-tomar pedido' : 'Tomar pedido'}
                    </button>
                    <button className="nk-btn" disabled={actionBusy} onClick={() => handleFinish(detail.id)}>
                      Finalizar producción
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <style jsx>{panelStyles}</style>
    </div>
  );
}

/* ---- Columna del tablero ---- */
function Column({ title, variant, state, onCard, onMore }: {
  title: string;
  variant: 'processing' | 'pending';
  state: ColState;
  onCard: (id: number) => void;
  onMore: () => void;
}) {
  return (
    <div className="np-col">
      <h2 className={`np-col-title np-col-${variant}`}>{title}</h2>
      <div className="np-cards">
        {state.orders.length === 0 && !state.loading ? (
          <p className="np-empty">Sin pedidos.</p>
        ) : (
          state.orders.map(o => <Card key={o.id} order={o} onClick={() => onCard(o.id)} />)
        )}
        {state.loading && state.orders.length === 0 && <p className="np-empty">Cargando…</p>}
      </div>
      {state.hasMore && (
        <button className="np-more" onClick={onMore} disabled={state.loading}>
          {state.loading ? '…' : 'Ver más'}
        </button>
      )}
    </div>
  );
}

/* ---- Tarjeta de pedido ---- */
function Card({ order, onClick }: { order: ProdCard; onClick: () => void }) {
  return (
    <div className="np-card" onClick={onClick} role="button" tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter') onClick(); }}>
      <div className="np-card-top">
        <span className="np-card-num">#{order.number}</span>
        <span className="np-card-age">hace {order.age}</span>
      </div>
      <span className="np-card-count">{order.item_count} pza{order.item_count === 1 ? '' : 's'}</span>
      <div className="np-card-products">{order.products.join(', ')}</div>
      {order.taken && (
        <div className="np-card-taken">👤 {order.taken_by} · hace {order.taken_age}</div>
      )}
    </div>
  );
}

const gateStyles = `
  .np-gate {
    min-height: 70vh;
    padding: calc(var(--header-padding) + 40px) 20px 60px;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    text-align: center; gap: 16px; background: var(--nk-bg-wrapper);
  }
  .np-gate h1 { font-family: 'Teko', sans-serif; font-size: 3rem; text-transform: uppercase; color: var(--nk-text-main); margin: 0; }
  .np-gate p { color: var(--nk-text-sec); max-width: 460px; margin: 0; }
  .np-gate :global(.nk-btn), .np-gate :global(.nk-btn-sec) { text-decoration: none; }
`;

const panelStyles = `
  .np-page {
    min-height: 90vh;
    background:
      radial-gradient(color-mix(in srgb, var(--nk-border) 12%, transparent) 1px, transparent 1px) 0 0 / 20px 20px,
      var(--nk-bg-wrapper);
    padding: calc(var(--header-padding) + 10px) 0 60px;
  }

  .np-header {
    display: flex; flex-wrap: wrap; gap: 12px 24px; align-items: center; justify-content: space-between;
    padding: 16px 24px; margin-bottom: 20px;
    background: var(--nk-navy); border-bottom: 4px solid var(--nk-primary);
  }
  .np-header h1 {
    font-family: 'Teko', sans-serif; font-size: 2.4rem; line-height: 1; text-transform: uppercase;
    color: #fff; margin: 0;
  }
  .np-tabs { display: flex; gap: 10px; }
  .np-tab {
    font-family: 'Teko', sans-serif; font-size: 1.3rem; text-transform: uppercase; line-height: 1.1;
    padding: 6px 18px; background: var(--nk-bg-card); color: var(--nk-text-main);
    border: 2px solid var(--nk-border); box-shadow: 3px 3px 0 var(--nk-primary); cursor: pointer;
  }
  .np-tab.is-active { background: var(--nk-primary); color: #fff; box-shadow: 3px 3px 0 var(--nk-border); }

  .np-board { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; padding: 0 24px; }
  @media (max-width: 900px) { .np-board { grid-template-columns: 1fr; } }

  .np-col-title {
    font-family: 'Teko', sans-serif; font-size: 2rem; text-transform: uppercase; color: #fff;
    padding: 8px 14px; border: 3px solid var(--nk-border); box-shadow: var(--nk-manga-shadow);
    margin: 0 0 18px;
  }
  .np-col-processing { background: var(--nk-primary); }
  .np-col-pending { background: #fbbf24; color: #1A1F2B; }

  .np-cards { display: flex; flex-direction: column; gap: 14px; }

  .np-card {
    background: var(--nk-bg-card); border: 3px solid var(--nk-border); box-shadow: var(--nk-manga-shadow);
    padding: 14px 16px; cursor: pointer; transition: transform .08s ease, box-shadow .08s ease;
  }
  .np-card:hover { transform: translate(2px,2px); box-shadow: 2px 2px 0 var(--nk-border); }
  .np-card-top { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; }
  .np-card-num { font-family: 'Teko', sans-serif; font-size: 1.7rem; line-height: 1; color: var(--nk-text-main); }
  .np-card-age { font-size: .8rem; color: var(--nk-text-sec); white-space: nowrap; }
  .np-card-count {
    display: inline-block; margin: 8px 0; font-weight: 800; font-size: .75rem; text-transform: uppercase;
    background: var(--nk-accent); color: #fff; padding: 2px 8px;
  }
  .np-card-products { font-size: .92rem; line-height: 1.35; color: var(--nk-text-main); }
  .np-card-taken {
    margin-top: 10px; font-size: .82rem; font-weight: 600; color: var(--nk-text-main);
    background: var(--nk-bg-wrapper); border-left: 3px solid var(--nk-primary); padding: 4px 8px;
  }

  .np-more {
    margin-top: 16px; width: 100%; font-family: 'Teko', sans-serif; font-size: 1.3rem; text-transform: uppercase;
    background: var(--nk-bg-card); color: var(--nk-text-main); border: 2px solid var(--nk-border);
    box-shadow: 3px 3px 0 var(--nk-border); padding: 8px; cursor: pointer;
  }
  .np-more:hover { transform: translate(2px,2px); box-shadow: 1px 1px 0 var(--nk-border); }

  .np-empty { font-style: italic; color: var(--nk-text-sec); padding: 12px 4px; }

  /* Modal */
  .np-modal {
    position: fixed; inset: 0; z-index: 100000; background: rgba(0,0,0,.6);
    display: flex; align-items: center; justify-content: center; padding: 20px;
  }
  .np-modal-box {
    background: var(--nk-bg-card); border: 4px solid var(--nk-border); box-shadow: var(--nk-manga-shadow-lg);
    max-width: 640px; width: 100%; max-height: 88vh; overflow: auto; position: relative; padding: 24px;
  }
  .np-modal-close {
    position: absolute; top: 8px; right: 14px; font-size: 2rem; line-height: 1; color: var(--nk-text-main);
    background: none; border: none; cursor: pointer;
  }
  .np-modal-box h2 { font-family: 'Teko', sans-serif; font-size: 2rem; text-transform: uppercase; color: var(--nk-text-main); margin: 0 0 12px; }
  .np-prod-row {
    border: 2px solid var(--nk-border); padding: 12px; margin-bottom: 12px;
    display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; justify-content: space-between;
  }
  .np-prod-name { font-weight: 800; font-size: 1rem; flex: 1 1 200px; color: var(--nk-text-main); }
  .np-prod-attrs { display: flex; flex-wrap: wrap; gap: 6px; }
  .np-attr {
    font-size: .78rem; font-weight: 700; text-transform: uppercase; color: var(--nk-text-main);
    border: 2px solid var(--nk-border); padding: 2px 8px; background: var(--nk-bg-wrapper);
  }
  .np-modal-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 18px; }
  .np-modal-actions :global(.nk-btn), .np-modal-actions :global(.nk-btn-sec) { flex: 1 1 180px; text-align: center; }
  .np-btn-sm { font-size: .8rem !important; padding: 6px 12px !important; text-decoration: none; }

  /* PDFs */
  .np-pdfs { padding: 0 24px; }
  .np-pdf-upload {
    background: var(--nk-bg-card); border: 3px solid var(--nk-border); box-shadow: var(--nk-manga-shadow);
    padding: 20px; margin-bottom: 24px; max-width: 640px;
  }
  .np-pdf-upload h2 { font-family: 'Teko', sans-serif; font-size: 1.8rem; text-transform: uppercase; color: var(--nk-text-main); margin: 0 0 6px; }
  .np-pdf-upload p { color: var(--nk-text-sec); font-size: .9rem; margin: 0 0 12px; }
  .np-pdf-upload input[type=file] { display: block; margin-bottom: 14px; color: var(--nk-text-main); }
  .np-pdf-upload :global(.nk-btn) { text-decoration: none; }
  .np-pdf-msg { margin-top: 12px; font-size: .9rem; font-weight: 700; }
  .np-pdf-msg.ok { color: #1a7f37; }
  .np-pdf-msg.err { color: #b32d2e; }
  .np-pdf-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px,1fr)); gap: 14px; }
  .np-pdf-item {
    background: var(--nk-bg-card); border: 3px solid var(--nk-border); box-shadow: var(--nk-manga-shadow);
    padding: 12px; display: flex; flex-direction: column; gap: 8px;
  }
  .np-pdf-name { font-weight: 800; font-size: .95rem; color: var(--nk-text-main); }
  .np-pdf-actions { display: flex; gap: 8px; }
  .np-pdf-actions a, .np-pdf-actions button {
    font-size: .78rem; font-weight: 700; text-transform: uppercase; text-decoration: none;
    border: 2px solid var(--nk-border); padding: 4px 10px; cursor: pointer;
    background: var(--nk-bg-wrapper); color: var(--nk-text-main);
  }
  .np-pdf-del { background: #b32d2e; color: #fff; border-color: #b32d2e; }
`;
