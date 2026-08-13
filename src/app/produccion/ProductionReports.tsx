'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchProductionReport, type ProdReport, type ProdReportPeriod } from '@/lib/production-api';

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftDate(anchor: string, period: ProdReportPeriod, direction: number): string {
  const date = new Date(`${anchor}T12:00:00`);
  if (period === 'week') date.setDate(date.getDate() + (7 * direction));
  else date.setMonth(date.getMonth() + direction);
  return dateKey(date);
}

function duration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function ProductionReports() {
  const [period, setPeriod] = useState<ProdReportPeriod>('week');
  const [anchor, setAnchor] = useState(() => dateKey(new Date()));
  const [report, setReport] = useState<ProdReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchProductionReport(period, anchor)
      .then((result) => {
        if (alive) {
          setReport(result);
          setSelectedKey(null);
        }
      })
      .catch((loadError) => {
        if (!alive) return;
        setReport(null);
        setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el reporte.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, [anchor, period, reloadKey]);

  const selectPeriod = (next: ProdReportPeriod) => {
    if (next === period) return;
    setLoading(true);
    setError(null);
    setPeriod(next);
  };

  const movePeriod = (direction: number) => {
    setLoading(true);
    setError(null);
    setAnchor((value) => shiftDate(value, period, direction));
  };

  const retry = () => {
    setLoading(true);
    setError(null);
    setReloadKey((value) => value + 1);
  };

  const goToday = () => {
    const today = dateKey(new Date());
    setLoading(true);
    setError(null);
    if (today === anchor) setReloadKey((value) => value + 1);
    else setAnchor(today);
  };

  const maxBar = useMemo(
    () => Math.max(1, ...(report?.series.map((point) => Math.max(point.reviewed_units, point.rejected_units)) || [1])),
    [report],
  );

  const visibleDetails = useMemo(() => {
    if (!report || selectedKey === null) return report?.details || [];
    return report.details.filter((item) => {
      const date = new Date(item.reviewed_at);
      const key = period === 'week' ? dateKey(date) : String(Math.floor((date.getDate() - 1) / 7));
      return key === selectedKey;
    });
  }, [period, report, selectedKey]);

  return (
    <section className="np-reports">
      <div className="np-report-toolbar">
        <div className="np-segmented" aria-label="Periodo del reporte">
          <button className={period === 'week' ? 'is-active' : ''} onClick={() => selectPeriod('week')}>Semana</button>
          <button className={period === 'month' ? 'is-active' : ''} onClick={() => selectPeriod('month')}>Mes</button>
        </div>
        <div className="np-period-nav">
          <button aria-label="Periodo anterior" title="Periodo anterior" onClick={() => movePeriod(-1)}>
            <i className="bi bi-chevron-left" aria-hidden="true" />
          </button>
          <strong>{report?.period.label || 'Cargando'}</strong>
          <button aria-label="Periodo siguiente" title="Periodo siguiente" onClick={() => movePeriod(1)}>
            <i className="bi bi-chevron-right" aria-hidden="true" />
          </button>
          <button className="np-today" onClick={goToday}>Hoy</button>
          <input
            aria-label="Fecha del reporte"
            type="date"
            value={anchor}
            onChange={(event) => {
              if (!event.target.value) return;
              setLoading(true);
              setError(null);
              setAnchor(event.target.value);
            }}
          />
        </div>
      </div>

      {loading && <p className="np-report-state">Cargando reporte...</p>}
      {error && <div className="np-report-error" role="alert">{error} <button onClick={retry}>Reintentar</button></div>}

      {!loading && report && (
        <>
          <div className="np-kpis">
            <Metric label="Piezas rechazadas" value={String(report.summary.rejected_units)} tone="danger" />
            <Metric label="Tasa de retrabajo" value={`${report.summary.rework_rate}%`} tone="amber" />
            <Metric label="Pedidos con retrabajo" value={String(report.summary.rework_orders)} />
            <Metric label="Aprobados al primer intento" value={`${report.summary.first_pass_rate}%`} tone="green" />
            <Metric label="Tiempo promedio por ciclo" value={duration(report.summary.avg_cycle_seconds)} />
            <Metric label="Tiempo acumulado por pedido" value={duration(report.summary.avg_order_seconds)} />
          </div>

          <div className="np-report-band">
            <div className="np-report-title">
              <h2>Retrabajos por periodo</h2>
              <div className="np-legend"><span className="reviewed" /> Revisadas <span className="rejected" /> Rechazadas</div>
            </div>
            <div className="np-chart" role="img" aria-label="Piezas revisadas y rechazadas por periodo">
              {report.series.map((point) => (
                <button
                  type="button"
                  className={`np-chart-column ${selectedKey === point.key ? 'is-selected' : ''}`}
                  aria-pressed={selectedKey === point.key}
                  onClick={() => setSelectedKey((value) => value === point.key ? null : point.key)}
                  key={point.key}
                >
                  <div className="np-bars">
                    <span className="np-bar reviewed" title={`${point.reviewed_units} revisadas`} style={{ height: `${Math.max(2, (point.reviewed_units / maxBar) * 100)}%` }} />
                    <span className="np-bar rejected" title={`${point.rejected_units} rechazadas`} style={{ height: `${Math.max(2, (point.rejected_units / maxBar) * 100)}%` }} />
                  </div>
                  <strong>{point.rejected_units}</strong>
                  <span>{point.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="np-report-band">
            <h2>Rendimiento por operador</h2>
            <div className="np-table-wrap">
              <table>
                <thead><tr><th>Operador</th><th>Ciclos</th><th>Retrabajos</th><th>Piezas</th><th>Rechazadas</th><th>Promedio</th><th>Tiempo total</th><th>Tasa</th></tr></thead>
                <tbody>
                  {report.operators.length ? report.operators.map((operator) => (
                    <tr key={`${operator.user_id}:${operator.name}`}>
                      <td><strong>{operator.name}</strong></td>
                      <td>{operator.cycles_completed}</td>
                      <td>{operator.rework_cycles}</td>
                      <td>{operator.units_produced}</td>
                      <td>{operator.units_rejected}</td>
                      <td>{duration(operator.avg_seconds)}</td>
                      <td>{duration(operator.total_seconds)}</td>
                      <td>{operator.rework_rate}%</td>
                    </tr>
                  )) : <tr><td colSpan={8}>Sin ciclos terminados en este periodo.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="np-report-band">
            <div className="np-report-title">
              <h2>Detalle de retrabajos</h2>
              {selectedKey !== null && <button className="np-clear-filter" onClick={() => setSelectedKey(null)}>Ver todo</button>}
            </div>
            <div className="np-table-wrap">
              <table>
                <thead><tr><th>Fecha</th><th>Pedido</th><th>Producto</th><th>Cantidad</th><th>Comentario</th><th>Operador</th><th>Supervisor</th><th>Tiempo</th></tr></thead>
                <tbody>
                  {visibleDetails.length ? visibleDetails.map((item) => (
                    <tr key={item.id}>
                      <td>{new Date(item.reviewed_at).toLocaleDateString('es-MX')}</td>
                      <td>#{item.order_number} / C{item.cycle_number}</td>
                      <td>{item.product_name}</td>
                      <td>{item.quantity_rejected} de {item.quantity_ordered}</td>
                      <td>{item.comment}</td>
                      <td>{item.operator_name}</td>
                      <td>{item.supervisor_name}</td>
                      <td>{duration(item.duration_seconds)}</td>
                    </tr>
                  )) : <tr><td colSpan={8}>Sin retrabajos en este periodo.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        .np-reports { color: var(--nk-text-main); padding: 0 24px; }
        .np-report-toolbar { align-items: center; display: flex; flex-wrap: wrap; gap: 14px; justify-content: space-between; margin-bottom: 18px; }
        .np-segmented { border: 2px solid var(--nk-border); display: inline-flex; }
        .np-segmented button { background: var(--nk-bg-card); border: 0; color: var(--nk-text-main); cursor: pointer; font-weight: 800; padding: 8px 18px; text-transform: uppercase; }
        .np-segmented button + button { border-left: 2px solid var(--nk-border); }
        .np-segmented button.is-active { background: var(--nk-primary); color: #fff; }
        .np-period-nav { align-items: center; display: flex; gap: 8px; }
        .np-period-nav button { align-items: center; background: var(--nk-bg-card); border: 2px solid var(--nk-border); color: var(--nk-text-main); cursor: pointer; display: inline-flex; height: 36px; justify-content: center; min-width: 36px; }
        .np-period-nav input { background: var(--nk-bg-card); border: 2px solid var(--nk-border); color: var(--nk-text-main); font: inherit; height: 36px; padding: 0 8px; }
        .np-period-nav strong { min-width: 180px; text-align: center; text-transform: capitalize; }
        .np-period-nav .np-today { font-size: .75rem; font-weight: 800; padding: 0 10px; text-transform: uppercase; }
        .np-report-state { color: var(--nk-text-sec); padding: 30px 0; text-align: center; }
        .np-report-error { background: color-mix(in srgb, #b32d2e 8%, var(--nk-bg-card)); border: 2px solid #b32d2e; color: #b32d2e; font-weight: 700; padding: 12px; }
        .np-report-error button { background: transparent; border: 0; color: inherit; cursor: pointer; font-weight: 900; text-decoration: underline; }
        .np-kpis { display: grid; gap: 12px; grid-template-columns: repeat(6, minmax(135px, 1fr)); margin-bottom: 18px; }
        .np-report-band { background: var(--nk-bg-card); border-top: 3px solid var(--nk-border); margin-bottom: 20px; padding: 18px 0 4px; }
        .np-report-band h2 { font-family: 'Teko', sans-serif; font-size: 1.75rem; margin: 0 0 14px; text-transform: uppercase; }
        .np-report-title { align-items: center; display: flex; flex-wrap: wrap; justify-content: space-between; }
        .np-legend { align-items: center; color: var(--nk-text-sec); display: flex; font-size: .75rem; gap: 6px; }
        .np-legend span { display: inline-block; height: 9px; margin-left: 8px; width: 18px; }
        .reviewed { background: #64748b; }
        .rejected { background: #b32d2e; }
        .np-chart { align-items: end; border-bottom: 2px solid var(--nk-border); display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(54px, 1fr)); height: 260px; padding: 20px 8px 0; }
        .np-chart-column { align-items: center; background: transparent; border: 0; color: var(--nk-text-main); cursor: pointer; display: grid; font: inherit; grid-template-rows: 1fr auto auto; height: 100%; min-width: 0; padding: 0; text-align: center; }
        .np-chart-column.is-selected { background: color-mix(in srgb, var(--nk-primary) 8%, transparent); outline: 2px solid var(--nk-primary); outline-offset: -2px; }
        .np-bars { align-items: end; display: flex; gap: 3px; height: 100%; justify-content: center; width: 100%; }
        .np-bar { display: block; max-width: 22px; min-height: 2px; width: 36%; }
        .np-chart-column strong { font-size: .75rem; margin-top: 5px; }
        .np-chart-column > span { color: var(--nk-text-sec); font-size: .7rem; overflow: hidden; padding: 3px 0 8px; text-overflow: ellipsis; white-space: nowrap; width: 100%; }
        .np-table-wrap { overflow-x: auto; }
        table { border-collapse: collapse; font-size: .82rem; min-width: 760px; width: 100%; }
        th, td { border-bottom: 1px solid var(--nk-border); padding: 9px 10px; text-align: left; vertical-align: top; }
        th { background: var(--nk-bg-wrapper); font-size: .72rem; text-transform: uppercase; }
        tbody tr:hover { background: color-mix(in srgb, var(--nk-primary) 5%, transparent); }
        .np-clear-filter { background: transparent; border: 0; color: var(--nk-primary); cursor: pointer; font-size: .75rem; font-weight: 800; text-decoration: underline; text-transform: uppercase; }
        @media (max-width: 1120px) { .np-kpis { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 640px) {
          .np-reports { padding: 0 14px; }
          .np-kpis { grid-template-columns: repeat(2, 1fr); }
          .np-period-nav { flex-wrap: wrap; justify-content: space-between; width: 100%; }
          .np-period-nav strong { min-width: 0; }
        }
      `}</style>
    </section>
  );
}

function Metric({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'danger' | 'amber' | 'green' }) {
  return (
    <div className={`np-metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <style jsx>{`
        .np-metric { background: var(--nk-bg-card); border: 2px solid var(--nk-border); border-top-width: 5px; min-height: 96px; padding: 11px; }
        .np-metric span { color: var(--nk-text-sec); display: block; font-size: .7rem; font-weight: 800; line-height: 1.25; text-transform: uppercase; }
        .np-metric strong { color: var(--nk-text-main); display: block; font-family: 'Teko', sans-serif; font-size: 2rem; line-height: 1; margin-top: 10px; }
        .np-metric.danger { border-top-color: #b32d2e; }
        .np-metric.amber { border-top-color: #d97706; }
        .np-metric.green { border-top-color: #1a7f37; }
      `}</style>
    </div>
  );
}
