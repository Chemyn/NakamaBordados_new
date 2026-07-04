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
      <div className="nk-container pb-20" style={{ paddingTop: '100px', background: 'var(--nk-bg-body)', pointerEvents: 'none' }}>
        <div className="nk-detail-grid">
          {/* Columna Izquierda: Galería (Skeleton) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="nk-skeleton nk-manga-border" style={{ aspectRatio: '1/1', width: '100%', boxShadow: 'var(--nk-manga-shadow-lg)' }}></div>
            {/* Miniaturas */}
            <div style={{ display: 'flex', gap: '15px' }}>
              <div className="nk-skeleton nk-manga-border" style={{ width: '80px', height: '80px', boxShadow: 'var(--nk-manga-shadow)' }}></div>
              <div className="nk-skeleton nk-manga-border" style={{ width: '80px', height: '80px', boxShadow: 'var(--nk-manga-shadow)' }}></div>
              <div className="nk-skeleton nk-manga-border" style={{ width: '80px', height: '80px', boxShadow: 'var(--nk-manga-shadow)' }}></div>
            </div>
          </div>

          {/* Columna Derecha: Detalles (Skeleton) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            {/* Categoría / Badges */}
            <div className="nk-skeleton" style={{ width: '35%', height: '24px' }}></div>

            {/* Título del producto */}
            <div className="nk-skeleton" style={{ width: '90%', height: '48px' }}></div>

            {/* Precio */}
            <div className="nk-skeleton" style={{ width: '45%', height: '36px' }}></div>

            {/* Separador */}
            <div style={{ height: '2px', background: 'var(--nk-border)' }}></div>

            {/* Selección de Atributos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="nk-skeleton" style={{ width: '25%', height: '18px' }}></div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div className="nk-skeleton" style={{ width: '60px', height: '42px' }}></div>
                <div className="nk-skeleton" style={{ width: '60px', height: '42px' }}></div>
                <div className="nk-skeleton" style={{ width: '60px', height: '42px' }}></div>
              </div>
            </div>

            {/* Fila de Cantidad y Botón Añadir */}
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginTop: '10px' }}>
              <div className="nk-skeleton nk-manga-border" style={{ width: '130px', height: '50px' }}></div>
              <div className="nk-skeleton nk-manga-border" style={{ flex: 1, height: '50px', boxShadow: 'var(--nk-manga-shadow)' }}></div>
            </div>

            {/* Confianza / Sellos */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
              <div className="nk-skeleton" style={{ height: '20px', width: '80%' }}></div>
              <div className="nk-skeleton" style={{ height: '20px', width: '80%' }}></div>
            </div>

            {/* Pestañas (Descripción / Cuidado) */}
            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', gap: '15px' }}>
                <div className="nk-skeleton" style={{ width: '30%', height: '30px' }}></div>
                <div className="nk-skeleton" style={{ width: '30%', height: '30px' }}></div>
              </div>
              <div className="nk-skeleton nk-manga-border" style={{ width: '100%', height: '130px', boxShadow: 'var(--nk-manga-shadow)' }}></div>
            </div>
          </div>
        </div>
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
