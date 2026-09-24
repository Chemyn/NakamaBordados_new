'use client';

import React, { useRef, useState } from 'react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';

export default function AbandonedCartCoupon() {
  const {
    couponCode,
    couponKind,
    affiliateCode,
    affiliateSource,
    promotionChoice,
    applyCheckoutCode,
    removeCoupon,
    removeAffiliateCode,
    selectPromotion,
  } = useCart();
  const { t } = useLanguage();
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) {
      setCouponError(t('checkout.coupon.empty'));
      inputRef.current?.focus();
      return;
    }

    setCouponError('');
    setLoading(true);
    const result = await applyCheckoutCode(couponInput);
    setLoading(false);

    if (result.success) {
      setCouponInput('');
      return;
    }
    setCouponError(result.message || t('checkout.coupon.invalid'));
    inputRef.current?.focus();
  };

  return (
    <section className="nk-abandoned-coupon" aria-label={t('checkout.coupon.toggle')}>
      {couponCode && (
        <div className="nk-active-coupon" role="status">
          <span className="nk-active-coupon-copy">
            <strong>{couponCode}</strong>
            <small>
              {t(couponKind === 'nakama_manual'
                ? 'checkout.coupon.manual_success'
                : 'checkout.coupon.native_success')}
            </small>
          </span>
          <button type="button" onClick={removeCoupon} aria-label={t('checkout.coupon.remove')}>
            <span className="material-icons-outlined" aria-hidden="true">close</span>
          </button>
        </div>
      )}

      {affiliateCode && (
        <div className="nk-active-coupon" role="status">
          <span className="nk-active-coupon-copy">
            <strong>{affiliateCode}</strong>
            <small>
              {t(affiliateSource === 'referral'
                ? 'checkout.affiliate.referral'
                : 'checkout.coupon.affiliate_success')}
            </small>
          </span>
          <button type="button" onClick={removeAffiliateCode} aria-label={t('checkout.affiliate.remove')}>
            <span className="material-icons-outlined" aria-hidden="true">close</span>
          </button>
        </div>
      )}

      {couponCode && affiliateCode && (
        <fieldset className="nk-promotion-choice">
          <legend>{t('checkout.promotion_choice.title')}</legend>
          <p>{t('checkout.promotion_choice.help')}</p>
          <label className={promotionChoice === 'affiliate' ? 'is-selected' : ''}>
            <input
              type="radio"
              name="nk-promotion-choice"
              checked={promotionChoice === 'affiliate'}
              onChange={() => selectPromotion('affiliate')}
            />
            <span>{t('checkout.promotion_choice.affiliate')} <strong>{affiliateCode}</strong></span>
          </label>
          <label className={promotionChoice === 'coupon' ? 'is-selected' : ''}>
            <input
              type="radio"
              name="nk-promotion-choice"
              checked={promotionChoice === 'coupon'}
              onChange={() => selectPromotion('coupon')}
            />
            <span>{t('checkout.promotion_choice.coupon')} <strong>{couponCode}</strong></span>
          </label>
        </fieldset>
      )}

      <details className="nk-coupon-disclosure">
        <summary>{t('checkout.coupon.toggle')}</summary>
        <p id="nk-coupon-help" className="nk-coupon-help">
          {t('checkout.coupon.help')}
        </p>
        <label htmlFor="nk-promotional-code" className="nk-coupon-label">
          {t('checkout.coupon.label')}
        </label>
        <div className="nk-coupon-controls" aria-busy={loading}>
          <input
            ref={inputRef}
            id="nk-promotional-code"
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
        .nk-promotion-choice {
          margin: 12px 0;
          padding: 14px;
          border: 2px solid var(--nk-border);
        }
        .nk-promotion-choice legend {
          padding: 0 6px;
          font-weight: 900;
        }
        .nk-promotion-choice p {
          margin: 0 0 10px;
          font-size: 0.85rem;
          opacity: 0.8;
        }
        .nk-promotion-choice label {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 44px;
          padding: 8px 10px;
          border: 1px solid var(--nk-border);
          cursor: pointer;
        }
        .nk-promotion-choice label + label { margin-top: 8px; }
        .nk-promotion-choice label.is-selected {
          border-color: var(--nk-primary);
          box-shadow: inset 4px 0 0 var(--nk-primary);
        }
        .nk-promotion-choice input { min-width: 18px; min-height: 18px; }
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
        .nk-active-coupon-copy {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 8px 0;
        }
        .nk-active-coupon-copy strong {
          font-size: 0.85rem;
          letter-spacing: 0.04em;
        }
        .nk-active-coupon-copy small {
          font-size: 0.75rem;
          line-height: 1.35;
          font-weight: 600;
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
