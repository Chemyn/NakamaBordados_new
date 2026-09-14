import { apiOrigin } from './api-host';

export interface AccountShippingInput {
  address1: string;
  address2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
}

export interface AccountProfileInput {
  firstName?: string;
  lastName?: string;
  billingPhone?: string;
  shipping?: AccountShippingInput;
}

export interface AccountProfileSnapshot {
  firstName: string;
  lastName: string;
  billingPhone: string;
  shipping: AccountShippingInput;
}

export interface AccountProfileResult {
  success: boolean;
  error?: string;
  profile?: AccountProfileSnapshot;
}

function accountUrl(path: string): string {
  return `${apiOrigin()}/?rest_route=/nakama/v1${path}&nkcb=${Date.now()}`;
}

export async function updateAccountProfile(input: AccountProfileInput): Promise<AccountProfileResult> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('wp-jwt') : null;
  if (!token) return { success: false, error: 'Tu sesión ya no está disponible. Inicia sesión de nuevo.' };

  try {
    const res = await fetch(accountUrl('/account/profile'), {
      method: 'POST',
      credentials: 'omit',
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success) {
      return { success: false, error: data?.message || 'No se pudieron guardar los cambios.' };
    }
    return { success: true, profile: data.profile };
  } catch {
    return { success: false, error: 'No hay conexión. Tus cambios no se guardaron.' };
  }
}

/** Borra la cookie de WordPress sin impedir que el cierre local sea inmediato. */
export async function clearWordPressSession(token: string | null): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3_500);
  try {
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(accountUrl('/logout'), {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers,
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}
