import { apiOrigin } from '@/lib/api-host';

export const AFFILIATE_STORAGE_KEY = 'nakama_affiliate_attribution';

export type AffiliateSource = 'manual' | 'referral';

export type AffiliateAttribution = {
  code: string;
  source: AffiliateSource;
  expiresAt: string;
  discountPercentage: number;
};

type AffiliateValidation =
  | { success: true; attribution: Omit<AffiliateAttribution, 'source'> }
  | { success: false; message: string };

const isCode = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Z0-9_-]{1,24}$/.test(value);

export function parseStoredAffiliateAttribution(
  raw: string | null,
  now = Date.now(),
): AffiliateAttribution | null {
  if (!raw) return null;

  try {
    const value = JSON.parse(raw) as Partial<AffiliateAttribution>;
    const expiresAt = typeof value.expiresAt === 'string' ? Date.parse(value.expiresAt) : Number.NaN;
    const percentage = Number(value.discountPercentage);
    if (
      !isCode(value.code)
      || (value.source !== 'manual' && value.source !== 'referral')
      || !Number.isFinite(expiresAt)
      || expiresAt <= now
      || !Number.isFinite(percentage)
      || percentage <= 0
      || percentage > 10
    ) {
      return null;
    }

    return {
      code: value.code,
      source: value.source,
      expiresAt: value.expiresAt as string,
      discountPercentage: percentage,
    };
  } catch {
    return null;
  }
}

export function chooseAffiliateAttribution(
  current: AffiliateAttribution | null,
  incoming: AffiliateAttribution,
): AffiliateAttribution {
  if (current?.source === 'manual' && incoming.source === 'referral') {
    return current;
  }
  return incoming;
}

export async function validateAffiliateCode(
  code: string,
  fetcher: typeof fetch = fetch,
): Promise<AffiliateValidation> {
  const candidate = code.trim().toUpperCase();
  if (!candidate) {
    return { success: false, message: 'Escribe un código de afiliado.' };
  }

  try {
    const url = `${apiOrigin()}/?rest_route=/nakama/v1/affiliates/code&code=${encodeURIComponent(candidate)}&_cb=${Date.now()}`;
    const response = await fetcher(url, { cache: 'no-store', credentials: 'omit' });
    if (!response.ok) {
      return { success: false, message: 'No pudimos validar el código. Inténtalo de nuevo.' };
    }

    const data = await response.json();
    const expiresAt = typeof data?.expiresAt === 'string' ? Date.parse(data.expiresAt) : Number.NaN;
    const percentage = Number(data?.discountPercentage);
    if (
      !data?.valid
      || !isCode(data?.code)
      || !Number.isFinite(expiresAt)
      || expiresAt <= Date.now()
      || !Number.isFinite(percentage)
      || percentage <= 0
      || percentage > 10
    ) {
      return { success: false, message: data?.message || 'Código de afiliado no válido.' };
    }

    return {
      success: true,
      attribution: {
        code: data.code,
        expiresAt: data.expiresAt,
        discountPercentage: percentage,
      },
    };
  } catch {
    return { success: false, message: 'No pudimos validar el código. Inténtalo de nuevo.' };
  }
}

