import { useQuery } from '@tanstack/react-query';
import * as Application from 'expo-application';

import { API_ORIGIN } from '@/lib/config';

/** Publicado por la web en public/app/version.json. */
interface RemoteVersion {
  versionCode: number;
  version: string;
  apkUrl: string;
  notes?: string;
}

export interface ApkUpdate {
  available: boolean;
  version?: string;
  apkUrl?: string;
  notes?: string;
}

const VERSION_URL = `${API_ORIGIN}/app/version.json`;

/** El manifiesto viene de la red: no se confía en su forma. */
function parseRemote(data: unknown): RemoteVersion | null {
  if (typeof data !== 'object' || data === null) return null;
  const raw = data as Record<string, unknown>;

  const versionCode = Number(raw.versionCode);
  const version = raw.version;
  const apkUrl = raw.apkUrl;

  if (!Number.isFinite(versionCode) || versionCode <= 0) return null;
  if (typeof version !== 'string' || !version) return null;
  // Solo HTTPS y solo del dominio esperado: evita que un manifiesto manipulado
  // mande a los operadores a descargar un APK de cualquier sitio.
  if (typeof apkUrl !== 'string' || !/^https:\/\/github\.com\/Chemyn\//i.test(apkUrl)) return null;

  return {
    versionCode,
    version,
    apkUrl,
    notes: typeof raw.notes === 'string' ? raw.notes : undefined,
  };
}

/**
 * Avisa cuando hay un APK nuevo. Necesario porque los cambios que tocan código
 * nativo no pueden viajar por EAS Update: hay que reinstalar el APK.
 *
 * Compara el versionCode del APK instalado (lo asigna EAS al compilar) contra
 * el que publica la web.
 */
export function useApkVersion(): ApkUpdate {
  const { data } = useQuery({
    queryKey: ['apk-version'],
    queryFn: async (): Promise<RemoteVersion | null> => {
      const res = await fetch(`${VERSION_URL}?_cb=${Date.now()}`);
      if (!res.ok) return null;
      return parseRemote(await res.json());
    },
    staleTime: 60 * 60 * 1000,
    retry: 0,
  });

  if (!data) return { available: false };

  const installed = Number(Application.nativeBuildVersion);
  if (!Number.isFinite(installed) || data.versionCode <= installed) {
    return { available: false };
  }

  return {
    available: true,
    version: data.version,
    apkUrl: data.apkUrl,
    notes: data.notes,
  };
}
