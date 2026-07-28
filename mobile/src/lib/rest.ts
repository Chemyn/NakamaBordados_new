/**
 * Transporte compartido de la API de WordPress.
 *
 * Producción y Almacén son plugins distintos pero hablan igual: mismo patrón
 * `?rest_route=` (necesario por el no-cache del .htaccess), token del Keystore
 * en la cabecera y un reintento con la sesión renovada ante un 401. Vive aquí
 * para que el día que cambie la autenticación se toque un solo archivo.
 */

import { API_ORIGIN } from './config';
import { refreshAccessToken } from './auth';
import { getSession, getToken } from './session';

/** Se avisa a la app cuando la sesión deja de ser válida para volver al login. */
type SessionExpiredHandler = () => void;
let onSessionExpired: SessionExpiredHandler | null = null;

export function setSessionExpiredHandler(handler: SessionExpiredHandler | null): void {
  onSessionExpired = handler;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE';
  params?: Record<string, string | number>;
  json?: unknown;
  form?: FormData;
}

export interface RestClient {
  /** Devuelve la respuesta cruda; para leer el cuerpo de un error o un 403. */
  send(path: string, options?: RequestOptions): Promise<Response>;
  /** Devuelve el JSON ya parseado y lanza con el mensaje del servidor si falla. */
  request<T>(path: string, options: RequestOptions, fallbackError: string): Promise<T>;
}

async function messageFrom(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { message?: string };
    if (data?.message) return data.message;
  } catch {
    /* respuesta sin JSON */
  }
  return fallback;
}

/** Crea un cliente para un namespace REST, p.ej. 'production' o 'warehouse'. */
export function createRestClient(namespace: string): RestClient {
  function url(path: string, params?: Record<string, string | number>): string {
    let out = `${API_ORIGIN}/?rest_route=/nakama/v1/${namespace}${path}`;
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        out += `&${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`;
      }
    }
    return `${out}&_cb=${Date.now()}`;
  }

  async function send(path: string, options: RequestOptions = {}, allowRetry = true): Promise<Response> {
    const headers: Record<string, string> = {};
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    if (options.json !== undefined) headers['Content-Type'] = 'application/json';
    // Con FormData no se fija Content-Type: lo pone el runtime con su boundary.

    const res = await fetch(url(path, options.params), {
      method: options.method ?? 'GET',
      headers,
      body: options.json !== undefined ? JSON.stringify(options.json) : options.form,
    });

    // 401 = token vencido o ausente. 403 = sesión válida sin permiso para este
    // panel, que renovar el token no arregla.
    if (res.status === 401) {
      if (allowRetry) {
        const renewed = await refreshAccessToken(getSession()?.refreshToken ?? null);
        if (renewed) return send(path, options, false);
      }
      // También llega aquí si el token recién renovado sigue sin servir: hay que
      // volver al login en vez de dejar al operador reintentando en bucle.
      onSessionExpired?.();
    }

    return res;
  }

  return {
    send: (path, options) => send(path, options),
    async request<T>(path: string, options: RequestOptions, fallbackError: string): Promise<T> {
      const res = await send(path, options);
      if (!res.ok) {
        throw new Error(await messageFrom(res, fallbackError));
      }
      return (await res.json()) as T;
    },
  };
}
