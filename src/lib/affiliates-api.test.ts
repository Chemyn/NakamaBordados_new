import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchAffiliateAccess,
  fetchAffiliateDashboard,
  fetchAffiliateMe,
  fetchAffiliateSales,
  uploadFiscalDocument,
} from './affiliates-api';

vi.mock('./api-host', () => ({ apiOrigin: () => 'https://api.example.test' }));

describe('affiliates API client', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('wp-jwt', 'signed-token');
    vi.restoreAllMocks();
  });

  it('uses the current JWT without WordPress cookies or cache', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ can: true, vip: false, hasProfile: true, status: 'active' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    expect(await fetchAffiliateAccess()).toEqual(expect.objectContaining({ can: true }));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('rest_route=/nakama/v1/affiliates/access');
    expect(init).toEqual(expect.objectContaining({ credentials: 'omit', cache: 'no-store' }));
    expect(init.headers.Authorization).toBe('Bearer signed-token');
  });

  it('reads only the private profile, dashboard, and paginated sales contracts', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ can: true, financialAccess: true, profile: { code: 'NICO' }, fiscal: { status: 'approved' } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, period: '2026-09', summary: { salesMxn: 10000, commissionMxn: 1000 } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, page: 2, hasMore: false, items: [] }) });
    vi.stubGlobal('fetch', fetchMock);

    await fetchAffiliateMe();
    await fetchAffiliateDashboard();
    await fetchAffiliateSales(2);

    expect(fetchMock.mock.calls[0][0]).toContain('rest_route=/nakama/v1/affiliates/me');
    expect(fetchMock.mock.calls[1][0]).toContain('/me/dashboard');
    expect(fetchMock.mock.calls[2][0]).toContain('/me/sales');
    expect(fetchMock.mock.calls[2][0]).toContain('page=2');
  });

  it('uploads the fiscal PDF as FormData without setting a forged content type', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    vi.stubGlobal('fetch', fetchMock);
    const file = new File(['%PDF-1.4'], 'constancia.pdf', { type: 'application/pdf' });

    await uploadFiscalDocument(file);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(init.body).toBeInstanceOf(FormData);
    expect(init.headers['Content-Type']).toBeUndefined();
    expect(init.headers.Authorization).toBe('Bearer signed-token');
  });

  it('turns a forbidden private request into a stable access-denied state', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ message: 'Forbidden' }),
    }));

    await expect(fetchAffiliateMe()).rejects.toThrow('ACCESS_DENIED');
  });
});
