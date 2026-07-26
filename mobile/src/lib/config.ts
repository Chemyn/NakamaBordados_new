/**
 * Configuración del backend. La app siempre habla con el sitio de producción:
 * no hay equivalente móvil de apiOrigin() (que en la web resuelve el mismo
 * origen para evitar CORS); en React Native no hay CORS.
 */

export const API_ORIGIN = 'https://nakamabordados.com';

export const GRAPHQL_URL = `${API_ORIGIN}/graphql`;

/** Página estática del sitio que reenvía el JWT del login social a la app. */
export const APP_AUTH_PATH = '/app-auth/';

/** Debe coincidir con "scheme" de app.json. */
export const AUTH_REDIRECT = 'nakamaprod://auth';

/** Canal de notificaciones de Android para los avisos de pedidos nuevos. */
export const PUSH_CHANNEL_ID = 'orders';
