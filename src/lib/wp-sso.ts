/**
 * SSO hacia el escritorio de WordPress.
 *
 * La app inicia sesión con JWT (WPGraphQL) guardado en localStorage; wp-admin
 * usa cookies de WordPress. Este helper llama al endpoint nakama/v1/sso con el
 * JWT para que el servidor siembre las cookies de sesión (mismo dominio) y
 * DESPUÉS abre /wp-admin, que ya no pide iniciar sesión de nuevo.
 */

import { apiOrigin } from './api-host';

const WP_BASE = 'https://nakamabordados.com';

export const WP_ADMIN_URL =
  process.env.NEXT_PUBLIC_WP_ADMIN_URL || `${WP_BASE}/wp-admin`;

/**
 * Siembra las cookies de sesión de WordPress a partir del JWT guardado.
 * Se usa antes de abrir wp-admin (admins) y antes del bridge de checkout
 * (clientes), para que WooCommerce no trate al usuario como invitado.
 * Nunca lanza: si no hay token o el endpoint falla, simplemente no hay SSO.
 */
export async function seedWpSession(): Promise<boolean> {
  try {
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('wp-jwt') : null;
    if (!token) return false;
    const res = await fetch(`${apiOrigin()}/?rest_route=/nakama/v1/sso&nkcb=${Date.now()}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function openWpAdmin(): Promise<void> {
  // Abrir la pestaña de forma síncrona dentro del gesto del usuario: si se
  // abre después del await, el bloqueador de pop-ups del navegador la frena.
  const win = window.open('', '_blank', 'noopener=false');

  await seedWpSession();

  if (win) {
    win.location.href = WP_ADMIN_URL;
  } else {
    window.open(WP_ADMIN_URL, '_blank');
  }
}
