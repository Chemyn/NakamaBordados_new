'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface LastQuote {
  folio: string;
  name: string;
  email: string;
  summary: string;
  date: string;
}

/**
 * Página de agradecimiento post-cotización. El cotizador guarda los datos en
 * sessionStorage ('nakama_last_quote') justo antes de redirigir aquí; si se
 * entra directo (sin datos), se muestra la versión genérica con los mismos CTAs.
 *
 * Usa tokens nk-* de globals.css (NO cotizador.css: su Bootstrap solo carga
 * de forma fiable dentro de /cotizador).
 */
export default function GraciasPage() {
  const [quote, setQuote] = useState<LastQuote | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('nakama_last_quote');
      if (raw) setQuote(JSON.parse(raw));
    } catch { /* sin datos: versión genérica */ }
  }, []);

  return (
    <div className="nk-gracias-page">
      <div className="nk-container">
        <div className="nk-gracias-card nk-manga-border">
          <div className="nk-gracias-icon">
            <span className="material-icons-outlined">sailing</span>
          </div>

          <h1 className="nk-gracias-title">¡Cotización enviada!</h1>

          {quote ? (
            <>
              <p className="nk-gracias-sub">
                Gracias{quote.name ? `, ${quote.name}` : ''}. Tu solicitud quedó registrada con el folio:
              </p>
              <div className="nk-gracias-folio">{quote.folio}</div>
              {quote.summary && (
                <p className="nk-gracias-summary">{quote.summary}</p>
              )}
            </>
          ) : (
            <p className="nk-gracias-sub">
              Gracias por tu solicitud. Tu cotización quedó registrada en nuestro sistema.
            </p>
          )}

          <div className="nk-gracias-notice">
            <span className="material-icons-outlined">mark_email_unread</span>
            <p>
              Nuestro taller revisará tu diseño y <strong>te llegará al correo la
              actualización del precio de tu cotización</strong>. También podrás
              verla y pagarla en <strong>Mi Cuenta → Pedidos</strong>.
            </p>
          </div>

          <div className="nk-gracias-actions">
            <Link href="/mi-cuenta/" className="nk-btn">
              Ver mis pedidos
            </Link>
            <Link href="/" className="nk-btn-sec">
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        .nk-gracias-page {
          min-height: 90vh;
          background: var(--nk-bg-wrapper);
          padding: calc(var(--header-padding) + 30px) 15px 80px;
          display: flex;
          align-items: flex-start;
          justify-content: center;
        }

        .nk-container {
          width: 100%;
          max-width: 640px;
          margin: 0 auto;
        }

        .nk-gracias-card {
          background: var(--nk-bg-card);
          border: 3px solid var(--nk-border);
          box-shadow: var(--nk-manga-shadow-lg);
          padding: clamp(24px, 6vw, 48px);
          text-align: center;
        }

        .nk-gracias-icon {
          margin: 0 auto 20px;
          width: 84px;
          height: 84px;
          border-radius: 50%;
          border: 3px solid var(--nk-primary);
          background: color-mix(in srgb, var(--nk-primary) 10%, transparent);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .nk-gracias-icon :global(.material-icons-outlined) {
          font-size: 3.2rem;
          color: var(--nk-primary);
        }

        .nk-gracias-title {
          font-family: 'Teko', sans-serif;
          font-size: clamp(2.4rem, 8vw, 3.4rem);
          text-transform: uppercase;
          color: var(--nk-text-main);
          line-height: 1;
          margin: 0 0 10px;
          text-shadow: 2px 2px 0px var(--nk-accent);
        }

        .nk-gracias-sub {
          color: var(--nk-text-sec);
          font-weight: 600;
          margin: 0 0 15px;
        }

        .nk-gracias-folio {
          font-family: 'Teko', sans-serif;
          font-size: clamp(2rem, 7vw, 2.8rem);
          font-weight: 800;
          color: var(--nk-primary);
          border: 2px dashed var(--nk-primary);
          display: inline-block;
          padding: 2px 24px;
          margin-bottom: 15px;
          letter-spacing: 2px;
        }

        .nk-gracias-summary {
          color: var(--nk-text-main);
          font-weight: 700;
          font-size: 0.95rem;
          margin: 0 0 5px;
        }

        .nk-gracias-notice {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          text-align: left;
          background: var(--nk-bg-wrapper);
          border: 2px solid var(--nk-border);
          padding: 14px 16px;
          margin: 25px 0;
        }

        .nk-gracias-notice :global(.material-icons-outlined) {
          color: var(--nk-primary);
          font-size: 1.6rem;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .nk-gracias-notice p {
          margin: 0;
          font-size: 0.92rem;
          color: var(--nk-text-sec);
          font-weight: 600;
          line-height: 1.5;
        }

        .nk-gracias-notice strong {
          color: var(--nk-text-main);
        }

        .nk-gracias-actions {
          display: flex;
          gap: 15px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .nk-gracias-actions :global(.nk-btn),
        .nk-gracias-actions :global(.nk-btn-sec) {
          flex: 1 1 200px;
          text-align: center;
          text-decoration: none;
        }
      `}</style>
    </div>
  );
}
