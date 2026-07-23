'use client';

/**
 * Botones de "Continuar con Google/Facebook".
 *
 * Se usa en Mi Cuenta (styled-jsx con estilos scoped) y en el modal del
 * cotizador (Bootstrap): los estilos van en línea para verse igual en ambos
 * sin depender de las clases de ninguno de los dos.
 */

import { socialLoginUrl } from '../../lib/social-login';

interface SocialLoginButtonsProps {
  /** Ruta interna a la que volver tras el login (ej. '/mi-cuenta/'). */
  backPath: string;
  /** Nota opcional bajo los botones (el cotizador avisa que se recarga). */
  note?: string;
}

const dividerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  margin: '1.25rem 0 1rem',
  color: '#8a8a8a',
  fontSize: '0.8rem',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

const lineStyle: React.CSSProperties = {
  flex: 1,
  height: 1,
  background: 'rgba(128,128,128,0.35)',
};

const buttonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.6rem',
  width: '100%',
  padding: '0.75rem 1rem',
  marginBottom: '0.6rem',
  background: '#ffffff',
  color: '#1a1a1a',
  border: '2px solid #1a1a1a',
  borderRadius: 8,
  fontWeight: 700,
  fontSize: '0.95rem',
  textDecoration: 'none',
  cursor: 'pointer',
};

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1c4.1-3.8 6.6-9.4 6.6-16.1z" />
      <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7C8.1 41.1 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.8 28.2c-.4-1.3-.7-2.7-.7-4.2s.2-2.9.7-4.2v-5.7H4.5C2.9 17.3 2 20.5 2 24s.9 6.7 2.5 9.9l7.3-5.7z" />
      <path fill="#EA4335" d="M24 10.8c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.2 29.9 2 24 2 15.4 2 8.1 6.9 4.5 14.1l7.3 5.7c1.7-5.2 6.5-9 12.2-9z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#1877F2"
        d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.96h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"
      />
    </svg>
  );
}

export default function SocialLoginButtons({ backPath, note }: SocialLoginButtonsProps) {
  return (
    <div>
      <div style={dividerStyle}>
        <span style={lineStyle} />
        <span>o continúa con</span>
        <span style={lineStyle} />
      </div>

      <a href={socialLoginUrl('google', backPath)} style={buttonStyle}>
        <GoogleIcon />
        Continuar con Google
      </a>

      <a href={socialLoginUrl('facebook', backPath)} style={buttonStyle}>
        <FacebookIcon />
        Continuar con Facebook
      </a>

      {note && (
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.78rem', color: '#8a8a8a', textAlign: 'center' }}>
          {note}
        </p>
      )}
    </div>
  );
}
