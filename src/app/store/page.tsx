'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Product } from '@/types/product';
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';
import HeroBackground from '../components/HeroBackground';
import { fetchProductsSearch } from '../data/products';

const SkeletonProductCard = () => (
  <div className="nk-store-card" style={{ opacity: 0.7 }}>
    <div className="nk-store-card-img-wrapper nk-skeleton" style={{ aspectRatio: '3/4', borderRadius: '8px' }}></div>
    <div className="nk-card-info" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginTop: '14px' }}>
      <div className="nk-skeleton" style={{ width: '80%', height: '20px' }}></div>
      <div className="nk-skeleton" style={{ width: '40%', height: '16px' }}></div>
    </div>
  </div>
);

function StoreContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category') || 'todas';
  const tagParam = searchParams.get('tag') || '';
  const searchParam = searchParams.get('search') || '';
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [after, setAfter] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  const { formatPrice } = useCurrency();

  const fetchProducts = useCallback(async (isInitial = false) => {
    if (loadingMore || (!hasNextPage && !isInitial)) return;
    
    if (isInitial) {
      setLoading(true);
      setProducts([]);
      setAfter(null);
      setHasNextPage(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const currentAfter = isInitial ? null : after;
      const data = await fetchProductsSearch({
        limit: 16,
        after: currentAfter,
        category: categoryParam && categoryParam !== 'todas' ? categoryParam : undefined,
        tag: tagParam || undefined,
        search: searchParam || undefined,
      });

      if (data && data.products) {
        setProducts(prev => isInitial ? data.products : [...prev, ...data.products]);
        setAfter(data.pageInfo?.endCursor || null);
        setHasNextPage(data.pageInfo?.hasNextPage || false);
      } else if (isInitial) {
        setProducts([]);
        setHasNextPage(false);
      }
    } catch (err) {
      console.error("Store fetch error:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [categoryParam, tagParam, searchParam, after, hasNextPage, loadingMore]);

  useEffect(() => {
    queueMicrotask(() => {
      fetchProducts(true);
    });
  }, [categoryParam, tagParam, searchParam]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPageTitle = () => {
    if (searchParam) return t('store.search.results').replace('{query}', searchParam);
    if (tagParam) return t('store.tag.results').replace('{tag}', tagParam);
    
    // Map internal slugs to translations if available
    const slugMap: Record<string, string> = {
      'bordados': t('nav.embroidery'),
      'estampados': t('nav.prints'),
      'bordado-con-estampado': t('nav.combo'),
      'edicion-especial': t('nav.special'),
      'lisas': t('nav.plain'),
      'variedad': t('nav.variety'),
      'gorras': t('nav.caps'),
      'todas': t('nav.all')
    };
    
    return slugMap[categoryParam] || categoryParam.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <div className="nk-store-page" style={{ background: 'var(--nk-bg-body)', minHeight: '100vh', transition: 'background-color 0.3s ease' }}>
      <div className="nk-store-hero" style={{ background: 'var(--nk-navy)', color: '#fff', padding: '120px 24px 80px', borderBottom: '4px solid var(--nk-primary)', position: 'relative', overflow: 'hidden' }}>
        <HeroBackground pageKey="store" />
        <div style={{ position: 'absolute', inset: 0, opacity: 0.1, backgroundImage: 'radial-gradient(var(--nk-primary) 1px, transparent 0)', backgroundSize: '30px 30px', pointerEvents: 'none', zIndex: 1 }}></div>
        
        <div className="nk-container" style={{ position: 'relative', zIndex: 1 }}>
          <span className="nk-store-hero-badge" style={{ borderColor: 'var(--nk-primary)', color: 'var(--nk-primary)', background: 'var(--nk-bg-card)', padding: '4px 12px', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', border: '2px solid' }}>{t('store.hero.badge')}</span>
          <h1 className="nk-store-hero-title" style={{ color: '#fff', fontFamily: 'Teko', fontSize: 'clamp(3rem, 10vw, 6rem)', lineHeight: 0.9, marginTop: '15px' }}>{getPageTitle()}</h1>
          <p className="nk-store-hero-subtitle" style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600, fontSize: '1.2rem', maxWidth: '600px', marginTop: '10px' }}>
            {tagParam ? `${t('store.tag.results').split(':')[0]}: ${tagParam}` : t('store.hero.subtitle')}
          </p>
        </div>
        </div>

        <div className="nk-container" style={{ marginTop: '60px', paddingBottom: '120px' }}>
        {loading && products.length === 0 ? (
          <div className="nk-store-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '40px' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <SkeletonProductCard key={i} />)}
          </div>
        ) : products.length > 0 ? (
          <>
            <div className="nk-store-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '40px' }}>
              {products.map((p, idx) => {
                const minPrice = p.type === 'variable' && p.variations && p.variations.length > 0
                  ? Math.min(...p.variations.map(v => v.price)) 
                  : p.price;
                const maxPrice = p.type === 'variable' && p.variations && p.variations.length > 0
                  ? Math.max(...p.variations.map(v => v.price)) 
                  : p.price;
                const displayPrice = minPrice === maxPrice 
                  ? formatPrice(minPrice) 
                  : `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`;

                return (
                  <div 
                    className="nk-store-card" 
                    key={`${p.id}-${idx}`} 
                    style={{ background: 'var(--nk-bg-card)', border: '2px solid var(--nk-border)', borderRadius: '0', padding: '0', transition: 'transform 0.3s ease, box-shadow 0.3s ease', boxShadow: 'var(--nk-manga-shadow)' }}
                  >
                    <div className="nk-store-card-img-wrapper" style={{ borderRadius: '0', overflow: 'hidden', position: 'relative', aspectRatio: '1/1', borderBottom: '2px solid var(--nk-border)' }}>
                      <Link href={`/product/${p.id}`} className="nk-card-img-link">
                        <Image 
                          src={p.images[0]} 
                          alt={p.name} 
                          width={300} 
                          height={300} 
                          className="nk-card-img" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          loading="lazy" 
                        />
                      </Link>
                    </div>
                    <div className="nk-card-info" style={{ textAlign: 'left', padding: '20px' }}>
                      <h3 className="nk-card-title" style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0', lineHeight: 1.1 }}>
                        <Link href={`/product/${p.id}`} style={{ color: 'var(--nk-text-main)', textDecoration: 'none' }}>{p.name}</Link>
                      </h3>
                      <p className="nk-card-price" style={{ color: 'var(--nk-primary)', fontWeight: '800', marginTop: '10px', fontSize: '1.2rem', fontFamily: 'Teko' }}>{displayPrice}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {loadingMore && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '40px', marginTop: '40px' }}>
                {[1, 2, 3, 4].map(i => <SkeletonProductCard key={`more-${i}`} />)}
              </div>
            )}

            {hasNextPage && (
              <div style={{ textAlign: 'center', marginTop: '60px' }}>
                <button 
                  className="nk-btn" 
                  onClick={() => fetchProducts(false)}
                  disabled={loadingMore}
                  style={{ 
                    padding: '15px 50px', 
                    fontSize: '1.8rem', 
                    background: 'var(--nk-primary)', 
                    color: '#fff',
                    border: '3px solid var(--nk-border)',
                    boxShadow: 'var(--nk-manga-shadow-lg)',
                    cursor: loadingMore ? 'not-allowed' : 'pointer',
                    opacity: loadingMore ? 0.7 : 1,
                    transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                  }}
                >
                  {loadingMore ? t('store.loading_more') : t('store.load_more')}
                </button>
              </div>
            )}

            {!hasNextPage && products.length > 0 && (
              <div style={{ textAlign: 'center', marginTop: '60px', color: 'var(--nk-text-sec)', fontSize: '1.2rem', fontFamily: 'Teko', textTransform: 'uppercase', letterSpacing: '2px', borderTop: '2px solid var(--nk-border)', paddingTop: '30px' }}>
                {t('store.end')}
              </div>
            )}
          </>
        ) : (
          <div className="nk-no-results" style={{ padding: '100px 24px', textAlign: 'center', background: 'var(--nk-bg-card)', border: '2px dashed var(--nk-border)' }}>
            <span className="material-icons-outlined" style={{ fontSize: '4rem', color: 'var(--nk-text-sec)', opacity: 0.5 }}>search_off</span>
            <h3 style={{ marginTop: '20px', fontWeight: 800 }}>{t('store.no_results')}</h3>
            <p style={{ color: 'var(--nk-text-sec)' }}>{t('store.no_results_text')}</p>
            <Link href="/store" className="nk-btn" style={{ marginTop: '24px', display: 'inline-block', padding: '12px 30px', background: 'var(--nk-border)', color: 'var(--nk-bg-body)', textDecoration: 'none', border: 'none', boxShadow: 'var(--nk-manga-shadow)' }}>{t('nav.all')}</Link>
          </div>
        )}
        </div>

        <button 
        onClick={scrollToTop}
        className={`nk-back-to-top ${showScrollTop ? 'visible' : ''}`}
        aria-label="Volver arriba"
        style={{
          position: 'fixed',
          bottom: '30px',
          left: '30px',
          background: 'var(--nk-primary)',
          color: '#fff',
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px solid var(--nk-border)',
          boxShadow: 'var(--nk-manga-shadow)',
          cursor: 'pointer',
          zIndex: 99,
          opacity: showScrollTop ? 1 : 0,
          transform: showScrollTop ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}
        >
        <span className="material-icons-outlined">expand_less</span>
      </button>
    </div>
  );
}

export default function StorePage() {
  const { t } = useLanguage();
  return (
    <Suspense fallback={<div style={{ padding: '100px', textAlign: 'center', fontFamily: 'Teko', fontSize: '2rem' }}>{t('store.loading')}</div>}>
      <StoreContent />
    </Suspense>
  );
}
