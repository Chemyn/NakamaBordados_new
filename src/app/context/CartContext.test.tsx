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

  it('keeps a saved coupon available when an affiliate code is added', async () => {
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
    expect(result.current.couponCode).toBe('RECUPERA20');
    expect(result.current.couponKind).toBe('native_coupon');
    expect(result.current.promotionChoice).toBe('coupon');
    expect(localStorage.getItem('nakama_coupon')).toBe('RECUPERA20');
    expect(localStorage.getItem('nakama_affiliate_attribution')).toContain('NICO');
  });

  it('keeps an active affiliate available when a second valid code is entered', async () => {
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

    await act(async () => { await result.current.applyAffiliateCode('NICO', 'manual'); });
    await act(async () => { await result.current.applyCoupon('RECUPERA20'); });

    expect(result.current.couponCode).toBe('RECUPERA20');
    expect(result.current.couponKind).toBe('native_coupon');
    expect(result.current.affiliateCode).toBe('NICO');
    expect(result.current.promotionChoice).toBe('affiliate');
    expect(localStorage.getItem('nakama_affiliate_attribution')).toContain('NICO');

    act(() => result.current.selectPromotion('coupon'));

    expect(result.current.promotionChoice).toBe('coupon');
    expect(result.current.affiliateCode).toBe('NICO');
    expect(result.current.couponCode).toBe('RECUPERA20');
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
    expect(result.current.affiliateCode).toBe('NICO');
    expect(result.current.promotionChoice).toBe('affiliate');
    expect(localStorage.getItem('nakama_coupon')).toBe('MANUAL15');
  });

  it('bypasses cached validation responses for codes that administrators can activate later', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_797_984_000_000);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ valid: false, message: 'El código no está disponible.' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CartProvider>{children}</CartProvider>
    );
    const { result } = renderHook(() => useCart(), { wrapper });

    await act(async () => { await result.current.applyCoupon('MANUAL15'); });

    const [requestUrl, requestOptions] = fetchMock.mock.calls[0];
    expect(new URL(requestUrl).searchParams.get('code')).toBe('MANUAL15');
    expect(new URL(requestUrl).searchParams.get('cache_bust')).toBe('1797984000000');
    expect(requestOptions).toEqual({ cache: 'no-store' });
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

  it('clears the selected promotion together with the cart', async () => {
    localStorage.setItem('nakama_coupon', 'MANUAL15');
    localStorage.setItem('nakama_affiliate_attribution', JSON.stringify({
      code: 'NICO',
      source: 'manual',
      expiresAt: '2099-10-19T12:00:00.000Z',
      discountPercentage: 10,
    }));
    localStorage.setItem('nakama_promotion_choice', 'affiliate');
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
        json: async () => ({ valid: true, kind: 'nakama_manual', code: 'MANUAL15' }),
      }));
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CartProvider>{children}</CartProvider>
    );
    const { result } = renderHook(() => useCart(), { wrapper });

    await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
    expect(result.current.promotionChoice).toBe('affiliate');

    act(() => result.current.clearCart());

    expect(result.current.promotionChoice).toBe('');
    expect(result.current.affiliateCode).toBe('');
    expect(result.current.couponCode).toBe('');
  });
});
