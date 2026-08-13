'use client';

import { useMemo, useState } from 'react';
import type { ProdOrderDetail, ProdReviewItemInput } from '@/lib/production-api';

type ReviewState = Record<number, { rejected: boolean; quantity: number; comment: string }>;

export function ProductionReviewPanel({
  order,
  busy,
  onReview,
}: {
  order: ProdOrderDetail;
  busy: boolean;
  onReview: (decision: 'approved' | 'rework', items: ProdReviewItemInput[]) => Promise<void>;
}) {
  const [rows, setRows] = useState<ReviewState>(() => Object.fromEntries(
    order.products.map((product) => [product.item_id, { rejected: false, quantity: 1, comment: '' }]),
  ));
  const [error, setError] = useState<string | null>(null);

  const rejectedItems = useMemo<ProdReviewItemInput[]>(() => order.products.flatMap((product) => {
    const row = rows[product.item_id];
    if (!row?.rejected) return [];
    return [{
      item_id: product.item_id,
      quantity_rejected: row.quantity,
      comment: row.comment.trim(),
    }];
  }), [order.products, rows]);

  const updateRow = (itemId: number, patch: Partial<ReviewState[number]>) => {
    setRows((current) => ({ ...current, [itemId]: { ...current[itemId], ...patch } }));
    setError(null);
  };

  const submit = async (decision: 'approved' | 'rework') => {
    if (decision === 'approved' && rejectedItems.length) {
      setError('Desmarca los articulos rechazados para aprobar el pedido completo.');
      return;
    }
    if (decision === 'rework') {
      if (!rejectedItems.length) {
        setError('Selecciona al menos un articulo para devolver.');
        return;
      }
      const invalid = rejectedItems.find((item) => !item.comment);
      if (invalid) {
        setError('Cada articulo devuelto necesita un comentario.');
        return;
      }
    }

    setError(null);
    try {
      await onReview(decision, decision === 'rework' ? rejectedItems : []);
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'No se pudo guardar la revision.');
    }
  };

  return (
    <section className="np-review" aria-labelledby="np-review-title">
      <div className="np-review-head">
        <div>
          <span className="np-review-kicker">Control de calidad</span>
          <h3 id="np-review-title">Revision del ciclo {order.cycle_number || 1}</h3>
        </div>
        <span className="np-review-total">{order.products.reduce((sum, product) => sum + product.qty, 0)} piezas</span>
      </div>

      <div className="np-review-items">
        {order.products.map((product) => {
          const row = rows[product.item_id] || { rejected: false, quantity: 1, comment: '' };
          return (
            <div className={`np-review-item ${row.rejected ? 'is-rejected' : ''}`} key={product.item_id}>
              <label className="np-review-choice">
                <input
                  type="checkbox"
                  checked={row.rejected}
                  disabled={busy}
                  onChange={(event) => updateRow(product.item_id, { rejected: event.target.checked })}
                />
                <span>{row.rejected ? 'Requiere retrabajo' : 'Correcto'}</span>
              </label>
              <div className="np-review-product">
                <strong>{product.name}</strong>
                <span>Cantidad del pedido: {product.qty}</span>
              </div>
              {row.rejected && (
                <div className="np-review-fields">
                  <label>
                    Piezas rechazadas
                    <input
                      type="number"
                      min={1}
                      max={product.qty}
                      value={row.quantity}
                      disabled={busy}
                      onChange={(event) => updateRow(product.item_id, {
                        quantity: Math.max(1, Math.min(product.qty, Number(event.target.value) || 1)),
                      })}
                    />
                  </label>
                  <label>
                    Que hace falta corregir
                    <textarea
                      rows={2}
                      value={row.comment}
                      disabled={busy}
                      onChange={(event) => updateRow(product.item_id, { comment: event.target.value })}
                    />
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {order.has_shipping_guide && (
        <div className="np-guide-warning">
          Este pedido ya tiene guia. Al aprobar calidad se completara inmediatamente.
        </div>
      )}

      {error && <div className="np-review-error" role="alert">{error}</div>}
      <div className="np-review-actions">
        <button className="nk-btn-sec" disabled={busy} onClick={() => void submit('rework')}>
          Devolver a produccion
        </button>
        <button className="nk-btn" disabled={busy || rejectedItems.length > 0} onClick={() => void submit('approved')}>
          Aprobar calidad
        </button>
      </div>

      <style jsx>{`
        .np-review { margin-top: 20px; border-top: 4px solid var(--nk-border); padding-top: 18px; }
        .np-review-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
        .np-review-kicker { color: #b32d2e; font-size: .72rem; font-weight: 900; text-transform: uppercase; }
        .np-review h3 { color: var(--nk-text-main); font-family: 'Teko', sans-serif; font-size: 1.65rem; line-height: 1; margin: 3px 0 0; text-transform: uppercase; }
        .np-review-total { background: var(--nk-bg-wrapper); border: 2px solid var(--nk-border); color: var(--nk-text-main); font-size: .75rem; font-weight: 800; padding: 4px 8px; white-space: nowrap; }
        .np-review-items { display: grid; gap: 10px; }
        .np-review-item { border: 2px solid var(--nk-border); padding: 12px; }
        .np-review-item.is-rejected { background: color-mix(in srgb, #b32d2e 7%, var(--nk-bg-card)); border-color: #b32d2e; }
        .np-review-choice { align-items: center; color: var(--nk-text-main); cursor: pointer; display: flex; font-size: .8rem; font-weight: 900; gap: 8px; text-transform: uppercase; }
        .np-review-choice input { accent-color: #b32d2e; height: 20px; width: 20px; }
        .np-review-product { color: var(--nk-text-main); display: flex; flex-direction: column; gap: 2px; margin: 8px 0 0 28px; }
        .np-review-product span { color: var(--nk-text-sec); font-size: .78rem; }
        .np-review-fields { display: grid; gap: 10px; grid-template-columns: minmax(130px, .35fr) 1fr; margin: 12px 0 0 28px; }
        .np-review-fields label { color: var(--nk-text-main); display: flex; flex-direction: column; font-size: .75rem; font-weight: 800; gap: 4px; text-transform: uppercase; }
        .np-review-fields input, .np-review-fields textarea { background: var(--nk-bg-card); border: 2px solid var(--nk-border); color: var(--nk-text-main); font: inherit; padding: 8px; text-transform: none; width: 100%; }
        .np-review-fields textarea { min-height: 66px; resize: vertical; }
        .np-review-error { background: color-mix(in srgb, #b32d2e 8%, transparent); border: 2px solid #b32d2e; color: #b32d2e; font-size: .85rem; font-weight: 700; margin-top: 12px; padding: 8px 10px; }
        .np-guide-warning { background: #fef3c7; border: 2px solid #d97706; color: #713f12; font-size: .82rem; font-weight: 700; margin-top: 12px; padding: 8px 10px; }
        .np-review-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 16px; }
        .np-review-actions :global(.nk-btn), .np-review-actions :global(.nk-btn-sec) { flex: 1 1 190px; }
        .np-review-actions button:disabled { cursor: not-allowed; opacity: .55; }
        @media (max-width: 560px) { .np-review-fields { grid-template-columns: 1fr; margin-left: 0; } }
      `}</style>
    </section>
  );
}
