'use client';

/**
 * Aviso de cookies (tarjeta manga flotante). Aparece abajo-izquierda en
 * escritorio y como tarjeta inferior a lo ancho en móvil, solo mientras el
 * cliente no haya decidido. "Aceptar" habilita GA4 + Meta Pixel (ver
 * Analytics.tsx); "Rechazar" los mantiene apagados. La decisión se guarda y
 * el banner no vuelve a aparecer.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '../context/LanguageContext';
import { getCookieConsent, setCookieConsent, type CookieConsent } from '../../lib/cookie-consent';

export default function CookieBanner() {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // La visibilidad se decide en un effect (no en render) para no romper la
    // hidratación del export estático. Un pequeño retraso deja respirar la
    // carga inicial antes de mostrar la tarjeta.
    if (getCookieConsent() !== null) return;
    const id = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(id);
  }, []);

  const decide = (value: CookieConsent) => {
    setCookieConsent(value);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="nk-cookie" role="dialog" aria-label={t('cookies.title')}>
      <div className="nk-cookie-head">
        <span className="material-icons-outlined" aria-hidden="true">cookie</span>
        <h3>{t('cookies.title')}</h3>
      </div>

      <p className="nk-cookie-text">
        {t('cookies.text')}{' '}
        <Link href="/aviso-de-privacidad/" className="nk-cookie-link">
          {t('cookies.link')}
        </Link>
        .
      </p>

      <div className="nk-cookie-actions">
        <button type="button" className="nk-cookie-accept" onClick={() => decide('accepted')}>
          {t('cookies.accept')}
        </button>
        <button type="button" className="nk-cookie-reject" onClick={() => decide('rejected')}>
          {t('cookies.reject')}
        </button>
      </div>

      <style jsx>{`
        .nk-cookie {
          position: fixed;
          left: 24px;
          bottom: 24px;
          z-index: 5000;
          width: 400px;
          max-width: calc(100vw - 48px);
          background: var(--nk-bg-card);
          border: 3px solid var(--nk-border);
          border-radius: 4px;
          box-shadow: 8px 8px 0 var(--nk-primary);
          padding: 20px 22px;
          animation: nkCookieIn 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .nk-cookie-head {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }
        .nk-cookie-head .material-icons-outlined {
          font-size: 28px;
          color: var(--nk-primary);
        }
        .nk-cookie-head h3 {
          margin: 0;
          font-family: 'Teko', sans-serif;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-size: 1.7rem;
          line-height: 1;
          color: var(--nk-text-main);
        }

        .nk-cookie-text {
          margin: 0 0 16px;
          font-family: 'Inter', sans-serif;
          font-size: 0.92rem;
          line-height: 1.5;
          color: var(--nk-text-sec);
        }
        .nk-cookie-link {
          color: var(--nk-primary);
          text-decoration: underline;
          font-weight: 600;
        }

        .nk-cookie-actions {
          display: flex;
          gap: 10px;
        }
        .nk-cookie-actions button {
          flex: 1;
          font-family: 'Teko', sans-serif !important;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-size: 1.3rem;
          line-height: 1;
          padding: 11px 18px;
          min-height: 44px;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Primario: mismo lenguaje que .nk-btn del sitio. */
        .nk-cookie-accept {
          background: var(--nk-primary);
          color: #ffffff;
          border: 2px solid var(--nk-primary);
          box-shadow: 0 4px 15px rgba(227, 0, 15, 0.3);
        }
        .nk-cookie-accept:hover {
          background: var(--nk-primary-dark);
          border-color: var(--nk-primary-dark);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(227, 0, 15, 0.45);
        }

        /* Secundario outline con hover "manga" (sombra dura desplazada). */
        .nk-cookie-reject {
          background: transparent;
          color: var(--nk-text-main);
          border: 2px solid var(--nk-border);
        }
        .nk-cookie-reject:hover {
          transform: translate(-2px, -2px);
          box-shadow: 4px 4px 0 var(--nk-border);
        }

        /* En modo oscuro el primario es ámbar y necesita texto oscuro para
           contrastar (mismo criterio que el override de .nk-btn en globals). */
        :global(html.dark) .nk-cookie-accept {
          color: #1a1f2b;
          box-shadow: 0 4px 15px rgba(251, 191, 36, 0.25);
        }
        :global(html.dark) .nk-cookie-accept:hover {
          box-shadow: 0 6px 20px rgba(251, 191, 36, 0.4);
        }

        @keyframes nkCookieIn {
          from { opacity: 0; transform: translateY(16px); }
          60%  { transform: translateY(-2px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 768px) {
          .nk-cookie {
            left: 12px;
            right: 12px;
            bottom: 12px;
            width: auto;
            max-width: none;
            padding: 18px;
          }
          .nk-cookie-actions {
            flex-direction: column;
          }
          .nk-cookie-text {
            font-size: 0.9rem;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .nk-cookie {
            animation: none;
          }
          .nk-cookie-actions button:hover {
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}
