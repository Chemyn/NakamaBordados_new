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
  validateProductionItem,
  reviewProductionOrder,
  reassignProductionOrder,
  listProductionPdfs,
  uploadProductionPdf,
  deleteProductionPdf,
  ProdCard,
  ProdColumn,
  ProdOrderDetail,
  ProdPdf,
  ProdReviewItemInput,
} from '@/lib/production-api';
import { ProductionReviewPanel } from './ProductionReviewPanel';
import { ProductionReports } from './ProductionReports';
import { uploadProductionPdfBatch } from '@/lib/production-pdf-batch';

type AccessState = 'checking' | 'granted' | 'denied' | 'guest';
type ColState = { orders: ProdCard[]; page: number; hasMore: boolean; loading: boolean };
type Tab = 'board' | 'pdfs' | 'reports';
type ColVariant = 'processing' | 'taken' | 'pending';
/** Imagen ampliada + acceso al PDF del patrón. */
type Viewer = { img: string; pdf: string; name: string };

const EMPTY_COL: ColState = { orders: [], page: 1, hasMore: false, loading: false };

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

/**
 * Panel de Producción en el frontend headless. La protección real la impone el
 * servidor (permission_callback current_user_can en nakama/v1/production/*); este
 * gate es solo UX. Reutiliza los mismos endpoints REST que la versión de
 * wp-admin, autenticados con el JWT de la sesión.
 */
export default function ProduccionPage() {
  const { user, isLoading } = useAuth();

  const [access, setAccess] = useState<AccessState>('checking');
  const [canReview, setCanReview] = useState(false);
  const [tab, setTab] = useState<Tab>('board');
  const [board, setBoard] = useState<Record<ProdColumn, ColState>>({
    'processing': { ...EMPTY_COL },
    'tomados': { ...EMPTY_COL },
    'pendiente-guia': { ...EMPTY_COL },
  });
  const [detail, setDetail] = useState<ProdOrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [finishErr, setFinishErr] = useState<string | null>(null);
  const [validatingItem, setValidatingItem] = useState<number | null>(null);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [showReassign, setShowReassign] = useState(false);
  const [reassignReason, setReassignReason] = useState('');

  const [pdfs, setPdfs] = useState<ProdPdf[]>([]);
  const [pdfsLoading, setPdfsLoading] = useState(false);
  const [pdfMsg, setPdfMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedPdfCount, setSelectedPdfCount] = useState(0);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
  const fileRef = useRef<HTMLInputElement>(null);
  // ¿Se validó algún producto en el detalle abierto? Si sí, al cerrar refrescamos
  // las columnas de processing para actualizar los chips de progreso de las tarjetas.
  const validatedDirty = useRef(false);

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
    fetchProductionAccess().then(result => {
      if (!alive) return;
      setCanReview(result.can_review);
      if (result.can) {
        setAccess('granted');
        loadColumn('processing', 1, false);
        loadColumn('tomados', 1, false);
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
    setFinishErr(null);
    validatedDirty.current = false;
    setShowReassign(false);
    setReassignReason('');
    setDetailLoading(true);
    try {
      setDetail(await fetchProductionOrderDetail(id));
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeModal = () => {
    if (validatedDirty.current) {
      // Reflejar el nuevo progreso en los chips de las tarjetas sin recargar todo.
      loadColumn('processing', 1, false);
      loadColumn('tomados', 1, false);
      validatedDirty.current = false;
    }
    setDetail(null);
    setDetailLoading(false);
    setFinishErr(null);
    setShowReassign(false);
    setReassignReason('');
  };

  const handleTake = async (id: number) => {
    setActionBusy(true);
    setFinishErr(null);
    try {
      await takeProductionOrder(id);
      closeModal();
      // El pedido pasa de "En proceso" a "Tomados": refrescar ambas columnas.
      loadColumn('processing', 1, false);
      loadColumn('tomados', 1, false);
    } catch (err) {
      setFinishErr(err instanceof Error ? err.message : 'No se pudo tomar el pedido.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleReview = async (
    id: number,
    decision: 'approved' | 'rework',
    items: ProdReviewItemInput[],
  ) => {
    setActionBusy(true);
    try {
      await reviewProductionOrder(id, decision, items);
      closeModal();
      loadColumn('processing', 1, false);
      loadColumn('tomados', 1, false);
      loadColumn('pendiente-guia', 1, false);
    } finally {
      setActionBusy(false);
    }
  };

  const handleReassign = async (id: number) => {
    const reason = reassignReason.trim();
    if (!reason) {
      setFinishErr('Indica el motivo para liberar el pedido.');
      return;
    }
    setActionBusy(true);
    setFinishErr(null);
    try {
      await reassignProductionOrder(id, reason);
      closeModal();
      loadColumn('processing', 1, false);
      loadColumn('tomados', 1, false);
    } catch (err) {
      setFinishErr(err instanceof Error ? err.message : 'No se pudo liberar el pedido.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleFinish = async (id: number) => {
    setActionBusy(true);
    setFinishErr(null);
    try {
      await finishProductionOrder(id);
      closeModal();
      loadColumn('processing', 1, false);
      loadColumn('tomados', 1, false);
      loadColumn('pendiente-guia', 1, false);
    } catch (err) {
      setFinishErr(err instanceof Error ? err.message : 'No se pudo finalizar.');
    } finally {
      setActionBusy(false);
    }
  };

  // Marca/desmarca un producto y actualiza el detalle en memoria con el progreso
  // que devuelve el servidor (fuente de verdad).
  const handleValidate = async (itemId: number, validated: boolean) => {
    if (!detail) return;
    setValidatingItem(itemId);
    try {
      const progress = await validateProductionItem(detail.id, itemId, validated);
      setDetail(prev => prev && ({
        ...prev,
        products: prev.products.map(p => p.item_id === itemId ? { ...p, validated } : p),
        progress,
      }));
      validatedDirty.current = true;
      setFinishErr(null);
    } catch (err) {
      setFinishErr(err instanceof Error ? err.message : 'No se pudo validar.');
    } finally {
      setValidatingItem(null);
    }
  };

  const handleUpload = async () => {
    const files = Array.from(fileRef.current?.files ?? []);
    if (!files.length) { setPdfMsg({ type: 'err', text: 'Selecciona uno o varios PDF.' }); return; }
    setUploading(true);
    setUploadProgress({ done: 0, total: files.length });
    setPdfMsg(null);
    const result = await uploadProductionPdfBatch(files, uploadProductionPdf, (done, total) => {
      setUploadProgress({ done, total });
    });

    if (fileRef.current) fileRef.current.value = '';
    setSelectedPdfCount(0);
    setUploading(false);

    if (result.uploaded > 0) {
      void loadPdfs();
    }

    if (result.failures.length === 0) {
      setPdfMsg({
        type: 'ok',
        text: `✓ ${result.uploaded} ${result.uploaded === 1 ? 'patrón subido' : 'patrones subidos'} correctamente.`,
      });
      return;
    }

    const details = result.failures
      .map(({ fileName, message }) => `${fileName}: ${message}`)
      .join(' | ');
    setPdfMsg({
      type: 'err',
      text: `${result.uploaded} de ${files.length} archivos se subieron. Fallaron: ${details}`,
    });
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
          {canReview && (
            <button className={`np-tab ${tab === 'reports' ? 'is-active' : ''}`} onClick={() => setTab('reports')}>Reportes</button>
          )}
        </div>
      </header>

      {tab === 'board' && (
        <div className="np-board">
          <Column
            title="En espera de fabricación"
            variant="processing"
            state={board['processing']}
            onCard={openDetail}
            onMore={() => loadColumn('processing', board['processing'].page + 1, true)}
          />
          <Column
            title="Fabricando"
            variant="taken"
            state={board['tomados']}
            onCard={openDetail}
            onMore={() => loadColumn('tomados', board['tomados'].page + 1, true)}
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
            <h2>Subir patrones (PDF)</h2>
            <p id="np-pdf-upload-help">Selecciona uno o varios archivos. Cada nombre debe coincidir con el <strong>SKU del producto</strong>. Ej: <code>HOD-001.pdf</code></p>
            <input
              type="file"
              accept=".pdf,application/pdf"
              multiple
              ref={fileRef}
              disabled={uploading}
              aria-describedby="np-pdf-upload-help"
              onChange={(event) => {
                setSelectedPdfCount(event.currentTarget.files?.length ?? 0);
                setPdfMsg(null);
              }}
            />
            <button className="nk-btn" onClick={handleUpload} disabled={uploading || selectedPdfCount === 0}>
              {uploading
                ? `Subiendo ${uploadProgress.done}/${uploadProgress.total}…`
                : selectedPdfCount > 0
                  ? `Subir ${selectedPdfCount} ${selectedPdfCount === 1 ? 'PDF' : 'PDFs'}`
                  : 'Subir PDFs'}
            </button>
            {pdfMsg && (
              <div
                className={`np-pdf-msg ${pdfMsg.type}`}
                role="status"
                aria-live="polite"
              >
                {pdfMsg.text}
              </div>
            )}
          </div>

          <div className="np-pdf-list">
            {pdfsLoading ? (
              <p className="np-empty">Cargando…</p>
            ) : pdfs.length === 0 ? (
              <p className="np-empty">Aún no hay patrones subidos.</p>
            ) : (
              pdfs.map(p => (
                <div key={p.id} className="np-pdf-item">
                  <div className="np-pdf-info">
                    <span className="np-pdf-name">{p.product_name}</span>
                    {p.sku && <span className="np-pdf-sku">SKU: {p.sku}</span>}
                  </div>
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

      {tab === 'reports' && canReview && <ProductionReports />}

      {(detail || detailLoading) && (
        <div className="np-modal" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="np-modal-box">
            <button className="np-modal-close" aria-label="Cerrar" onClick={closeModal}>&times;</button>
            {detailLoading || !detail ? (
              <p className="np-empty">Cargando…</p>
            ) : (
              <>
                <h2>{detail.is_quote ? `Cotización ${detail.quote_folio || detail.number}` : `Pedido #${detail.number}`}</h2>

                {detail.is_quote && (
                  <div className="np-quote-block">
                    {detail.quote_pdf_url ? (
                      <a className="nk-btn np-btn-sm" href={detail.quote_pdf_url} target="_blank" rel="noopener noreferrer">Ver PDF de cotización</a>
                    ) : (
                      <div className="np-quote-nopdf">PDF no disponible (cotización anterior).</div>
                    )}
                  </div>
                )}

                {(detail.status === 'processing' || detail.status === 'fabricando') && (
                  <div className="np-progress">
                    <div className="np-progress-bar">
                      <span style={{ width: `${detail.progress.pct}%` }}
                        className={detail.progress.pct === 100 ? 'is-full' : ''} />
                    </div>
                    <span className="np-progress-label">
                      {detail.progress.validated}/{detail.progress.total} productos validados ({detail.progress.pct}%)
                    </span>
                  </div>
                )}

                {detail.products.map(p => {
                  const canValidate = detail.status === 'fabricando' && detail.is_cycle_owner;
                  return (
                    <div key={p.item_id} className={`np-prod-row ${p.validated ? 'is-validated' : ''}`}>
                      {p.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          className="np-prod-thumb"
                          src={p.image_url}
                          alt={p.name}
                          onClick={() => setViewer({ img: p.image_full || p.image_url, pdf: p.pdf_url, name: p.name })}
                        />
                      ) : (
                        <span className="np-prod-thumb np-prod-thumb-empty">👕</span>
                      )}
                      <div className="np-prod-main">
                        <span className="np-prod-name">{p.name}</span>
                        <div className="np-prod-attrs">
                          {p.sku && <span className="np-attr">SKU: {p.sku}</span>}
                          {p.talla && <span className="np-attr">Talla: {p.talla}</span>}
                          {p.estilo && <span className="np-attr">Estilo: {p.estilo}</span>}
                          {p.color && <span className="np-attr">Color: {p.color}</span>}
                          <span className="np-attr">Cant: {p.qty}</span>
                        </div>
                        {p.pdf_url && (
                          <a className="nk-btn np-btn-sm" href={p.pdf_url} target="_blank" rel="noopener noreferrer">Ver patrón (PDF)</a>
                        )}
                        {p.rework_quantity > 0 && (
                          <div className="np-rework-note">
                            <strong>Retrabajo: {p.rework_quantity} pieza{p.rework_quantity === 1 ? '' : 's'}</strong>
                            <span>{p.rework_comment}</span>
                          </div>
                        )}
                      </div>
                      {canValidate && (
                        <label className="np-check">
                          <input
                            type="checkbox"
                            checked={p.validated}
                            disabled={validatingItem === p.item_id}
                            onChange={e => handleValidate(p.item_id, e.target.checked)}
                          />
                          <span>Validado</span>
                        </label>
                      )}
                    </div>
                  );
                })}

                {detail.cycles.length > 0 && (
                  <section className="np-cycle-history">
                    <div className="np-cycle-heading">
                      <h3>Historial de produccion</h3>
                      <strong>Total: {formatDuration(detail.total_duration_seconds)}</strong>
                    </div>
                    {detail.cycles.map(cycle => (
                      <div className="np-cycle-row" key={cycle.id}>
                        <span className={cycle.type === 'rework' ? 'is-rework' : ''}>
                          Ciclo {cycle.number} · {cycle.type === 'rework' ? 'Retrabajo' : 'Inicial'}
                        </span>
                        <strong>{cycle.operator_name || 'Sin operador'}</strong>
                        <span>{cycle.units_total} pzas</span>
                        <span>{cycle.status === 'active' ? 'En curso' : formatDuration(cycle.duration_seconds)}</span>
                      </div>
                    ))}
                  </section>
                )}

                {detail.status === 'pendiente-guia' && detail.can_review && (
                  <ProductionReviewPanel
                    order={detail}
                    busy={actionBusy}
                    onReview={(decision, items) => handleReview(detail.id, decision, items)}
                  />
                )}

                {detail.status === 'pendiente-guia' && !detail.can_review && (
                  <div className="np-quality-wait">Pendiente de revision por un supervisor de calidad.</div>
                )}

                {finishErr && <div className="np-finish-err">{finishErr}</div>}

                {detail.status === 'processing' && (
                  <div className="np-modal-actions">
                    <button className="nk-btn" disabled={actionBusy} onClick={() => handleTake(detail.id)}>
                      Tomar pedido
                    </button>
                  </div>
                )}

                {detail.status === 'fabricando' && detail.is_cycle_owner && (
                  <div className="np-modal-actions">
                    <button
                      className="nk-btn"
                      disabled={actionBusy || detail.progress.pct < 100}
                      title={detail.progress.pct < 100 ? 'Valida todos los productos para finalizar' : undefined}
                      onClick={() => handleFinish(detail.id)}
                    >
                      {detail.progress.pct < 100 ? 'Valida todos los productos' : 'Finalizar producción'}
                    </button>
                  </div>
                )}

                {detail.status === 'fabricando' && !detail.is_cycle_owner && (
                  <div className="np-owner-notice">
                    Este ciclo esta asignado a <strong>{detail.taken_by || 'otro operador'}</strong>.
                  </div>
                )}

                {detail.status === 'fabricando' && detail.can_review && detail.active_cycle && (
                  <div className="np-reassign">
                    {!showReassign ? (
                      <button className="np-reassign-toggle" onClick={() => setShowReassign(true)}>Liberar asignacion</button>
                    ) : (
                      <>
                        <label>
                          Motivo de la liberacion
                          <textarea rows={2} value={reassignReason} onChange={event => setReassignReason(event.target.value)} />
                        </label>
                        <div className="np-reassign-actions">
                          <button className="nk-btn-sec" disabled={actionBusy} onClick={() => setShowReassign(false)}>Cancelar</button>
                          <button className="nk-btn" disabled={actionBusy || !reassignReason.trim()} onClick={() => handleReassign(detail.id)}>Liberar pedido</button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {viewer && (
        <div className="np-viewer" onClick={e => { if (e.target === e.currentTarget) setViewer(null); }}>
          <button className="np-viewer-close" aria-label="Cerrar" onClick={() => setViewer(null)}>&times;</button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="np-viewer-img" src={viewer.img} alt={viewer.name} />
          <div className="np-viewer-bar">
            <span className="np-viewer-name">{viewer.name}</span>
            {viewer.pdf && (
              <a className="nk-btn np-btn-sm" href={viewer.pdf} target="_blank" rel="noopener noreferrer">Ver patrón (PDF)</a>
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
  variant: ColVariant;
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
          state.orders.map(o => (
            <Card key={o.id} order={o} showProgress={variant !== 'pending'} onClick={() => onCard(o.id)} />
          ))
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
function Card({ order, showProgress, onClick }: { order: ProdCard; showProgress: boolean; onClick: () => void }) {
  const pr = order.progress;
  const withProgress = showProgress && pr && pr.total > 0;
  const full = withProgress && pr.pct === 100;
  return (
    <div className="np-card" onClick={onClick} role="button" tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter') onClick(); }}>
      <div className="np-card-top">
        <span className="np-card-num">#{order.number}</span>
        <span className="np-card-age">hace {order.age}</span>
      </div>
      <span className="np-card-count">{order.item_count} pza{order.item_count === 1 ? '' : 's'}</span>
      {order.is_quote && <span className="np-card-quote">Cotización</span>}
      <div className="np-card-badges">
        {order.cycle_number > 0 && <span>Ciclo {order.cycle_number}</span>}
        {order.quality_status === 'pending_review' && <span className="quality">Revision de calidad</span>}
        {order.quality_status === 'approved' && <span className="approved">Calidad aprobada</span>}
        {order.rework_units > 0 && <span className="rework">{order.rework_units} pza en retrabajo</span>}
      </div>
      <div className="np-card-products">{order.products.join(', ')}</div>
      {withProgress && (
        <div className="np-card-progress">
          <div className="np-progress-bar">
            <span style={{ width: `${pr.pct}%` }} className={full ? 'is-full' : ''} />
          </div>
          <span className={`np-card-pct ${full ? 'is-full' : ''}`}>{pr.validated}/{pr.total} · {pr.pct}%</span>
        </div>
      )}
      {order.taken && (
        <div className="np-card-taken"><i className="bi bi-person-fill" aria-hidden="true" /> {order.taken_by} · hace {order.taken_age}</div>
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

  .np-board { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; padding: 0 24px; }
  @media (max-width: 1100px) { .np-board { grid-template-columns: 1fr 1fr; } }
  @media (max-width: 720px) { .np-board { grid-template-columns: 1fr; } }

  .np-col-title {
    font-family: 'Teko', sans-serif; font-size: 2rem; text-transform: uppercase; color: #fff;
    padding: 8px 14px; border: 3px solid var(--nk-border); box-shadow: var(--nk-manga-shadow);
    margin: 0 0 18px;
  }
  .np-col-processing { background: var(--nk-primary); }
  .np-col-taken { background: #2563eb; color: #fff; }
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
  .np-card-quote {
    display: inline-block; margin: 0 0 8px 6px; font-weight: 800; font-size: .7rem; text-transform: uppercase;
    background: var(--nk-amber, #f5a623); color: #1A1F2B; border: 2px solid var(--nk-border); padding: 1px 7px;
  }
  .np-card-products { font-size: .92rem; line-height: 1.35; color: var(--nk-text-main); }
  .np-card-badges { display: flex; flex-wrap: wrap; gap: 5px; margin: 0 0 8px; }
  .np-card-badges span { background: var(--nk-bg-wrapper); border: 1px solid var(--nk-border); color: var(--nk-text-main); font-size: .66rem; font-weight: 800; padding: 2px 6px; text-transform: uppercase; }
  .np-card-badges .quality { background: #fef3c7; color: #713f12; }
  .np-card-badges .approved { background: #dcfce7; color: #166534; }
  .np-card-badges .rework { background: #fee2e2; color: #991b1b; }
  .np-card-progress { display: flex; align-items: center; gap: 8px; margin-top: 10px; }
  .np-card-progress .np-progress-bar { flex: 1; }
  .np-card-pct { font-size: .72rem; font-weight: 800; color: var(--nk-text-sec); white-space: nowrap; }
  .np-card-pct.is-full { color: #1a7f37; }
  .np-card-taken {
    margin-top: 10px; font-size: .82rem; font-weight: 600; color: var(--nk-text-main);
    background: var(--nk-bg-wrapper); border-left: 3px solid var(--nk-primary); padding: 4px 8px;
  }

  /* Barra de progreso (tarjeta y modal) */
  .np-progress-bar {
    height: 8px; background: var(--nk-bg-wrapper); border: 2px solid var(--nk-border); overflow: hidden;
  }
  .np-progress-bar span { display: block; height: 100%; background: var(--nk-accent); transition: width .2s ease; }
  .np-progress-bar span.is-full { background: #1a7f37; }

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

  .np-quote-block { margin: 0 0 16px; }
  .np-quote-block :global(.nk-btn) { text-decoration: none; }
  .np-quote-nopdf { font-style: italic; color: var(--nk-text-sec); font-size: .9rem; }

  .np-progress { margin: 0 0 16px; }
  .np-progress-label { display: block; margin-top: 6px; font-size: .82rem; font-weight: 700; color: var(--nk-text-sec); }

  .np-prod-row {
    border: 2px solid var(--nk-border); padding: 12px; margin-bottom: 12px;
    display: flex; flex-wrap: wrap; gap: 12px; align-items: center;
  }
  .np-prod-row.is-validated { border-color: #1a7f37; background: color-mix(in srgb, #1a7f37 8%, transparent); }
  .np-prod-thumb {
    width: 60px; height: 60px; object-fit: cover; border: 2px solid var(--nk-border);
    cursor: pointer; flex: 0 0 auto; background: var(--nk-bg-wrapper);
  }
  .np-prod-thumb-empty {
    display: flex; align-items: center; justify-content: center; font-size: 1.6rem; cursor: default;
  }
  .np-prod-main { flex: 1 1 200px; display: flex; flex-direction: column; gap: 8px; }
  .np-prod-name { font-weight: 800; font-size: 1rem; color: var(--nk-text-main); }
  .np-prod-attrs { display: flex; flex-wrap: wrap; gap: 6px; }
  .np-attr {
    font-size: .78rem; font-weight: 700; text-transform: uppercase; color: var(--nk-text-main);
    border: 2px solid var(--nk-border); padding: 2px 8px; background: var(--nk-bg-wrapper);
  }
  .np-check {
    display: flex; align-items: center; gap: 6px; font-size: .82rem; font-weight: 800; text-transform: uppercase;
    color: var(--nk-text-main); cursor: pointer; flex: 0 0 auto; user-select: none;
  }
  .np-check input { width: 20px; height: 20px; cursor: pointer; accent-color: #1a7f37; }
  .np-rework-note { background: color-mix(in srgb, #b32d2e 7%, var(--nk-bg-card)); border-left: 4px solid #b32d2e; color: var(--nk-text-main); display: flex; flex-direction: column; font-size: .82rem; gap: 3px; padding: 8px 10px; }
  .np-rework-note strong { color: #b32d2e; font-size: .72rem; text-transform: uppercase; }
  .np-cycle-history { border-top: 3px solid var(--nk-border); margin-top: 18px; padding-top: 14px; }
  .np-cycle-heading { align-items: center; display: flex; justify-content: space-between; margin-bottom: 8px; }
  .np-cycle-heading h3 { color: var(--nk-text-main); font-family: 'Teko', sans-serif; font-size: 1.5rem; margin: 0; text-transform: uppercase; }
  .np-cycle-heading > strong { color: var(--nk-text-sec); font-size: .78rem; }
  .np-cycle-row { align-items: center; border-bottom: 1px solid var(--nk-border); color: var(--nk-text-sec); display: grid; font-size: .75rem; gap: 8px; grid-template-columns: 1.25fr 1fr auto auto; padding: 8px 0; }
  .np-cycle-row strong { color: var(--nk-text-main); }
  .np-cycle-row .is-rework { color: #b32d2e; font-weight: 800; }
  .np-quality-wait, .np-owner-notice { background: var(--nk-bg-wrapper); border: 2px solid var(--nk-border); color: var(--nk-text-main); font-size: .86rem; margin-top: 16px; padding: 10px 12px; }
  .np-finish-err {
    margin-top: 14px; font-size: .9rem; font-weight: 700; color: #b32d2e;
    border: 2px solid #b32d2e; background: color-mix(in srgb, #b32d2e 8%, transparent); padding: 8px 12px;
  }
  .np-modal-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 18px; }
  .np-modal-actions :global(.nk-btn), .np-modal-actions :global(.nk-btn-sec) { flex: 1 1 180px; text-align: center; }
  .np-modal-actions :global(.nk-btn):disabled { opacity: .55; cursor: not-allowed; }
  .np-reassign { border-top: 2px solid var(--nk-border); margin-top: 16px; padding-top: 14px; }
  .np-reassign-toggle { background: transparent; border: 0; color: #b32d2e; cursor: pointer; font-size: .78rem; font-weight: 800; padding: 0; text-decoration: underline; text-transform: uppercase; }
  .np-reassign label { color: var(--nk-text-main); display: flex; flex-direction: column; font-size: .75rem; font-weight: 800; gap: 5px; text-transform: uppercase; }
  .np-reassign textarea { background: var(--nk-bg-card); border: 2px solid var(--nk-border); color: var(--nk-text-main); font: inherit; padding: 8px; resize: vertical; text-transform: none; }
  .np-reassign-actions { display: flex; gap: 10px; margin-top: 10px; }
  .np-reassign-actions button { flex: 1; }
  @media (max-width: 560px) { .np-cycle-row { grid-template-columns: 1fr 1fr; } }
  .np-btn-sm { font-size: .8rem !important; padding: 6px 12px !important; text-decoration: none; }

  /* Visor de imagen a pantalla completa */
  .np-viewer {
    position: fixed; inset: 0; z-index: 100010; background: rgba(0,0,0,.92);
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; padding: 24px;
  }
  .np-viewer-img { max-width: 92vw; max-height: 78vh; object-fit: contain; border: 3px solid #fff; }
  .np-viewer-close {
    position: absolute; top: 14px; right: 22px; font-size: 2.6rem; line-height: 1; color: #fff;
    background: none; border: none; cursor: pointer;
  }
  .np-viewer-bar { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 14px; }
  .np-viewer-name { color: #fff; font-weight: 700; font-size: 1rem; }
  .np-viewer :global(.nk-btn) { text-decoration: none; }

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
  .np-pdf-info { display: flex; flex-direction: column; gap: 2px; }
  .np-pdf-name { font-weight: 800; font-size: .95rem; color: var(--nk-text-main); }
  .np-pdf-sku { font-size: .78rem; font-weight: 700; color: var(--nk-text-sec); }
  .np-pdf-actions { display: flex; gap: 8px; }
  .np-pdf-actions a, .np-pdf-actions button {
    font-size: .78rem; font-weight: 700; text-transform: uppercase; text-decoration: none;
    border: 2px solid var(--nk-border); padding: 4px 10px; cursor: pointer;
    background: var(--nk-bg-wrapper); color: var(--nk-text-main);
  }
  .np-pdf-del { background: #b32d2e; color: #fff; border-color: #b32d2e; }
`;
