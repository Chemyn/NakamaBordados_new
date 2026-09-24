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
    expect(result.current.couponKind).toBe('');
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
    expect(result.current.couponKind).toBe('');
    expect(result.current.discount).toBe(0);
    expect(localStorage.getItem('nakama_coupon')).toBeNull();
  });

  it('applies a server-validated affiliate code and removes a native coupon', async () => {
    localStorage.setItem('nakama_coupon', 'RECUPERA20');
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ valid: true, kind: 'native_coupon', code: 'RECUPERA20', type: 'percent', amount: 20 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          valid: true,
          code: 'NICO',
          expiresAt: '2099-10-19T12:00:00.000Z',
          discountPercentage: 10,
        }),
      }));
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CartProvider>{children}</CartProvider>
    );
    const { result } = renderHook(() => useCart(), { wrapper });

    await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
    await act(async () => {
      expect(await result.current.applyAffiliateCode('nico', 'manual')).toEqual({ success: true });
    });

    expect(result.current.affiliateCode).toBe('NICO');
    expect(result.current.affiliateSource).toBe('manual');
    expect(result.current.couponCode).toBe('');
    expect(result.current.couponKind).toBe('');
    expect(localStorage.getItem('nakama_coupon')).toBeNull();
    expect(localStorage.getItem('nakama_affiliate_attribution')).toContain('NICO');
  });

  it('applying a native coupon removes a previously active affiliate code', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          valid: true,
          code: 'NICO',
          expiresAt: '2099-10-19T12:00:00.000Z',
          discountPercentage: 10,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ valid: true, kind: 'native_coupon', code: 'RECUPERA20', type: 'percent', amount: 20 }),
      }));
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CartProvider>{children}</CartProvider>
    );
    const { result } = renderHook(() => useCart(), { wrapper });

    await act(async () => {
      await result.current.applyAffiliateCode('NICO', 'manual');
      await result.current.applyCoupon('RECUPERA20');
    });

    expect(result.current.couponCode).toBe('RECUPERA20');
    expect(result.current.couponKind).toBe('native_coupon');
    expect(result.current.affiliateCode).toBe('');
    expect(localStorage.getItem('nakama_affiliate_attribution')).toBeNull();
  });

  it('stores a server-recognized Nakama code without estimating its discount', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          valid: true,
          code: 'NICO',
          expiresAt: '2099-10-19T12:00:00.000Z',
          discountPercentage: 10,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          valid: true,
          kind: 'nakama_manual',
          code: 'MANUAL15',
          selection_key: 'public_code:manual-combo',
          allow_modifiers: true,
          message: 'Código reconocido. Podrás comparar las promociones disponibles en el checkout.',
        }),
      }));
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CartProvider>{children}</CartProvider>
    );
    const { result } = renderHook(() => useCart(), { wrapper });

    await act(async () => {
      await result.current.applyAffiliateCode('NICO', 'manual');
    });
    await act(async () => {
      expect(await result.current.applyCoupon('MANUAL15')).toEqual({
        success: true,
        kind: 'nakama_manual',
        message: 'Código reconocido. Podrás comparar las promociones disponibles en el checkout.',
      });
    });

    expect(result.current.couponCode).toBe('MANUAL15');
    expect(result.current.couponKind).toBe('nakama_manual');
    expect(result.current.discount).toBe(0);
    expect(result.current.affiliateCode).toBe('');
    expect(localStorage.getItem('nakama_coupon')).toBe('MANUAL15');
  });

  it('revalidates a saved manual Nakama code and restores only its typed intent', async () => {
    localStorage.setItem('nakama_coupon', 'MANUAL15');
    localStorage.setItem('nakama_discount', '999');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        valid: true,
        kind: 'nakama_manual',
        code: 'MANUAL15',
        selection_key: 'public_code:manual-combo',
        allow_modifiers: true,
      }),
    }));
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CartProvider>{children}</CartProvider>
    );
    const { result } = renderHook(() => useCart(), { wrapper });

    await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });

    expect(result.current.couponCode).toBe('MANUAL15');
    expect(result.current.couponKind).toBe('nakama_manual');
    expect(result.current.discount).toBe(0);
  });
});
