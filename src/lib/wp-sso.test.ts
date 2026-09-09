import { afterEach, describe, expect, it, vi } from 'vitest';

import { seedWpSession } from './wp-sso';

describe('seedWpSession', () => {
  afterEach(() => {
    localStorage.clear();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('libera la navegación si la petición SSO queda pendiente', async () => {
    vi.useFakeTimers();
    localStorage.setItem('wp-jwt', 'test-token');

    vi.stubGlobal(
      'fetch',
      vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true },
          );
        }),
      ),
    );

    const navigationGate = Promise.race([
      seedWpSession().then(() => 'released'),
      new Promise<string>((resolve) => {
        window.setTimeout(() => resolve('blocked'), 4_000);
      }),
    ]);

    await vi.advanceTimersByTimeAsync(4_000);

    await expect(navigationGate).resolves.toBe('released');
  });
});
