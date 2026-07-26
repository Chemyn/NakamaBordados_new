'use client';

/**
 * Puente entre el login social del sitio y la app de producción (Android).
 *
 * El bridge de nakama-checkout-tools (?nk_bridge=social-login) solo puede
 * redirigir a rutas del propio sitio, así que vuelve aquí con el JWT en el
 * fragmento (#nk_jwt=...). Esta página lo reenvía al esquema nakamaprod:// que
 * la app está escuchando. No sirve para nada abierta desde un navegador normal.
 */

import { useEffect, useState } from 'react';

const APP_SCHEME = 'nakamaprod://auth';

export default function AppAuthPage() {
  const [appUrl, setAppUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
    const token = new URLSearchParams(hash).get('nk_jwt');

    // El bridge marca los fallos del proveedor con ?social_error=1; se reenvían
    // igual para que la app pueda explicar qué pasó en vez de quedarse colgada.
    const socialError = new URLSearchParams(window.location.search).get('social_error');

    if (!token && !socialError) {
      setFailed(true);
      return;
    }

    const target = token
      ? `${APP_SCHEME}#nk_jwt=${encodeURIComponent(token)}`
      : `${APP_SCHEME}?social_error=1`;

    setAppUrl(target);

    // Se limpia el token de la barra de direcciones antes de saltar a la app.
    window.history.replaceState(null, '', window.location.pathname);
    window.location.replace(target);
  }, []);

  return (
    <main className="nk-appauth">
      <div className="nk-appauth-card">
        <h1>Nakama Producción</h1>

        {failed ? (
          <p>
            Esta página solo se usa al iniciar sesión desde la app de producción. Vuelve a
            intentarlo desde la app.
          </p>
        ) : (
          <>
            <p>Abriendo la app…</p>
            {/* Algunas versiones de Chrome ignoran el salto automático a un
                esquema propio si no hubo un toque del usuario. */}
            {appUrl && (
              <a className="nk-appauth-btn" href={appUrl}>
                Volver a la app
              </a>
            )}
          </>
        )}
      </div>

      <style jsx>{`
        .nk-appauth {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          padding: 40px 20px;
        }
        .nk-appauth-card {
          width: 100%;
          max-width: 420px;
          text-align: center;
          background: var(--nk-bg-card);
          border: var(--nk-manga-border, 2px solid #000);
          box-shadow: var(--nk-manga-shadow);
          padding: 32px 24px;
        }
        .nk-appauth-card h1 {
          font-family: 'Teko', sans-serif;
          font-size: 2.2rem;
          text-transform: uppercase;
          margin: 0 0 12px;
          color: var(--nk-text-main);
        }
        .nk-appauth-card p {
          margin: 0 0 20px;
          color: var(--nk-text-sec);
          line-height: 1.5;
        }
        .nk-appauth-btn {
          display: inline-block;
          background: var(--nk-primary);
          color: #fff;
          font-family: 'Teko', sans-serif;
          font-size: 1.4rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          text-decoration: none;
          padding: 10px 32px;
          border-radius: 4px;
        }
      `}</style>
    </main>
  );
}
