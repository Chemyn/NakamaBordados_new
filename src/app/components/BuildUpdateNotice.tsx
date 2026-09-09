'use client';

import { useCallback, useEffect, useState } from 'react';

type BuildUpdateNoticeProps = {
  currentBuildId: string;
  fetcher?: typeof fetch;
  onRefresh?: () => void;
};

export default function BuildUpdateNotice({
  currentBuildId,
  fetcher = fetch,
  onRefresh = () => window.location.reload(),
}: BuildUpdateNoticeProps) {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const checkVersion = useCallback(async () => {
    try {
      const response = await fetcher(`/app/web-version.json?ts=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json() as { buildId?: unknown };
      if (typeof data.buildId === 'string' && data.buildId !== currentBuildId) {
        setUpdateAvailable(true);
      }
    } catch {
      // No interrumpir la navegación si la comprobación de versión falla.
    }
  }, [currentBuildId, fetcher]);

  useEffect(() => {
    const initialCheck = window.setTimeout(() => void checkVersion(), 0);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void checkVersion();
    };
    window.addEventListener('focus', checkVersion);
    document.addEventListener('visibilitychange', handleVisibility);
    const interval = window.setInterval(checkVersion, 5 * 60 * 1000);
    return () => {
      window.clearTimeout(initialCheck);
      window.removeEventListener('focus', checkVersion);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.clearInterval(interval);
    };
  }, [checkVersion]);

  if (!updateAvailable) return null;

  return (
    <div className="nk-build-update" role="status" aria-live="polite">
      <span className="material-icons-outlined" aria-hidden="true">system_update</span>
      <span>Hay una nueva versión disponible.</span>
      <button type="button" onClick={onRefresh}>Actualizar</button>
    </div>
  );
}
