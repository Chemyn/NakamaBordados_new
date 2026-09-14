import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchProductionAccess } from './production-api';
import { fetchWarehouseCapabilities } from './warehouse-api';

vi.mock('./api-host', () => ({ apiOrigin: () => 'https://example.test' }));

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('wp-jwt', 'admin-token');
  vi.unstubAllGlobals();
});

describe('privileged REST session isolation', () => {
  it('uses the current JWT and omits stale WordPress cookies for both access checks', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ can: true, can_review: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ can: true, can_manage: true }) });
    vi.stubGlobal('fetch', fetchMock);

    await fetchProductionAccess();
    await fetchWarehouseCapabilities();

    for (const [, init] of fetchMock.mock.calls) {
      expect(init).toEqual(expect.objectContaining({
        credentials: 'omit',
        cache: 'no-store',
        headers: { Authorization: 'Bearer admin-token' },
      }));
    }
  });
});
