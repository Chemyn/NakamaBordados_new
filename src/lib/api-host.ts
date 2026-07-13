/**
 * Origen para los endpoints REST (nakama/v1) del backend WordPress.
 *
 * El sitio responde tanto en nakamabordados.com como en www.nakamabordados.com
 * (sin redirección). El frontend llamaba SIEMPRE al dominio raíz con URL fija;
 * para un visitante en www. eso es cross-origin y el preflight CORS falla
 * (el REST de WP no devuelve Access-Control-Allow-Origin), rompiendo registro,
 * folios y creación de pedidos de cotización con "Error de red".
 *
 * Solución: si el navegador está en cualquier host de nakamabordados.com se usa
 * el MISMO origen (petición same-origin, sin CORS). Fuera de ahí (build/SSG,
 * localhost, previews) se conserva el dominio raíz como hasta ahora.
 */
export function apiOrigin(): string {
  if (
    typeof window !== 'undefined' &&
    /(^|\.)nakamabordados\.com$/i.test(window.location.hostname)
  ) {
    return window.location.origin;
  }
  return 'https://nakamabordados.com';
}
