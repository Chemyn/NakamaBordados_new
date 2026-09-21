import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchAffiliateAccess,
  fetchAffiliateDashboard,
  fetchAffiliateMe,
  fetchAffiliatePayments,
  fetchAffiliateSales,
  downloadAffiliateReceipt,
  uploadFiscalDocument,
  fetchAffiliateProducts,
  fetchAffiliateProductRequest,
  submitAffiliateProductRequest,
  fetchAffiliateEvidence,
  submitAffiliateEvidence,
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

  it('reads only the private profile, dashboard, sales, and payment contracts', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ can: true, financialAccess: true, profile: { code: 'NICO' }, fiscal: { status: 'approved' } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, period: '2026-09', summary: { salesMxn: 10000, commissionMxn: 1000 } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, page: 2, hasMore: false, items: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, page: 1, hasMore: false, items: [] }) });
    vi.stubGlobal('fetch', fetchMock);

    await fetchAffiliateMe();
    await fetchAffiliateDashboard();
    await fetchAffiliateSales(2);
    await fetchAffiliatePayments(1);

    expect(fetchMock.mock.calls[0][0]).toContain('rest_route=/nakama/v1/affiliates/me');
    expect(fetchMock.mock.calls[1][0]).toContain('/me/dashboard');
    expect(fetchMock.mock.calls[2][0]).toContain('/me/sales');
    expect(fetchMock.mock.calls[2][0]).toContain('page=2');
    expect(fetchMock.mock.calls[3][0]).toContain('/me/payments');
  });

  it('downloads a private receipt with the JWT and no WordPress cookies', async () => {
    const receipt = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, blob: async () => receipt });
    const createObjectURL = vi.fn(() => 'blob:receipt');
    const revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

    await downloadAffiliateReceipt(22);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/me/payments/22/download');
    expect(init.headers.Authorization).toBe('Bearer signed-token');
    expect(init.credentials).toBe('omit');
    expect(createObjectURL).toHaveBeenCalledWith(receipt);
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:receipt');
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

  it('reads and mutates the monthly mission through authenticated JSON contracts', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, items: [] }) });
    vi.stubGlobal('fetch', fetchMock);
    await fetchAffiliateProducts(2);
    await fetchAffiliateProductRequest();
    await submitAffiliateProductRequest({ items: [{ product_id: 1, variation_id: 0 }], address: { name: 'Jose', address1: 'Calle 1', address2: '', city: 'Hermosillo', state: 'Sonora', postcode: '83000', country: 'MX', phone: '662' } });
    await fetchAffiliateEvidence(12);
    await submitAffiliateEvidence({ requestId: 12, urls: { reel_1: 'https://instagram.com/reel/a', reel_2: 'https://instagram.com/reel/b', story_1: 'https://instagram.com/stories/c', bonus: '' } });

    expect(fetchMock.mock.calls[0][0]).toContain('/me/products');
    expect(fetchMock.mock.calls[0][0]).toContain('page=2');
    expect(fetchMock.mock.calls[1][0]).toContain('/me/product-request');
    expect(fetchMock.mock.calls[2][1]).toEqual(expect.objectContaining({ method: 'POST', body: expect.any(String) }));
    expect(fetchMock.mock.calls[2][1].headers['Content-Type']).toBe('application/json');
    expect(fetchMock.mock.calls[3][0]).toContain('request_id=12');
    expect(fetchMock.mock.calls[4][1]).toEqual(expect.objectContaining({ method: 'POST' }));
  });
});
