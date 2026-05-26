'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CATEGORIES, Product, PRODUCTS } from '../data/products';
import { useCurrency } from '../context/CurrencyContext';

const SkeletonProductCard = () => (
  <div className="nk-store-card">
    <div className="nk-store-card-img-wrapper nk-skeleton" style={{ aspectRatio: '3/4', borderRadius: '8px' }}></div>
    <div className="nk-card-info" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginTop: '14px' }}>
      <div className="nk-skeleton" style={{ width: '80%', height: '20px' }}></div>
      <div className="nk-skeleton" style={{ width: '40%', height: '16px' }}></div>
    </div>
  </div>
);

function StoreContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category') || 'todas';
  const tagParam = searchParams.get('tag') || '';
  const searchParam = searchParams.get('search') || '';
  
  const [searchQuery, setSearchQuery] = useState(searchParam);
  const [debouncedSearch, setDebouncedSearch] = useState(searchParam);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { formatPrice } = useCurrency();

  useEffect(() => {
    queueMicrotask(() => {
      setSearchQuery(searchParam);
      setDebouncedSearch(searchParam);
    });
  }, [searchParam]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => {
      if (mounted) setLoading(true);
    });
    
    // Set fallback immediately if network is slow
    const fallbackTimeout = setTimeout(() => {
      if (mounted && allProducts.length === 0 && loading) {
        console.warn("Using fallback products due to slow response");
        const filteredFallback = categoryParam === 'todas' 
          ? PRODUCTS 
          : PRODUCTS.filter(p => p.categories.includes(categoryParam));
        setAllProducts(filteredFallback);
        setLoading(false);
      }
    }, 8000);

    let url = `/api/products?limit=24`; 
    if (categoryParam && categoryParam !== 'todas') url += `&category=${categoryParam}`;
    if (tagParam) url += `&tag=${tagParam}`;
    if (debouncedSearch) url += `&search=${encodeURIComponent(debouncedSearch)}`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (mounted) {
          clearTimeout(fallbackTimeout);
          if (data && data.products && data.products.length > 0) {
            setAllProducts(data.products);
          } else {
            // Fallback for empty categories or failure
            const filteredFallback = categoryParam === 'todas' 
              ? PRODUCTS 
              : PRODUCTS.filter(p => p.categories.includes(categoryParam));
            setAllProducts(filteredFallback);
          }
          setLoading(false);
        }
      })
      .catch(err => {
        console.error("Store fetch error:", err);
        if (mounted) {
          clearTimeout(fallbackTimeout);
          const filteredFallback = categoryParam === 'todas' 
            ? PRODUCTS 
            : PRODUCTS.filter(p => p.categories.includes(categoryParam));
          setAllProducts(filteredFallback);
          setLoading(false);
        }
      });

    return () => { 
      mounted = false; 
      clearTimeout(fallbackTimeout);
    };
  }, [categoryParam, tagParam, debouncedSearch]);

  const activeCategory = CATEGORIES.find(c => c.slug === categoryParam) || CATEGORIES[0];

  return (
    <div className="nk-store-page" style={{ background: '#fff', minHeight: '100vh' }}>
      <div className="nk-store-hero" style={{ background: '#000', color: '#fff', padding: '100px 24px 60px', borderBottom: '3px solid #f00' }}>
        <span className="nk-store-hero-badge" style={{ borderColor: '#f00', color: '#f00', background: '#fff' }}>Catálogo Nakama</span>
        <h1 className="nk-store-hero-title" style={{ color: '#fff', fontFamily: 'Teko', fontSize: '4rem' }}>{activeCategory.name}</h1>
        <p className="nk-store-hero-subtitle" style={{ color: '#ccc', fontWeight: 600 }}>
          {tagParam ? `Tesoro: ${tagParam}` : 'Bordados de alta densidad y streetwear premium.'}
        </p>
      </div>

      <div className="nk-container" style={{ marginTop: '40px' }}>
        <div className="nk-catalog-controls" style={{ borderBottom: '1px solid #eee', marginBottom: '40px', paddingBottom: '20px' }}>
          <div className="nk-store-tabs" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {CATEGORIES.filter(c => c.slug !== 'lo-mas-vendido').map(cat => (
              <Link 
                href={`/store?category=${cat.slug}`}
                key={cat.slug} 
                className={`nk-store-tab-btn ${categoryParam === cat.slug ? 'active' : ''}`}
                style={categoryParam === cat.slug ? { background: '#f00', color: '#fff', border: '1px solid #000', padding: '8px 16px', borderRadius: '4px', textDecoration: 'none', fontWeight: 800 } : { border: '1px solid #eee', padding: '8px 16px', borderRadius: '4px', textDecoration: 'none', color: '#333' }}
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>

        {loading && allProducts.length === 0 ? (
          <div className="nk-store-grid">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <SkeletonProductCard key={i} />)}
          </div>
        ) : allProducts.length > 0 ? (
          <div className="nk-store-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '30px' }}>
            {allProducts.map(p => {
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
                <div className="nk-store-card" key={p.id} style={{ border: '1px solid #eee', borderRadius: '12px', padding: '10px', transition: 'box-shadow 0.3s' }}>
                  <div className="nk-store-card-img-wrapper" style={{ borderRadius: '8px', overflow: 'hidden', position: 'relative', aspectRatio: '3/4' }}>
                    <Link href={`/product/${p.id}`} className="nk-card-img-link">
                      <img src={p.images[0]} alt={p.name} className="nk-card-img" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </Link>
                  </div>
                  <div className="nk-card-info" style={{ textAlign: 'center', marginTop: '15px' }}>
                    <h3 className="nk-card-title" style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0' }}>
                      <Link href={`/product/${p.id}`} style={{ color: '#000', textDecoration: 'none' }}>{p.name}</Link>
                    </h3>
                    <p className="nk-card-price" style={{ color: '#f00', fontWeight: '800', marginTop: '5px', fontSize: '1.1rem' }}>{displayPrice}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="nk-no-results" style={{ padding: '100px 24px', textAlign: 'center' }}>
            <span className="material-icons-outlined" style={{ fontSize: '4rem', color: '#ccc' }}>search_off</span>
            <h3 style={{ marginTop: '20px', fontWeight: 800 }}>No encontramos tesoros</h3>
            <p style={{ color: '#666' }}>Intenta con otros términos o navega por las categorías.</p>
            <Link href="/store" className="nk-btn" style={{ marginTop: '24px', display: 'inline-block', padding: '12px 30px', background: '#000', color: '#fff', textDecoration: 'none' }}>Ver Todo</Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StorePage() {
  return (
    <Suspense fallback={<div style={{ padding: '100px', textAlign: 'center', fontFamily: 'Teko', fontSize: '2rem' }}>Cargando Catálogo...</div>}>
      <StoreContent />
    </Suspense>
  );
}
