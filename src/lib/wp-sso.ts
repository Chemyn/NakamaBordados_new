/**
 * SSO hacia el escritorio de WordPress.
 *
 * La app inicia sesión con JWT (WPGraphQL) guardado en localStorage; wp-admin
 * usa cookies de WordPress. Este helper llama al endpoint nakama/v1/sso con el
 * JWT para que el servidor siembre las cookies de sesión (mismo dominio) y
 * DESPUÉS abre /wp-admin, que ya no pide iniciar sesión de nuevo.
 */

const WP_BASE = 'https://nakamabordados.com';

export const WP_ADMIN_URL =
  process.env.NEXT_PUBLIC_WP_ADMIN_URL || `${WP_BASE}/wp-admin`;

export async function openWpAdmin(): Promise<void> {
  // Abrir la pestaña de forma síncrona dentro del gesto del usuario: si se
  // abre después del await, el bloqueador de pop-ups del navegador la frena.
  const win = window.open('', '_blank', 'noopener=false');

  try {
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('wp-jwt') : null;
    if (token) {
      await fetch(`${WP_BASE}/?rest_route=/nakama/v1/sso&nkcb=${Date.now()}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  } catch {
    // Sin SSO (endpoint no disponible, red, etc.): wp-admin pedirá login manual.
  }

  if (win) {
    win.location.href = WP_ADMIN_URL;
  } else {
    window.open(WP_ADMIN_URL, '_blank');
  }
}
