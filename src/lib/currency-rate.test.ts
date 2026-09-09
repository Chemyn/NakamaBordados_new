import { describe, expect, it, vi } from 'vitest';

import { fetchUsdRate, type StoredUsdRate } from './currency-rate';

const jsonResponse = (data: unknown, ok = true) => ({
  ok,
  json: vi.fn().mockResolvedValue(data),
}) as unknown as Response;

describe('fetchUsdRate', () => {
  it('uses the WooCommerce rate first because it already includes the store markup', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ usdRate: 0.061, rateSource: 'live' }));

    await expect(fetchUsdRate({ apiBaseUrl: 'https://shop.test', fetcher })).resolves.toMatchObject({
      rate: 0.061,
      source: 'wordpress',
      stale: false,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('falls back to the public provider and applies the same two-peso markup', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(jsonResponse({}, false))
      .mockResolvedValueOnce(jsonResponse({ result: 'success', rates: { USD: 0.05 } }));

    const result = await fetchUsdRate({ apiBaseUrl: 'https://shop.test', fetcher });

    expect(result?.source).toBe('public');
    expect(result?.stale).toBe(false);
    expect(result?.rate).toBeCloseTo(1 / 18);
  });

  it('uses a recent last-known-good rate when both providers are unavailable', async () => {
    const cachedRate: StoredUsdRate = { rate: 0.058, updatedAt: Date.now() - 60_000 };
    const fetcher = vi.fn().mockRejectedValue(new TypeError('offline'));

    await expect(fetchUsdRate({ apiBaseUrl: 'https://shop.test', fetcher, cachedRate })).resolves.toEqual({
      rate: 0.058,
      source: 'cache',
      stale: true,
      updatedAt: cachedRate.updatedAt,
    });
  });

  it('rejects malformed or unsuccessful provider payloads', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ usdRate: -3 }))
      .mockResolvedValueOnce(jsonResponse({ result: 'error', rates: { USD: 0.05 } }));

    await expect(fetchUsdRate({ apiBaseUrl: 'https://shop.test', fetcher })).resolves.toBeNull();
  });

  it('does not use an expired browser rate', async () => {
    const cachedRate: StoredUsdRate = { rate: 0.058, updatedAt: Date.now() - 8 * 24 * 60 * 60 * 1000 };
    const fetcher = vi.fn().mockRejectedValue(new TypeError('offline'));

    await expect(fetchUsdRate({ apiBaseUrl: 'https://shop.test', fetcher, cachedRate })).resolves.toBeNull();
  });
});
