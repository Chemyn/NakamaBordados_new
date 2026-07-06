'use client';

import React from 'react';
import { Product } from '@/types/product';
import { useCurrency } from '../context/CurrencyContext';

/**
 * Precio "desde" de una tarjeta de producto, consciente de descuentos:
 * cuando el API reporta regularPrice > price, muestra el regular tachado,
 * el precio de oferta y el porcentaje de rebaja.
 *
 * El % se calcula sobre la variación MÁS BARATA (la misma que define el
 * "desde" del rango) para no prometer rebajas que otra talla no tiene.
 */
export function getPricing(p: Product) {
  const vars = p.type === 'variable' && p.variations && p.variations.length > 0 ? p.variations : null;
  const minPrice = vars ? Math.min(...vars.map(v => v.price)) : p.price;
  const maxPrice = vars ? Math.max(...vars.map(v => v.price)) : p.price;

  let regular = 0;
  if (vars) {
    const cheapest = vars.reduce((a, b) => (b.price < a.price ? b : a));
    regular = cheapest.regularPrice || p.regularPrice || 0;
  } else {
    regular = p.regularPrice || 0;
  }

  const discounted = regular > minPrice && minPrice > 0;
  const pct = discounted ? Math.round((1 - minPrice / regular) * 100) : 0;

  return { minPrice, maxPrice, regular, discounted, pct };
}

export default function ProductPrice({ product }: { product: Product }) {
  const { formatPrice } = useCurrency();
  const { minPrice, maxPrice, regular, discounted, pct } = getPricing(product);

  const display = minPrice === maxPrice
    ? formatPrice(minPrice)
    : `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`;

  return (
    <span className="nk-price-line">
      {discounted && <s className="nk-price-regular">{formatPrice(regular)}</s>}
      <span className="nk-price-current">{display}</span>
      {discounted && pct > 0 && <span className="nk-price-off">-{pct}%</span>}
    </span>
  );
}
