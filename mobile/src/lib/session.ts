/**
 * Sesión del operador: JWT de WPGraphQL guardado en el Keystore de Android
 * (expo-secure-store), no en AsyncStorage. Se mantiene además una copia en
 * memoria para que el cliente REST no tenga que ser asíncrono en cada llamada.
 */

import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'wp-jwt';
const REFRESH_KEY = 'wp-jwt-refresh';
const NAME_KEY = 'wp-user-name';

export interface Session {
  token: string;
  refreshToken: string | null;
  name: string;
}

let current: Session | null = null;

export function getSession(): Session | null {
  return current;
}

export function getToken(): string | null {
  return current?.token ?? null;
}

/** Lee la sesión persistida al arrancar la app. Nunca lanza. */
export async function restoreSession(): Promise<Session | null> {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!token) {
      current = null;
      return null;
    }
    const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
    const name = (await SecureStore.getItemAsync(NAME_KEY)) ?? '';
    current = { token, refreshToken, name };
    return current;
  } catch {
    current = null;
    return null;
  }
}

export async function saveSession(session: Session): Promise<void> {
  current = session;
  await SecureStore.setItemAsync(TOKEN_KEY, session.token);
  await SecureStore.setItemAsync(NAME_KEY, session.name);
  if (session.refreshToken) {
    await SecureStore.setItemAsync(REFRESH_KEY, session.refreshToken);
  } else {
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  }
}

/** Reemplaza solo el access token (tras un refresh silencioso). */
export async function updateToken(token: string): Promise<void> {
  if (!current) return;
  current = { ...current, token };
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearSession(): Promise<void> {
  current = null;
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
  await SecureStore.deleteItemAsync(NAME_KEY);
}

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Decodifica base64url sin depender de atob/Buffer (no garantizados en Hermes). */
function decodeBase64Url(input: string): string {
  const clean = input.replace(/-/g, '+').replace(/_/g, '/').replace(/[^A-Za-z0-9+/]/g, '');
  let bits = 0;
  let acc = 0;
  let out = '';
  for (const char of clean) {
    const value = B64_ALPHABET.indexOf(char);
    if (value < 0) continue;
    acc = (acc << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out += String.fromCharCode((acc >> bits) & 0xff);
    }
  }
  return out;
}

/**
 * Segundos que le quedan de vida al JWT según su claim `exp`, o null si no se
 * puede leer. Solo informativo: el servidor es quien decide.
 */
export function tokenSecondsLeft(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = JSON.parse(decodeBase64Url(payload)) as { exp?: number };
    if (typeof json.exp !== 'number') return null;
    return json.exp - Math.floor(Date.now() / 1000);
  } catch {
    return null;
  }
}
