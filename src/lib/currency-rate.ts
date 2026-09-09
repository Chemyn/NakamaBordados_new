export type StoredUsdRate = {
  rate: number;
  updatedAt: number;
};

export type UsdRateResult = StoredUsdRate & {
  source: 'wordpress' | 'public' | 'cache';
  stale: boolean;
};

type FetchUsdRateOptions = {
  apiBaseUrl: string;
  fetcher?: typeof fetch;
  cachedRate?: StoredUsdRate | null;
  timeoutMs?: number;
  now?: number;
};

const MAX_BROWSER_RATE_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const isValidRate = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

export function applyUsdMarkup(rawRate: number): number {
  if (!isValidRate(rawRate)) return rawRate;
  const pesosPorDolar = Math.max(1, 1 / rawRate - 2);
  return 1 / pesosPorDolar;
}

async function fetchJson(
  fetcher: typeof fetch,
  url: string,
  timeoutMs: number,
): Promise<unknown | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(url, { signal: controller.signal, cache: 'no-store' });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchUsdRate({
  apiBaseUrl,
  fetcher = fetch,
  cachedRate,
  timeoutMs = 6_000,
  now = Date.now(),
}: FetchUsdRateOptions): Promise<UsdRateResult | null> {
  const wordpressUrl = `${apiBaseUrl}/?rest_route=/nakama/v1/currency&nkcb=${now}`;
  const wordpressData = await fetchJson(fetcher, wordpressUrl, timeoutMs) as {
    usdRate?: unknown;
    rateSource?: unknown;
    rateUpdatedAt?: unknown;
  } | null;

  if (isValidRate(wordpressData?.usdRate)) {
    const backendIsStale = wordpressData?.rateSource === 'stale';
    return {
      rate: wordpressData.usdRate,
      source: backendIsStale ? 'cache' : 'wordpress',
      stale: backendIsStale,
      updatedAt: typeof wordpressData.rateUpdatedAt === 'number'
        ? wordpressData.rateUpdatedAt * 1000
        : now,
    };
  }

  const publicData = await fetchJson(fetcher, 'https://open.er-api.com/v6/latest/MXN', timeoutMs) as {
    result?: unknown;
    rates?: { USD?: unknown };
  } | null;
  if (publicData?.result === 'success' && isValidRate(publicData.rates?.USD)) {
    return {
      rate: applyUsdMarkup(publicData.rates.USD),
      source: 'public',
      stale: false,
      updatedAt: now,
    };
  }

  if (
    cachedRate
    && isValidRate(cachedRate.rate)
    && Number.isFinite(cachedRate.updatedAt)
    && now - cachedRate.updatedAt <= MAX_BROWSER_RATE_AGE_MS
  ) {
    return { ...cachedRate, source: 'cache', stale: true };
  }

  return null;
}
