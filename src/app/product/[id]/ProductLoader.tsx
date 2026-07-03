'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Product } from '@/types/product';
import { apiFetchProductBySlug, apiFetchProducts } from '@/lib/products-api';
import ProductClient from './ProductClient';

/**
 * Carga el producto EN RUNTIME (cliente) desde el API PHP/MySQL de WordPress,
 * en vez de hornearlo en el build. Así, cambiar un producto en WordPress se
 * refleja al instante sin necesidad de rebuild ni FTP del sitio estático.
 *
 * El cascarón estático (esta ruta) se pre-genera vacío en el build; los datos
 * llegan cuando el visitante abre la página.
 */
export default function ProductLoader({ slug }: { slug: string }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'notfound'>('loading');

  useEffect(() => {
    let active = true;

    (async () => {
      setStatus('loading');
      const p = await apiFetchProductBySlug(slug);
      if (!active) return;

      if (!p) {
        setStatus('notfound');
        return;
      }
      setProduct(p);
      setStatus('ready');

      // Relacionados: por la categoría más específica del producto (best-effort).
      if (p.categories && p.categories.length > 0) {
        let cat = p.categories[p.categories.length - 1];
        if (p.categories.length > 1 && (cat === 'bordados' || cat === 'estampados')) {
          cat = p.categories[p.categories.length - 2];
        }
        const res = await apiFetchProducts({ category: cat, limit: 12 });
        if (!active) return;
        setRelated(res.products.filter((rp) => rp.id !== p.id).slice(0, 4));
      }
    })();

    return () => {
      active = false;
    };
  }, [slug]);

  if (status === 'loading') {
    return (
      <div
        style={{
          minHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
        }}
      >
        <div className="nk-spinner" style={{ margin: '0 auto' }}></div>
        <p style={{ fontFamily: 'Teko, sans-serif', fontSize: '1.6rem', color: 'var(--nk-text-sec)' }}>
          Cargando producto...
        </p>
      </div>
    );
  }

  if (status === 'notfound' || !product) {
    return (
      <div
        style={{
          minHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
          textAlign: 'center',
          padding: '40px 20px',
        }}
      >
        <h1 style={{ fontFamily: 'Teko, sans-serif', fontSize: '3rem', margin: 0 }}>Producto no encontrado</h1>
        <p style={{ color: 'var(--nk-text-sec)', maxWidth: '480px' }}>
          Este producto no existe o ya no está disponible.
        </p>
        <Link href="/store" className="nk-btn" style={{ padding: '12px 28px' }}>
          Volver a la tienda
        </Link>
      </div>
    );
  }

  return <ProductClient initialProduct={product} relatedProducts={related} />;
}
