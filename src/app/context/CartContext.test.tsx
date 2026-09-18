import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CartProvider, useCart } from './CartContext';

vi.mock('@/lib/api-host', () => ({ apiOrigin: () => 'https://example.test' }));
vi.mock('@/lib/analytics', () => ({ trackAddToCart: vi.fn() }));

describe('CartProvider abandoned-cart coupons', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('fails closed when WooCommerce cannot validate a formerly hardcoded code', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CartProvider>{children}</CartProvider>
    );
    const { result } = renderHook(() => useCart(), { wrapper });

    let response: Awaited<ReturnType<typeof result.current.applyCoupon>> | undefined;
    await act(async () => {
      response = await result.current.applyCoupon('NAKAMA10');
    });

    expect(response).toEqual({
      success: false,
      message: 'No pudimos validar el cupón. Inténtalo de nuevo.',
    });
    expect(result.current.couponCode).toBe('');
    expect(localStorage.getItem('nakama_coupon')).toBeNull();
  });

  it('revalidates a saved coupon instead of trusting its stored discount', async () => {
    localStorage.setItem('nakama_coupon', 'NAKAMA10');
    localStorage.setItem('nakama_discount', '0.10');
    localStorage.setItem('nakama_discount_type', 'percent');
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
    vi.stubGlobal('fetch', fetchMock);
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CartProvider>{children}</CartProvider>
    );
    const { result } = renderHook(() => useCart(), { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(result.current.couponCode).toBe('');
    expect(result.current.discount).toBe(0);
    expect(localStorage.getItem('nakama_coupon')).toBeNull();
  });
});
