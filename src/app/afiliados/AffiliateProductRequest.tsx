'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import type {
  AffiliateProductRequestInput,
  AffiliateProductRequestRecord,
  AffiliateProductsPage,
  AffiliateShippingAddress,
} from '@/lib/affiliates-api';
import styles from './affiliate.module.css';

interface Props {
  period: string;
  quota: number;
  vip: boolean;
  products: AffiliateProductsPage;
  request: AffiliateProductRequestRecord | null;
  address: AffiliateShippingAddress;
  onSubmit: (input: AffiliateProductRequestInput) => Promise<{ success: boolean; reason?: string }>;
}

type Selection = { product_id: number; variation_id: number };

export default function AffiliateProductRequest({ period, quota, vip, products, request, address, onSubmit }: Props) {
  const { t } = useLanguage();
  const storageKey = `nakama-affiliate-products-${period}`;
  const [selected, setSelected] = useState<Selection[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (!Array.isArray(saved)) return [];
      const available = new Map(products.items.map(product => [product.id, new Set(product.variations.map(variation => variation.id))]));
      return saved.filter((item: Selection) => {
        const variations = available.get(Number(item?.product_id));
        if (!variations) return false;
        return variations.size === 0 ? Number(item?.variation_id) === 0 : variations.has(Number(item?.variation_id));
      }).slice(0, quota);
    } catch { return []; }
  });
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const addressComplete = Boolean(address.name && address.address1 && address.city && address.state && address.postcode && address.country && address.phone);

  useEffect(() => {
    if (!request) localStorage.setItem(storageKey, JSON.stringify(selected));
  }, [request, selected, storageKey]);

  const selectedIds = useMemo(() => new Set(selected.map(item => item.product_id)), [selected]);
  const toggle = (productId: number, variationId: number, checked: boolean) => {
    setMessage('');
    setSelected(current => {
      if (!checked) return current.filter(item => item.product_id !== productId);
      if (current.length >= quota || current.some(item => item.product_id === productId)) return current;
      return [...current, { product_id: productId, variation_id: variationId }];
    });
  };
  const changeVariation = (productId: number, variationId: number) => {
    setSelected(current => current.map(item => item.product_id === productId ? { ...item, variation_id: variationId } : item));
  };
  const submit = async () => {
    if (!confirmed || selected.length === 0) return;
    setSubmitting(true);
    setMessage('');
    setFailed(false);
    try {
      const result = await onSubmit({ items: selected, address });
      if (!result.success) throw new Error(result.reason || t('affiliates.mission.requestError'));
      localStorage.removeItem(storageKey);
      setMessage(t('affiliates.mission.requestSent'));
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : t('affiliates.mission.requestError'));
    } finally {
      setSubmitting(false);
    }
  };

  if (request) {
    return (
      <section className={styles.missionCard} aria-labelledby="affiliate-product-title">
        <MissionHeading id="affiliate-product-title" kicker={t('affiliates.mission.productKicker')} title={t('affiliates.mission.productTitle')} step="02" />
        <div className={styles.requestState} role="status">
          <strong>{t(`affiliates.mission.requestStatus.${request.status}`)}</strong>
          <p>{request.items.map(item => item.productName + (item.variationLabel ? ` · ${item.variationLabel}` : '')).join(', ')}</p>
          {request.trackingCode && <p>{request.carrier} · {request.trackingCode}</p>}
          {request.rejectionReason && <p className={styles.inlineError}>{request.rejectionReason}</p>}
        </div>
      </section>
    );
  }

  return (
    <section className={styles.missionCard} aria-labelledby="affiliate-product-title">
      <MissionHeading id="affiliate-product-title" kicker={t('affiliates.mission.productKicker')} title={t('affiliates.mission.productTitle')} step="02" />
      <div className={styles.ruleCallout}>
        <strong>{quota} {quota === 1 ? t('affiliates.mission.unit') : t('affiliates.mission.units')}</strong>
        <p>{vip
          ? t('affiliates.mission.vipCatalog')
          : t('affiliates.mission.standardCatalog')}</p>
        <p>{t('affiliates.mission.noPriceLimit')}</p>
      </div>
      <p className={styles.selectionCount} aria-live="polite">{selected.length} / {quota} {t('affiliates.mission.selected')}</p>
      <div className={styles.productGrid}>
        {products.items.map(product => {
          const checked = selectedIds.has(product.id);
          const selectedVariation = selected.find(item => item.product_id === product.id)?.variation_id ?? product.variations[0]?.id ?? 0;
          const atLimit = selected.length >= quota && !checked;
          return (
            <article className={`${styles.productChoice} ${checked ? styles.productChoiceSelected : ''}`} key={product.id}>
              {product.image ? <Image className={styles.productImage} src={product.image} alt="" width={320} height={320} unoptimized /> : <div className={styles.productPlaceholder} aria-hidden="true">NK</div>}
              <h3>{product.name}</h3>
              {product.variations.length > 0 && (
                <label>{t('affiliates.mission.variation')}
                  <select value={selectedVariation} onChange={event => changeVariation(product.id, Number(event.target.value))} disabled={!checked}>
                    {product.variations.map(variation => <option value={variation.id} key={variation.id}>{variation.label}</option>)}
                  </select>
                </label>
              )}
              <label className={styles.productCheck}>
                <input type="checkbox" checked={checked} disabled={atLimit} onChange={event => toggle(product.id, selectedVariation, event.target.checked)} />
                {product.name}
              </label>
            </article>
          );
        })}
      </div>
      {products.items.length === 0 && <p>{t('affiliates.mission.productsEmpty')}</p>}
      <div className={styles.addressCard}>
        <h3>{t('affiliates.mission.addressTitle')}</h3>
        <address>{address.name}<br />{address.address1}{address.address2 ? <><br />{address.address2}</> : null}<br />{address.city}, {address.state} · {address.postcode}<br />{address.country} · {address.phone}</address>
        <p><strong>{t('affiliates.mission.shippingCovered')}</strong></p>
        {addressComplete ? (
          <label className={styles.confirmCheck}><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />{t('affiliates.mission.addressConfirm')}</label>
        ) : (
          <p className={styles.inlineError}>{t('affiliates.mission.addressIncomplete')} <Link href="/mi-cuenta/">{t('affiliates.loginCta')}</Link></p>
        )}
      </div>
      <button className={`nk-btn ${styles.primaryMissionAction}`} type="button" disabled={!addressComplete || !confirmed || selected.length === 0 || submitting} onClick={() => void submit()}>
        {submitting ? t('affiliates.mission.sending') : t('affiliates.mission.sendRequest')}
      </button>
      {message && <p className={failed ? styles.inlineError : styles.inlineSuccess} role={failed ? 'alert' : 'status'}>{message}</p>}
    </section>
  );
}

function MissionHeading({ id, kicker, title, step }: { id: string; kicker: string; title: string; step: string }) {
  return <div className={styles.missionHeading}><span aria-hidden="true">{step}</span><div><p>{kicker}</p><h2 id={id}>{title}</h2></div></div>;
}
