/**
 * Consentimiento de cookies (rastreadores GA4 + Meta Pixel).
 *
 * La decisión vive en localStorage['nakama_cookie_consent'] y el cambio se
 * anuncia con un CustomEvent: el banner (dentro de los providers) y
 * <Analytics/> (montado fuera, en layout.tsx) no comparten contexto de React,
 * así que el evento es lo que permite que los scripts arranquen al instante
 * cuando el cliente acepta, sin recargar la página.
 */

export type CookieConsent = 'accepted' | 'rejected';

export const CONSENT_EVENT = 'nakama:cookie-consent';

const STORAGE_KEY = 'nakama_cookie_consent';

/** Decisión guardada, o null si el cliente todavía no decide. SSR-safe. */
export function getCookieConsent(): CookieConsent | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'accepted' || value === 'rejected' ? value : null;
  } catch {
    return null;
  }
}

export function setCookieConsent(value: CookieConsent): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* Storage bloqueado (modo privado estricto): el banner reaparecerá. */
  }
  window.dispatchEvent(new CustomEvent<CookieConsent>(CONSENT_EVENT, { detail: value }));
}
