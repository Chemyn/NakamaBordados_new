'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  downloadAffiliateReceipt,
  fetchAffiliateDashboard,
  fetchAffiliateMe,
  fetchAffiliatePayments,
  fetchAffiliateSales,
  uploadFiscalDocument,
  type AffiliateDashboardData,
  type AffiliateMe,
  type AffiliatePaymentPeriod,
  type AffiliateSaleEvent,
} from '@/lib/affiliates-api';
import styles from './affiliate.module.css';

const mxn = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
});

export default function AffiliateDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { t } = useLanguage();
  const errorMessage = t('affiliates.error');
  const sessionExpiredMessage = t('affiliates.sessionExpired');
  const accessDeniedMessage = t('affiliates.denied');
  const [me, setMe] = useState<AffiliateMe | null>(null);
  const [loadedUserId, setLoadedUserId] = useState('');
  const [dashboard, setDashboard] = useState<AffiliateDashboardData | null>(null);
  const [sales, setSales] = useState<AffiliateSaleEvent[]>([]);
  const [periods, setPeriods] = useState<AffiliatePaymentPeriod[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloadingReceipt, setDownloadingReceipt] = useState(0);

  const loadIdentity = useCallback(async () => {
    if (!user) return;
    // Keep effect-triggered state changes on the asynchronous request turn.
    await Promise.resolve();
    setLoading(true);
    setError('');
    try {
      const identity = await fetchAffiliateMe();
      setDashboard(null);
      setSales([]);
      setPeriods([]);
      setMe(identity);
      setLoadedUserId(user.id);
    } catch (requestError) {
      const requestCode = requestError instanceof Error ? requestError.message : '';
      setError(requestCode === 'SESSION_EXPIRED'
        ? sessionExpiredMessage
        : requestCode === 'ACCESS_DENIED'
          ? accessDeniedMessage
          : errorMessage);
    } finally {
      setLoading(false);
    }
  }, [accessDeniedMessage, errorMessage, sessionExpiredMessage, user]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    queueMicrotask(() => {
      if (active) void loadIdentity();
    });
    return () => { active = false; };
  }, [loadIdentity, user]);

  useEffect(() => {
    if (!me?.can || !me.financialAccess) return;
    let active = true;
    Promise.all([fetchAffiliateDashboard(), fetchAffiliateSales(1), fetchAffiliatePayments(1)])
      .then(([dashboardData, salesData, paymentsData]) => {
        if (!active) return;
        setDashboard(dashboardData);
        setSales(salesData.items || []);
        setPeriods(paymentsData.items || []);
      })
      .catch(() => { if (active) setError(errorMessage); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [errorMessage, me]);

  const submitDocument = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const result = await uploadFiscalDocument(file);
      if (!result.success) throw new Error(result.message || t('affiliates.error'));
      setFile(null);
      await loadIdentity();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('affiliates.error'));
    } finally {
      setUploading(false);
    }
  };

  const downloadReceipt = async (receiptId: number) => {
    setDownloadingReceipt(receiptId);
    setError('');
    try {
      await downloadAffiliateReceipt(receiptId);
    } catch {
      setError(t('affiliates.history.receiptError'));
    } finally {
      setDownloadingReceipt(0);
    }
  };

  if (authLoading) return <StatusShell title={t('affiliates.title')} text={t('affiliates.loading')} />;
  if (!user) {
    return (
      <main className={styles.page}>
        <section className={styles.stateCard} aria-labelledby="affiliate-login-title">
          <h1 id="affiliate-login-title">{t('affiliates.title')}</h1>
          <p>{t('affiliates.login')}</p>
          <Link className="nk-btn" href="/mi-cuenta/?return=/afiliados/">{t('affiliates.loginCta')}</Link>
        </section>
      </main>
    );
  }
  if (loadedUserId !== user.id) {
    if (error) {
      return (
        <main className={styles.page}>
          <section className={styles.stateCard} role="alert">
            <h1>{t('affiliates.title')}</h1><p>{error}</p>
            <button className="nk-btn" type="button" onClick={() => void loadIdentity()}>{t('affiliates.retry')}</button>
          </section>
        </main>
      );
    }
    return <StatusShell title={t('affiliates.title')} text={t('affiliates.loading')} />;
  }
  if (loading && !me) return <StatusShell title={t('affiliates.title')} text={t('affiliates.loading')} />;
  if (error && !me) {
    return (
      <main className={styles.page}>
        <section className={styles.stateCard} role="alert">
          <h1>{t('affiliates.title')}</h1><p>{error}</p>
          <button className="nk-btn" type="button" onClick={() => void loadIdentity()}>{t('affiliates.retry')}</button>
        </section>
      </main>
    );
  }
  if (me && !me.can) return <StatusShell title={t('affiliates.title')} text={t('affiliates.denied')} alert />;
  if (!me) return <StatusShell title={t('affiliates.title')} text={t('affiliates.loading')} />;

  if (me.financialAccess && !dashboard) {
    if (error) {
      return (
        <main className={styles.page}>
          <section className={styles.stateCard} role="alert">
            <h1>{t('affiliates.title')}</h1><p>{error}</p>
            <button className="nk-btn" type="button" onClick={() => void loadIdentity()}>{t('affiliates.retry')}</button>
          </section>
        </main>
      );
    }
    return <StatusShell title={t('affiliates.title')} text={t('affiliates.loading')} />;
  }

  const fiscalStatus = me.fiscal?.status || 'missing';
  if (!me.financialAccess) {
    const statusText = fiscalStatus === 'pending'
      ? t('affiliates.fiscal.pending')
      : fiscalStatus === 'rejected'
        ? t('affiliates.fiscal.rejected')
        : t('affiliates.fiscal.missing');
    return (
      <main className={styles.page}>
        <header className={styles.hero}>
          <span aria-hidden="true" className={styles.impact}>DOSSIER</span>
          <h1>{t('affiliates.title')}</h1>
          <p>{me.profile?.code || ''}</p>
        </header>
        <section className={styles.fiscalCard} aria-labelledby="fiscal-title">
          <div className={styles.warningStripe} aria-hidden="true" />
          <h2 id="fiscal-title">{t('affiliates.fiscal.title')}</h2>
          <p role="status">{statusText}</p>
          {fiscalStatus === 'rejected' && me.fiscal.document?.reason && <p className={styles.errorText}>{me.fiscal.document.reason}</p>}
          <label htmlFor="affiliate-fiscal-file">{t('affiliates.fiscal.label')}</label>
          <input
            id="affiliate-fiscal-file"
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
          />
          <button className="nk-btn" type="button" disabled={!file || uploading} onClick={() => void submitDocument()}>
            {uploading ? t('affiliates.fiscal.uploading') : t('affiliates.fiscal.upload')}
          </button>
          {error && <p className={styles.errorText} role="alert">{error}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <span aria-hidden="true" className={styles.impact}>NAKAMA</span>
        <p className={styles.eyebrow}>{dashboard?.period || ''}</p>
        <h1>{t('affiliates.title')}</h1>
        <div className={styles.identityGrid}>
          <div><span>{t('affiliates.code')}</span><strong>{dashboard?.code || me.profile?.code}</strong></div>
          <div><span>{t('affiliates.link')}</span><a href={dashboard?.referralUrl || me.profile?.referralUrl}>{dashboard?.referralUrl || me.profile?.referralUrl}</a></div>
        </div>
      </header>

      {error && <div className={styles.errorBanner} role="alert">{error}</div>}
      <section className={styles.metricGrid} aria-label={t('affiliates.summary.label')}>
        <article>
          <span>{t('affiliates.summary.sales')}</span>
          <strong>{mxn.format(dashboard?.summary.salesMxn || 0)}</strong>
          <small>
            {dashboard?.summary.salesCount || 0} {t('affiliates.summary.salesCount')}
            {' · '}
            {dashboard?.summary.refundCount || 0} {t('affiliates.summary.adjustmentsCount')}
          </small>
        </article>
        <article className={styles.commissionMetric}>
          <span>{t('affiliates.summary.commission')}</span>
          <strong>{mxn.format(dashboard?.summary.commissionMxn || 0)}</strong>
          <small>{t('affiliates.summary.commissionRule')}</small>
        </article>
      </section>

      <section className={styles.historySection} aria-labelledby="affiliate-history-title">
        <div className={styles.sectionHeading}>
          <div>
            <span>{t('affiliates.history.kicker')}</span>
            <h2 id="affiliate-history-title">{t('affiliates.history.title')}</h2>
          </div>
          <p>{t('affiliates.history.manual')}</p>
        </div>
        <p className={styles.carryNote}>{t('affiliates.history.carry')}</p>
        {periods.length === 0 ? <p>{t('affiliates.history.empty')}</p> : (
          <div className={styles.periodList}>
            {periods.map(period => {
              const stateLabel = t(`affiliates.history.${period.status}`);
              return (
                <article className={styles.periodCard} key={period.id}>
                  <header>
                    <div><span>{t('affiliates.history.period')}</span><strong>{period.period}</strong></div>
                    <span className={`${styles.periodStatus} ${styles[`periodStatus_${period.status}`]}`}>{stateLabel}</span>
                  </header>
                  <dl>
                    <div><dt>{t('affiliates.history.sales')}</dt><dd>{mxn.format(period.salesMxn)}</dd></div>
                    <div><dt>{t('affiliates.history.refunds')}</dt><dd>{mxn.format(period.refundsMxn)}</dd></div>
                    <div><dt>{t('affiliates.history.ledgerAdjustments')}</dt><dd>{mxn.format(period.adjustmentsMxn)}</dd></div>
                    <div><dt>{t('affiliates.history.gross')}</dt><dd>{mxn.format(period.commissionGrossMxn)}</dd></div>
                    <div><dt>{t('affiliates.history.isr')}</dt><dd>{mxn.format(period.isrWithheldMxn)}</dd></div>
                    <div><dt>{t('affiliates.history.iva')}</dt><dd>{mxn.format(period.ivaWithheldMxn)}</dd></div>
                    <div><dt>{t('affiliates.history.adjustments')}</dt><dd>{mxn.format(period.otherAdjustmentsMxn)}</dd></div>
                    <div className={styles.netValue}><dt>{t('affiliates.history.net')}</dt><dd>{mxn.format(period.netMxn)}</dd></div>
                  </dl>
                  {period.reversedAt && <p className={styles.reversalNote}>{t('affiliates.history.reversed')}: {period.reversalReason}</p>}
                  {period.status === 'paid' && period.receiptId > 0 && (
                    <button className="nk-btn" type="button" disabled={downloadingReceipt === period.receiptId} onClick={() => void downloadReceipt(period.receiptId)}>
                      {downloadingReceipt === period.receiptId ? t('affiliates.history.receiptDownloading') : t('affiliates.history.receipt')}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className={styles.salesSection} aria-labelledby="affiliate-sales-title">
        <h2 id="affiliate-sales-title">{t('affiliates.sales.title')}</h2>
        {loading ? <p role="status">{t('affiliates.loading')}</p> : sales.length === 0 ? (
          <p>{t('affiliates.sales.empty')}</p>
        ) : (
          <div className={styles.salesList}>
            {sales.map(event => (
              <article key={event.id} className={styles.saleCard}>
                <div><span>{event.eventType === 'sale' ? t('affiliates.sales.sale') : t('affiliates.sales.adjustment')}</span><strong>#{event.orderId}</strong></div>
                <div><span>{t('affiliates.sales.base')}</span><strong>{mxn.format(event.baseMxn)}</strong>{event.sourceCurrency !== 'MXN' && <small>{event.sourceBase} {event.sourceCurrency}</small>}</div>
                <div><span>{t('affiliates.sales.commission')}</span><strong>{mxn.format(event.commissionMxn)}</strong></div>
                <time dateTime={event.occurredAt}>{event.occurredAt.slice(0, 10)}</time>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function StatusShell({ title, text, alert = false }: { title: string; text: string; alert?: boolean }) {
  return (
    <main className={styles.page}>
      <section className={styles.stateCard} role={alert ? 'alert' : 'status'}>
        <h1>{title}</h1><p>{text}</p>
      </section>
    </main>
  );
}
