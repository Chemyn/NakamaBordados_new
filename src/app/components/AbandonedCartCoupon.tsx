'use client';

import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';

export default function AbandonedCartCoupon() {
  const { couponCode, applyCoupon, removeCoupon } = useCart();
  const { t } = useLanguage();
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) {
      setCouponError(t('checkout.coupon.empty'));
      return;
    }

    setCouponError('');
    setLoading(true);
    const result = await applyCoupon(couponInput);
    setLoading(false);

    if (result.success) {
      setCouponInput('');
      return;
    }
    setCouponError(result.message || t('checkout.coupon.invalid'));
  };

  return (
    <section className="nk-abandoned-coupon" aria-label={t('checkout.coupon.toggle')}>
      {couponCode && (
        <div className="nk-active-coupon" role="status">
          <span>{couponCode}</span>
          <button type="button" onClick={removeCoupon} aria-label={t('checkout.coupon.remove')}>
            <span className="material-icons-outlined" aria-hidden="true">close</span>
          </button>
        </div>
      )}

      <details className="nk-coupon-disclosure">
        <summary>{t('checkout.coupon.toggle')}</summary>
        <p id="nk-coupon-help" className="nk-coupon-help">
          {t('checkout.coupon.abandoned_help')}
        </p>
        <label htmlFor="nk-abandoned-cart-coupon" className="nk-coupon-label">
          {t('checkout.coupon.label')}
        </label>
        <div className="nk-coupon-controls" aria-busy={loading}>
          <input
            id="nk-abandoned-cart-coupon"
            type="text"
            placeholder={t('checkout.coupon.placeholder')}
            value={couponInput}
            onChange={(event) => {
              setCouponInput(event.target.value);
              if (couponError) setCouponError('');
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void handleApplyCoupon();
              }
            }}
            aria-describedby={`nk-coupon-help${couponError ? ' nk-coupon-error' : ''}`}
            aria-invalid={couponError ? 'true' : 'false'}
            className="nk-manga-input"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            disabled={loading}
          />
          <button type="button" onClick={handleApplyCoupon} disabled={loading} className="nk-btn nk-coupon-apply">
            {loading ? t('checkout.coupon.validating') : t('checkout.coupon.apply')}
          </button>
        </div>
        {couponError && (
          <p id="nk-coupon-error" className="nk-coupon-error" role="alert">
            {couponError}
          </p>
        )}
      </details>

      <style jsx>{`
        .nk-abandoned-coupon {
          padding: 20px 0;
          border-top: 1px dashed var(--nk-border);
          border-bottom: 1px dashed var(--nk-border);
          margin: 20px 0;
        }
        .nk-coupon-disclosure summary {
          min-height: 44px;
          display: flex;
          align-items: center;
          font-weight: 800;
          cursor: pointer;
        }
        .nk-coupon-disclosure summary:focus-visible,
        .nk-coupon-disclosure button:focus-visible,
        .nk-coupon-disclosure input:focus-visible,
        .nk-active-coupon button:focus-visible {
          outline: 3px solid var(--nk-primary);
          outline-offset: 3px;
        }
        .nk-coupon-help {
          margin: 8px 0 14px;
          font-size: 0.9rem;
          line-height: 1.5;
          opacity: 0.8;
        }
        .nk-coupon-label {
          display: block;
          margin-bottom: 8px;
          font-weight: 700;
        }
        .nk-coupon-controls {
          display: flex;
          gap: 10px;
        }
        .nk-coupon-controls input {
          flex: 1;
          min-width: 0;
        }
        .nk-coupon-apply {
          min-height: 44px;
          padding: 0 14px;
          font-size: 1.1rem;
          flex-shrink: 0;
        }
        .nk-coupon-error {
          min-height: 1.5em;
          margin: 6px 0 0;
          color: #b42318;
          font-size: 0.875rem;
          font-weight: 700;
        }
        .nk-active-coupon {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          background: var(--nk-border);
          color: var(--nk-bg-body);
          min-height: 44px;
          padding-left: 12px;
          margin-bottom: 10px;
          font-size: 0.8rem;
          font-weight: 800;
        }
        .nk-active-coupon button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 44px;
          min-height: 44px;
          background: none;
          border: none;
          color: inherit;
          cursor: pointer;
        }
        @media (max-width: 480px) {
          .nk-coupon-controls { flex-direction: column; }
          .nk-coupon-apply { width: 100%; }
        }
      `}</style>
    </section>
  );
}
