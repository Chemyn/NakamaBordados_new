/**
 * Login contra WordPress. Se reusa exactamente el mismo mecanismo que la web:
 * la mutación `login` de WPGraphQL JWT Authentication devuelve el token que
 * luego autentica también los endpoints REST del panel de producción.
 *
 * El login social reusa el bridge que ya existe en el plugin
 * nakama-checkout-tools (`?nk_bridge=social-login`): OAuth en el navegador ->
 * cookie de WordPress -> bridge que emite el JWT -> vuelta a /app-auth/ del
 * sitio, que reenvía el token al esquema nakamaprod:// de la app.
 */

import * as WebBrowser from 'expo-web-browser';

import { API_ORIGIN, APP_AUTH_PATH, AUTH_REDIRECT, GRAPHQL_URL } from './config';
import { saveSession, updateToken, type Session } from './session';

export type SocialProvider = 'google' | 'facebook';

interface GraphQLResponse<T> {
  data?: T;
  errors?: { message?: string }[];
}

interface LoginPayload {
  login?: {
    authToken?: string;
    refreshToken?: string;
    user?: { name?: string };
  };
}

interface RefreshPayload {
  refreshJwtAuthToken?: { authToken?: string };
}

const LOGIN_MUTATION = `
  mutation LoginUser($username: String!, $password: String!) {
    login(input: { clientMutationId: "nakama-app", username: $username, password: $password }) {
      authToken
      refreshToken
      user { name }
    }
  }
`;

/** Variante sin refreshToken, por si el plugin del sitio no expone ese campo. */
const LOGIN_MUTATION_BASIC = `
  mutation LoginUser($username: String!, $password: String!) {
    login(input: { clientMutationId: "nakama-app", username: $username, password: $password }) {
      authToken
      user { name }
    }
  }
`;

const REFRESH_MUTATION = `
  mutation RefreshToken($refresh: String!) {
    refreshJwtAuthToken(input: { jwtRefreshToken: $refresh }) {
      authToken
    }
  }
`;

async function graphql<T>(query: string, variables: Record<string, unknown>): Promise<GraphQLResponse<T>> {
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  return (await res.json()) as GraphQLResponse<T>;
}

function firstError(errors?: { message?: string }[]): string | null {
  const raw = errors?.[0]?.message;
  if (!raw) return null;
  // WordPress devuelve los mensajes de error de login con marcado HTML.
  return raw.replace(/<[^>]*>/g, '').trim() || null;
}

/** Inicia sesión con usuario/contraseña y persiste la sesión. */
export async function signInWithPassword(username: string, password: string): Promise<Session> {
  const variables = { username: username.trim(), password };

  let result = await graphql<LoginPayload>(LOGIN_MUTATION, variables);
  const message = firstError(result.errors);
  if (message && /refreshToken/i.test(message)) {
    result = await graphql<LoginPayload>(LOGIN_MUTATION_BASIC, variables);
  }

  const token = result.data?.login?.authToken;
  if (!token) {
    throw new Error(firstError(result.errors) ?? 'Usuario o contraseña incorrectos.');
  }

  const session: Session = {
    token,
    refreshToken: result.data?.login?.refreshToken ?? null,
    name: result.data?.login?.user?.name ?? username.trim(),
  };
  await saveSession(session);
  return session;
}

/**
 * Renueva el access token en silencio. Devuelve false si no hay refresh token
 * (caso del login social) o si el servidor lo rechaza: entonces toca re-login.
 */
export async function refreshAccessToken(refreshToken: string | null): Promise<boolean> {
  if (!refreshToken) return false;
  try {
    const result = await graphql<RefreshPayload>(REFRESH_MUTATION, { refresh: refreshToken });
    const token = result.data?.refreshJwtAuthToken?.authToken;
    if (!token) return false;
    await updateToken(token);
    return true;
  } catch {
    return false;
  }
}

function socialLoginUrl(provider: SocialProvider): string {
  const bridge = `${API_ORIGIN}/index.php?nk_bridge=social-login&back=${encodeURIComponent(APP_AUTH_PATH)}`;
  const target = encodeURIComponent(bridge);
  // 'redirect' es el parámetro de Nextend y 'redirect_to' el estándar de
  // wp-login; se mandan los dos porque según la versión respeta uno u otro.
  return `${API_ORIGIN}/wp-login.php?loginSocial=${provider}&redirect=${target}&redirect_to=${target}`;
}

/** Extrae el token del fragmento `#nk_jwt=` con el que vuelve el bridge. */
function tokenFromRedirect(url: string): string | null {
  const hash = url.split('#')[1];
  if (!hash) return null;
  for (const part of hash.split('&')) {
    const [key, value] = part.split('=');
    if (key === 'nk_jwt' && value) return decodeURIComponent(value);
  }
  return null;
}

/**
 * Login social en una pestaña del navegador del sistema (Custom Tabs). No se
 * usa WebView embebido: Google bloquea OAuth en WebViews.
 */
export async function signInWithSocial(provider: SocialProvider): Promise<Session> {
  const result = await WebBrowser.openAuthSessionAsync(socialLoginUrl(provider), AUTH_REDIRECT);

  if (result.type === 'cancel' || result.type === 'dismiss') {
    throw new Error('CANCELLED');
  }
  if (result.type !== 'success') {
    throw new Error('No se pudo completar el inicio de sesión.');
  }
  if (result.url.includes('social_error=1')) {
    throw new Error('El proveedor rechazó el inicio de sesión. Intenta de nuevo.');
  }

  const token = tokenFromRedirect(result.url);
  if (!token) {
    throw new Error('No se recibió la sesión desde el navegador. Intenta de nuevo.');
  }

  // El bridge solo emite el access token: sin refresh, al expirar toca re-login.
  const session: Session = { token, refreshToken: null, name: await fetchViewerName(token) };
  await saveSession(session);
  return session;
}

/** Nombre del usuario del token. Devuelve '' si falla: es solo para mostrarlo. */
async function fetchViewerName(token: string): Promise<string> {
  try {
    const res = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ query: '{ viewer { name } }' }),
    });
    const data = (await res.json()) as GraphQLResponse<{ viewer?: { name?: string } }>;
    return data.data?.viewer?.name ?? '';
  } catch {
    return '';
  }
}
