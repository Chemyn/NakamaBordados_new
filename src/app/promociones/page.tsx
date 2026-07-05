'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '../context/LanguageContext';

/**
 * Promociones vigentes: las mismas que rotan en los banners (marquee).
 * Los montos/porcentajes se gestionan en el plugin nakama-discounts de
 * WordPress; esta página solo las comunica.
 */
export default function PromocionesPage() {
  const { t } = useLanguage();

  const promos = [
    {
      key: 'welcome',
      icon: 'military_tech',
      title: t('promos.welcome.title'),
      tag: t('promos.welcome.tag'),
      desc: t('promos.welcome.desc'),
      details: [t('promos.welcome.d1'), t('promos.welcome.d2'), t('promos.welcome.d3')],
      note: t('promos.welcome.note'),
    },
    {
      key: 'shipping',
      icon: 'local_shipping',
      title: t('promos.shipping.title'),
      tag: t('promos.shipping.tag'),
      desc: t('promos.shipping.desc'),
      details: [],
      note: t('promos.shipping.note'),
    },
    {
      key: 'msi',
      icon: 'credit_card',
      title: t('promos.msi.title'),
      tag: t('promos.msi.tag'),
      desc: t('promos.msi.desc'),
      details: [],
      note: t('promos.msi.note'),
    },
    {
      key: 'transfer',
      icon: 'account_balance',
      title: t('promos.transfer.title'),
      tag: t('promos.transfer.tag'),
      desc: t('promos.transfer.desc'),
      details: [],
      note: t('promos.transfer.note'),
    },
  ];

  return (
    <div className="nk-promos-page">
      <div className="nk-container">
        <header className="nk-promos-header">
          <span className="nk-store-hero-badge">{t('promos.badge')}</span>
          <h1 className="nk-section-title">{t('promos.title')}</h1>
          <p className="nk-promos-intro">{t('promos.intro')}</p>
        </header>

        <div className="nk-promos-grid">
          {promos.map(promo => (
            <article key={promo.key} className="nk-promo-card nk-manga-border">
              <div className="nk-promo-icon">
                <span className="material-icons-outlined">{promo.icon}</span>
              </div>
              <span className="nk-promo-tag">{promo.tag}</span>
              <h2 className="nk-promo-title">{promo.title}</h2>
              <p className="nk-promo-desc">{promo.desc}</p>
              {promo.details.length > 0 && (
                <ul className="nk-promo-details">
                  {promo.details.map(d => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              )}
              <p className="nk-promo-note">* {promo.note}</p>
            </article>
          ))}
        </div>

        <div className="nk-promos-footer">
          <Link href="/store" className="nk-btn nk-manga-border">
            {t('promos.cta')}
          </Link>
          <Link href="/terminos-y-condiciones" className="nk-promos-terms">
            {t('promos.terms')}
          </Link>
        </div>
      </div>

      <style jsx>{`
        .nk-promos-page {
          padding: calc(var(--header-padding) + 40px) 20px 80px;
          background: var(--nk-bg-wrapper);
          min-height: 90vh;
        }

        .nk-container {
          max-width: 1100px;
          margin: 0 auto;
        }

        .nk-promos-header {
          text-align: center;
          max-width: 720px;
          margin: 0 auto 50px;
        }

        .nk-promos-intro {
          font-size: 1.1rem;
          color: var(--nk-text-sec);
          line-height: 1.6;
          margin-top: 15px;
        }

        .nk-promos-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr));
          gap: 25px;
        }

        .nk-promo-card {
          background: var(--nk-bg-card);
          padding: 28px 24px;
          display: flex;
          flex-direction: column;
          box-shadow: var(--nk-manga-shadow);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .nk-promo-card:hover {
          transform: translate(-3px, -3px);
          box-shadow: var(--nk-manga-shadow-lg);
        }

        .nk-promo-icon {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          border: 3px solid var(--nk-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
          background: var(--nk-bg-wrapper);
        }

        .nk-promo-icon span {
          font-size: 2rem;
          color: var(--nk-primary);
        }

        .nk-promo-tag {
          display: inline-block;
          align-self: flex-start;
          background: var(--nk-primary);
          color: #fff;
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 1px;
          text-transform: uppercase;
          padding: 4px 10px;
          margin-bottom: 10px;
        }

        .nk-promo-title {
          font-family: 'Teko', sans-serif;
          font-size: 1.8rem;
          text-transform: uppercase;
          line-height: 1;
          margin: 0 0 10px;
          color: var(--nk-text-main);
        }

        .nk-promo-desc {
          font-size: 0.95rem;
          color: var(--nk-text-sec);
          line-height: 1.55;
          margin: 0 0 12px;
        }

        .nk-promo-details {
          list-style: none;
          padding: 0;
          margin: 0 0 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .nk-promo-details li {
          font-weight: 700;
          font-size: 0.9rem;
          padding-left: 22px;
          position: relative;
          color: var(--nk-text-main);
        }

        .nk-promo-details li::before {
          content: '•';
          color: var(--nk-primary);
          font-weight: 900;
          position: absolute;
          left: 6px;
        }

        .nk-promo-note {
          margin-top: auto;
          font-size: 0.78rem;
          color: var(--nk-text-sec);
          opacity: 0.85;
          line-height: 1.4;
        }

        .nk-promos-footer {
          margin-top: 50px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 18px;
        }

        .nk-promos-terms {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--nk-text-sec);
          text-decoration: underline;
        }

        .nk-promos-terms:hover {
          color: var(--nk-primary);
        }
      `}</style>
    </div>
  );
}
