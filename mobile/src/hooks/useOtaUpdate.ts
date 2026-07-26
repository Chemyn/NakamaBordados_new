import { useCallback, useEffect, useState } from 'react';
import * as Updates from 'expo-updates';

type OtaStatus = 'idle' | 'checking' | 'ready' | 'disabled';

interface OtaUpdate {
  status: OtaStatus;
  /** Reinicia la app con la actualización ya descargada. */
  apply: () => void;
}

/**
 * Actualizaciones por aire (EAS Update): cambios de diseño y de lógica llegan
 * solos, sin reinstalar el APK.
 *
 * Descarga en segundo plano y NUNCA reinicia por su cuenta: un operador con un
 * pedido a medias no puede perder la pantalla de golpe. Si ignora el aviso, el
 * update queda descargado y Android lo aplica en el siguiente arranque en frío
 * (checkAutomatically: ON_LOAD en app.json).
 *
 * Los cambios que tocan código nativo NO viajan por aquí: cambian el
 * runtimeVersion (policy fingerprint) y el servidor deja de ofrecerlos a los
 * APK viejos. Para esos está useApkVersion().
 */
export function useOtaUpdate(): OtaUpdate {
  const [status, setStatus] = useState<OtaStatus>(
    __DEV__ || !Updates.isEnabled ? 'disabled' : 'idle',
  );

  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;

    let alive = true;

    (async () => {
      try {
        setStatus('checking');
        const check = await Updates.checkForUpdateAsync();
        if (!alive) return;

        if (!check.isAvailable) {
          setStatus('idle');
          return;
        }

        await Updates.fetchUpdateAsync();
        if (alive) setStatus('ready');
      } catch {
        // Sin señal o servidor caído: la app sigue con la versión que ya tiene.
        if (alive) setStatus('idle');
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const apply = useCallback(() => {
    Updates.reloadAsync().catch(() => {
      // Si el reinicio falla, el update se aplicará al siguiente arranque.
    });
  }, []);

  return { status, apply };
}
