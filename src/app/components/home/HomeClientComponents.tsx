'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Product } from '@/types/product';
import { useCurrency } from '../../context/CurrencyContext';
import { useLanguage } from '../../context/LanguageContext';

// ---------------------------------------------------------
// Helper Components
// ---------------------------------------------------------

export const SkeletonProductCard = () => (
  <div className="nk-carousel-card">
    <div className="nk-carousel-img-wrapper nk-skeleton" style={{ aspectRatio: '3/4' }}></div>
    <div className="nk-carousel-info" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <div className="nk-skeleton" style={{ width: '80%', height: '20px' }}></div>
      <div className="nk-skeleton" style={{ width: '40%', height: '16px' }}></div>
    </div>
  </div>
);

export const SkeletonScrollContainer = () => (
  <div className="nk-product-carousel" style={{ overflow: 'hidden' }}>
    {[1, 2, 3, 4, 5].map(i => <SkeletonProductCard key={i} />)}
  </div>
);

export const LazyCategorySection = ({ title, categorySlug, href, isSpecial }: { title: string, categorySlug: string, href: string, isSpecial?: boolean }) => {
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [hasFetched, setHasFetched] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasFetched) {
          setHasFetched(true);
          fetch(`/api/products?category=${categorySlug}&limit=12`)
            .then(res => res.json())
            .then(data => {
              if (data && data.products) {
                setProducts(data.products);
              }
            })
            .catch(err => console.error(err));
        }
      },
      { rootMargin: '200px' }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [categorySlug, hasFetched]);

  if (hasFetched && products.length === 0) return null;

  return (
    <section ref={sectionRef} className="nk-home-section" style={{ borderTop: '1px solid var(--nk-border)', minHeight: '300px' }}>
      <div className="nk-container">
        <div className="nk-home-section-header">
          <h2 className="nk-section-title" style={isSpecial ? { color: 'var(--nk-primary)' } : undefined}>{title}</h2>
          <Link className="nk-home-view-all" href={href}>
            {t('nav.all')} <span className="material-icons-outlined" style={{ fontSize: '14px' }}>arrow_forward</span>
          </Link>
        </div>
        {!hasFetched ? (
          <SkeletonScrollContainer />
        ) : (
          <ScrollContainer products={products} />
        )}
      </div>
    </section>
  );
};

export const ScrollContainer = ({ products }: { products: Product[] }) => {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const { formatPrice } = useCurrency();

  const scroll = (direction: 'left' | 'right') => {
    if (containerRef.current) {
      const scrollAmount = 300;
      containerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (products.length === 0) {
    return <SkeletonScrollContainer />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '12px' }}>
        <button className="nk-arrow-btn" onClick={() => scroll('left')} aria-label="Scroll left">
          <span className="material-icons-outlined">arrow_back</span>
        </button>
        <button className="nk-arrow-btn" onClick={() => scroll('right')} aria-label="Scroll right">
          <span className="material-icons-outlined">arrow_forward</span>
        </button>
      </div>
      <div className="nk-product-carousel" ref={containerRef}>
        {products.map(p => {
          const minPrice = p.type === 'variable' && p.variations.length > 0
            ? Math.min(...p.variations.map(v => v.price)) 
            : p.price;
          const maxPrice = p.type === 'variable' && p.variations.length > 0
            ? Math.max(...p.variations.map(v => v.price)) 
            : p.price;
          const displayPrice = minPrice === maxPrice 
            ? formatPrice(minPrice)
            : `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`;

          return (
            <div className="nk-carousel-card" key={p.id}>
              <Link href={`/product/${p.id}`} className="nk-carousel-link">
                <div className="nk-carousel-img-wrapper" style={{ boxShadow: 'var(--nk-manga-shadow)', border: 'var(--nk-manga-border)' }}>
                  <Image 
                    src={p.images[0]} 
                    alt={p.name} 
                    width={300} 
                    height={400} 
                    className="nk-carousel-img" 
                    style={{ objectFit: 'cover' }}
                    sizes="(max-width: 768px) 240px, 300px"
                  />
                  <div className="nk-carousel-overlay">
                    <span className="nk-overlay-btn">{t('product.view')}</span>
                  </div>
                </div>
                <div className="nk-carousel-info">
                  <h3 className="nk-carousel-name">{p.name}</h3>
                  <p className="nk-carousel-price">{displayPrice}</p>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const CategoriesExplore = () => {
  const { t } = useLanguage();
  const categories = [
    { name: t('nav.all'), img: 'https://nakamabordados.com/wp-content/uploads/2026/01/todas.avif', href: '/store' },
    { name: t('nav.embroidery'), img: 'https://nakamabordados.com/wp-content/uploads/2026/01/bordadocat.avif', href: '/store?category=bordados' },
    { name: t('nav.combo'), img: 'https://nakamabordados.com/wp-content/uploads/2026/01/bordado%20con%20estampado.avif', href: '/store?category=bordado-con-estampado' },
    { name: t('nav.prints'), img: 'https://nakamabordados.com/wp-content/uploads/2026/01/estampado.avif', href: '/store?category=estampados' },
    { name: t('nav.caps'), img: 'https://nakamabordados.com/wp-content/uploads/2026/01/gorras.avif', href: '/store?category=gorras' },
    { name: t('nav.plain'), img: 'https://nakamabordados.com/wp-content/uploads/2026/01/lisas.avif', href: '/store?category=lisas' },
    { name: t('nav.special'), img: 'https://nakamabordados.com/wp-content/uploads/2026/01/edicionespecial.avif', href: '/store?category=edicion-especial' },
    { name: t('nav.variety'), img: 'https://nakamabordados.com/wp-content/uploads/2026/01/varias.avif', href: '/store?category=variedad' }
  ];

  const doubleCategories = [...categories, ...categories];

  return (
    <section className="nk-home-section" style={{ borderTop: '1px solid var(--nk-border)', overflow: 'hidden' }}>
      <div className="nk-container" style={{ maxWidth: '100%', padding: 0 }}>
        <h2 className="nk-section-title" style={{ textAlign: 'center', marginBottom: '40px' }}>{t('home.explore_cats.title')}</h2>
        
        <div className="nk-categories-marquee-wrapper">
          <div className="nk-categories-marquee-content">
            {doubleCategories.map((cat, idx) => (
              <Link href={cat.href} key={idx} className="nk-explore-card nk-manga-border" style={{ boxShadow: 'var(--nk-manga-shadow)' }}>
                <Image 
                  src={cat.img} 
                  alt={cat.name} 
                  width={300} 
                  height={300} 
                  className="nk-explore-card-img" 
                  loading="lazy"
                  style={{ objectFit: 'cover' }}
                />
                <div className="nk-explore-card-overlay" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)', opacity: 1 }}></div>
                <div className="nk-explore-card-info" style={{ bottom: '20px', left: '20px' }}>
                  <h3 style={{ fontSize: '1.8rem', textShadow: '2px 2px 0px #000' }}>{cat.name}</h3>
                  <span style={{ color: '#fff', borderBottomColor: 'var(--nk-primary)', fontSize: '0.8rem' }}>{t('home.explore_cats.view')}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
