import { useCallback, useEffect, useState } from 'react';

import { enablePush, type PushState } from '@/lib/push';

/**
 * Estado compartido del registro de notificaciones: la pestaña Tablero lo
 * dispara al entrar y Ajustes lo muestra, sin repetir el registro en cada
 * pantalla.
 */
let cached: PushState | null = null;
const listeners = new Set<(state: PushState) => void>();

function publish(state: PushState): void {
  cached = state;
  for (const listener of listeners) listener(state);
}

export function resetPushState(): void {
  cached = null;
}

export function usePush() {
  const [state, setState] = useState<PushState | null>(cached);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    listeners.add(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);

  const refresh = useCallback(async () => {
    setChecking(true);
    try {
      publish(await enablePush());
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (cached === null) void refresh();
  }, [refresh]);

  return { state, checking, refresh };
}
