'use client';

import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';

export default function AffiliateCodeField() {
  const { affiliateCode, affiliateSource, applyAffiliateCode, removeAffiliateCode } = useCart();
  const { t } = useLanguage();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!value.trim()) {
      setError(t('checkout.affiliate.empty'));
      return;
    }

    setError('');
    setLoading(true);
    const result = await applyAffiliateCode(value, 'manual');
    setLoading(false);
    if (result.success) {
      setValue('');
      return;
    }
    setError(result.message || t('checkout.affiliate.invalid'));
  };

  return (
    <section className="nk-affiliate-code" aria-labelledby="nk-affiliate-title">
      <h4 id="nk-affiliate-title">{t('checkout.affiliate.title')}</h4>
      <p id="nk-affiliate-help">{t('checkout.affiliate.help')}</p>

      {affiliateCode && (
        <div className="nk-affiliate-active" role="status">
          <span>
            <strong>{affiliateCode}</strong>
            {affiliateSource === 'referral' && <small>{t('checkout.affiliate.referral')}</small>}
          </span>
          <button type="button" onClick={removeAffiliateCode} aria-label={t('checkout.affiliate.remove')}>
            <span className="material-icons-outlined" aria-hidden="true">close</span>
          </button>
        </div>
      )}

      <label htmlFor="nk-affiliate-code-input">{t('checkout.affiliate.label')}</label>
      <div className="nk-affiliate-controls" aria-busy={loading}>
        <input
          id="nk-affiliate-code-input"
          className="nk-manga-input"
          type="text"
          value={value}
          placeholder={t('checkout.affiliate.placeholder')}
          onChange={(event) => {
            setValue(event.target.value);
            if (error) setError('');
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void submit();
            }
          }}
          aria-describedby={`nk-affiliate-help${error ? ' nk-affiliate-error' : ''}`}
          aria-invalid={error ? 'true' : 'false'}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          disabled={loading}
        />
        <button type="button" className="nk-btn" onClick={submit} disabled={loading}>
          {loading ? t('checkout.affiliate.validating') : t('checkout.affiliate.apply')}
        </button>
      </div>
      {error && <p id="nk-affiliate-error" className="nk-affiliate-error" role="alert">{error}</p>}

      <style jsx>{`
        .nk-affiliate-code {
          margin: 20px 0;
          padding: 18px;
          border: 2px solid var(--nk-border);
          background: color-mix(in srgb, var(--nk-primary) 7%, var(--nk-bg-card));
        }
        h4 { margin: 0 0 4px; font-size: 1.1rem; }
        p { margin: 0 0 12px; line-height: 1.5; }
        label { display: block; margin-bottom: 8px; font-weight: 800; }
        .nk-affiliate-controls { display: flex; gap: 10px; }
        .nk-affiliate-controls input { flex: 1; min-width: 0; }
        .nk-affiliate-controls button { min-height: 44px; flex-shrink: 0; padding-inline: 16px; }
        .nk-affiliate-active {
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-height: 44px;
          margin: 12px 0;
          padding-left: 12px;
          background: var(--nk-border);
          color: var(--nk-bg-body);
        }
        .nk-affiliate-active span:first-child { display: flex; flex-direction: column; gap: 2px; }
        .nk-affiliate-active small { font-size: .72rem; opacity: .8; }
        .nk-affiliate-active button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 44px;
          min-height: 44px;
          border: 0;
          background: transparent;
          color: inherit;
          cursor: pointer;
        }
        .nk-affiliate-error { color: #b42318; font-weight: 800; margin-top: 8px; }
        button:focus-visible, input:focus-visible { outline: 3px solid var(--nk-primary); outline-offset: 3px; }
        @media (max-width: 480px) {
          .nk-affiliate-controls { flex-direction: column; }
          .nk-affiliate-controls button { width: 100%; }
        }
      `}</style>
    </section>
  );
}

