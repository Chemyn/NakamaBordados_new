/**
 * Estado de sesión de la app. Al arrancar se confía en la sesión guardada (sin
 * pedir permiso al servidor) para que la app abra aunque el taller esté sin
 * señal; el permiso de producción se verifica al iniciar sesión, que es cuando
 * sabemos que hay red, y cualquier revocación posterior la reporta el propio
 * tablero con el error del servidor.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { checkProductionAccess } from './api';
import { setSessionExpiredHandler } from './rest';
import { signInWithPassword, signInWithSocial, type SocialProvider } from './auth';
import { clearSession, getSession, restoreSession } from './session';

export const NO_ACCESS_MESSAGE =
  'Tu usuario no tiene acceso al Panel de Producción. Pide a un administrador que te lo habilite.';

type Status = 'loading' | 'signedOut' | 'signedIn';

interface AuthValue {
  status: Status;
  userName: string;
  token: string | null;
  signInWithCredentials: (username: string, password: string) => Promise<void>;
  signInWithProvider: (provider: SocialProvider) => Promise<void>;
  signOut: () => Promise<void>;
  sessionExpired: boolean;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [userName, setUserName] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  const forgetSession = useCallback(async () => {
    await clearSession();
    setToken(null);
    setUserName('');
    setStatus('signedOut');
  }, []);

  useEffect(() => {
    let active = true;
    restoreSession().then((session) => {
      if (!active) return;
      setToken(session?.token ?? null);
      setUserName(session?.name ?? '');
      setStatus(session ? 'signedIn' : 'signedOut');
    });
    return () => {
      active = false;
    };
  }, []);

  // El cliente REST avisa cuando el token dejó de ser válido y no se pudo renovar.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      setSessionExpired(true);
      void forgetSession();
    });
    return () => setSessionExpiredHandler(null);
  }, [forgetSession]);

  const completeSignIn = useCallback(async () => {
    let allowed = false;
    try {
      allowed = await checkProductionAccess();
    } catch (error) {
      await clearSession();
      throw error;
    }
    if (!allowed) {
      await clearSession();
      throw new Error(NO_ACCESS_MESSAGE);
    }
    const session = getSession();
    setToken(session?.token ?? null);
    setUserName(session?.name ?? '');
    setSessionExpired(false);
    setStatus('signedIn');
  }, []);

  const signInWithCredentials = useCallback(
    async (username: string, password: string) => {
      await signInWithPassword(username, password);
      await completeSignIn();
    },
    [completeSignIn],
  );

  const signInWithProvider = useCallback(
    async (provider: SocialProvider) => {
      await signInWithSocial(provider);
      await completeSignIn();
    },
    [completeSignIn],
  );

  const signOut = useCallback(async () => {
    setSessionExpired(false);
    await forgetSession();
  }, [forgetSession]);

  const value = useMemo<AuthValue>(
    () => ({
      status,
      userName,
      token,
      signInWithCredentials,
      signInWithProvider,
      signOut,
      sessionExpired,
    }),
    [status, userName, token, signInWithCredentials, signInWithProvider, signOut, sessionExpired],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth debe usarse dentro de AuthProvider.');
  return value;
}
