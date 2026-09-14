import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearWordPressSession, updateAccountProfile } from './account-api';

vi.mock('./api-host', () => ({ apiOrigin: () => 'https://example.test' }));

beforeEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe('account API', () => {
  it('updates only the authenticated account without browser cookies', async () => {
    localStorage.setItem('wp-jwt', 'fresh-token');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await updateAccountProfile({ firstName: 'Nico', lastName: 'Robin', billingPhone: '123' });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('rest_route=/nakama/v1/account/profile'),
      expect.objectContaining({
        method: 'POST',
        credentials: 'omit',
        cache: 'no-store',
        headers: expect.objectContaining({
          Authorization: 'Bearer fresh-token',
          'Content-Type': 'application/json',
        }),
      }),
    );
  });

  it('clears the WordPress cookie session with same-origin credentials', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    await clearWordPressSession('old-token');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('rest_route=/nakama/v1/logout'),
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Authorization: 'Bearer old-token' },
      }),
    );
  });
});
