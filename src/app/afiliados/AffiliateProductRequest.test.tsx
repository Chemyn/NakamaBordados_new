import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AffiliateProductRequest from './AffiliateProductRequest';

const { fetchProducts } = vi.hoisted(() => ({ fetchProducts: vi.fn() }));
vi.mock('@/lib/affiliates-api', () => ({ fetchAffiliateProducts: (page: number) => fetchProducts(page) }));

vi.mock('../context/LanguageContext', () => ({ useLanguage: () => ({ t: (key: string) => ({
  'affiliates.mission.productKicker': 'Recompensa mensual',
  'affiliates.mission.productTitle': 'Elige tu prenda',
  'affiliates.mission.unit': 'unidad disponible',
  'affiliates.mission.units': 'unidades disponibles',
  'affiliates.mission.vipCatalog': 'Tu acceso VIP incluye Drops y Edición especial cuando estén disponibles; no garantiza aprobación.',
  'affiliates.mission.standardCatalog': 'Drops y Edición especial están excluidos de esta selección.',
  'affiliates.mission.noPriceLimit': 'Sin límite de precio dentro del catálogo elegible.',
  'affiliates.mission.selected': 'seleccionadas',
  'affiliates.mission.variation': 'Talla o variante',
  'affiliates.mission.addressTitle': 'Dirección confirmada',
  'affiliates.mission.shippingCovered': 'Nakama cubre el costo del envío.',
  'affiliates.mission.addressConfirm': 'Confirmo que esta dirección es correcta.',
  'affiliates.mission.sendRequest': 'Enviar solicitud',
  'affiliates.mission.sending': 'Enviando…',
  'affiliates.mission.productsMore': 'Ver más',
  'affiliates.mission.productsLoading': 'Cargando productos…',
  'affiliates.mission.productsCount': '{shown} de {total} productos disponibles',
  'affiliates.mission.productsLoadError': 'No pudimos cargar más productos. Pulsa Ver más para reintentar.',
}[key] || key) }) }));

const products = {
  success: true, page: 1, pages: 1, total: 3, hasMore: false,
  items: [
    { id: 1, name: 'Sudadera Akatsuki', price: 1200, image: '', restricted: false, vipVisible: false, variations: [] },
    { id: 2, name: 'Playera Sombrero de Paja', price: 700, image: '', restricted: false, vipVisible: false, variations: [{ id: 21, label: 'Mediana', price: 700 }] },
    { id: 3, name: 'Hoodie Shinigami', price: 1400, image: '', restricted: false, vipVisible: false, variations: [] },
  ],
};
const address = { name: 'Jose Lopez', address1: 'Going Merry 42', address2: '', city: 'Hermosillo', state: 'Sonora', postcode: '83000', country: 'MX', phone: '6621234567' };

describe('AffiliateProductRequest', () => {
  beforeEach(() => { localStorage.clear(); fetchProducts.mockReset(); });

  it('retries the same page and preserves the selection while appending products', async () => {
    const submit = vi.fn().mockResolvedValue({ success: true });
    const initial = { ...products, items: [products.items[0]], total: 2, pages: 2, hasMore: true };
    fetchProducts.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({
      ...products, page: 2, pages: 2, total: 2, hasMore: false, items: [products.items[1]],
    });
    render(<AffiliateProductRequest period="2026-10" quota={2} vip={false} products={initial} request={null} address={address} onSubmit={submit} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /Sudadera Akatsuki/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Ver más' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar más productos');
    expect(screen.getByRole('checkbox', { name: /Sudadera Akatsuki/i })).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Ver más' }));
    expect(await screen.findByRole('checkbox', { name: /Playera Sombrero de Paja/i })).toBeVisible();
    expect(fetchProducts.mock.calls).toEqual([[2], [2]]);
    expect(screen.queryByRole('button', { name: 'Ver más' })).not.toBeInTheDocument();
    expect(screen.getByText('2 de 2 productos disponibles')).toBeVisible();
    expect(screen.getByRole('checkbox', { name: /Sudadera Akatsuki/i })).toBeChecked();
    fireEvent.click(screen.getByRole('checkbox', { name: /Playera Sombrero de Paja/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Confirmo que esta dirección/i }));
    fireEvent.click(screen.getByRole('button', { name: /Enviar solicitud/i }));
    await waitFor(() => expect(submit).toHaveBeenCalledWith({ items: [{ product_id: 1, variation_id: 0 }, { product_id: 2, variation_id: 21 }], address }));
  });

  it('prevents exceeding quota and confirms the address and Nakama-paid shipping', async () => {
    const submit = vi.fn().mockResolvedValue({ success: true });
    render(<AffiliateProductRequest period="2026-10" quota={2} vip={false} products={products} request={null} address={address} onSubmit={submit} />);

    expect(screen.getByText(/Drops y Edición especial/i)).toBeVisible();
    expect(screen.getByText(/Nakama cubre el costo del envío/i)).toBeVisible();
    fireEvent.click(screen.getByRole('checkbox', { name: /Sudadera Akatsuki/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Playera Sombrero de Paja/i }));
    expect(screen.getByRole('checkbox', { name: /Hoodie Shinigami/i })).toBeDisabled();

    fireEvent.click(screen.getByRole('checkbox', { name: /Confirmo que esta dirección/i }));
    fireEvent.click(screen.getByRole('button', { name: /Enviar solicitud/i }));
    await waitFor(() => expect(submit).toHaveBeenCalledWith({
      items: [{ product_id: 1, variation_id: 0 }, { product_id: 2, variation_id: 21 }],
      address,
    }));
  });

  it('explains VIP access without promising approval', () => {
    render(<AffiliateProductRequest period="2026-10" quota={1} vip products={products} request={null} address={address} onSubmit={vi.fn()} />);
    expect(screen.getByText(/VIP.*no garantiza aprobación/i)).toBeVisible();
  });

  it('restores a recoverable selection draft but still requires confirmation', () => {
    localStorage.setItem('nakama-affiliate-products-2026-10', JSON.stringify([{ product_id: 1, variation_id: 0 }]));
    render(<AffiliateProductRequest period="2026-10" quota={2} vip={false} products={products} request={null} address={address} onSubmit={vi.fn()} />);
    expect(screen.getByRole('checkbox', { name: /Sudadera Akatsuki/i })).toBeChecked();
    expect(screen.getByRole('button', { name: /Enviar solicitud/i })).toBeDisabled();
  });
});
