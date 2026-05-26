'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CATEGORIES, Product, fetchProducts, PRODUCTS } from '../data/products';
import { useCurrency } from '../context/CurrencyContext';

function StoreContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category') || 'todas';
  const tagParam = searchParams.get('tag') || '';
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [endCursor, setEndCursor] = useState<string | null>(null);
  const { formatPrice } = useCurrency();
  const observerRef = React.useRef<HTMLDivElement>(null);

  // Debounce search query
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Initial fetch when filters change
  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    setAllProducts([]);
    
    let url = `/api/products?limit=20`;
    if (categoryParam && categoryParam !== 'todas') url += `&category=${categoryParam}`;
    if (tagParam) url += `&tag=${tagParam}`;
    if (debouncedSearch) url += `&search=${encodeURIComponent(debouncedSearch)}`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (mounted && data) {
          setAllProducts(data.products || []);
          setHasNextPage(data.pageInfo?.hasNextPage || false);
          setEndCursor(data.pageInfo?.endCursor || null);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error(err);
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, [categoryParam, tagParam, debouncedSearch]);

  // Infinite Scroll logic
  React.useEffect(() => {
    if (loading || !hasNextPage || loadingMore) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setLoadingMore(true);
        let url = `/api/products?limit=20&after=${endCursor}`;
        if (categoryParam && categoryParam !== 'todas') url += `&category=${categoryParam}`;
        if (tagParam) url += `&tag=${tagParam}`;
        if (debouncedSearch) url += `&search=${encodeURIComponent(debouncedSearch)}`;

        fetch(url)
          .then(res => res.json())
          .then(data => {
            if (data && data.products) {
              setAllProducts(prev => [...prev, ...data.products]);
              setHasNextPage(data.pageInfo?.hasNextPage || false);
              setEndCursor(data.pageInfo?.endCursor || null);
            }
            setLoadingMore(false);
          })
          .catch(err => {
            console.error(err);
            setLoadingMore(false);
          });
      }
    }, { rootMargin: '200px' });

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [loading, hasNextPage, loadingMore, endCursor, categoryParam, tagParam, debouncedSearch]);

  const filteredProducts = allProducts;

  const activeCategory = CATEGORIES.find(c => c.slug === categoryParam) || CATEGORIES[0];

  return (
    <div className="nk-store-page">
      {/* Hero Banner Header */}
      <div className="nk-store-hero">
        <span className="nk-store-hero-badge">Colección Nakama</span>
        <h1 className="nk-store-hero-title">{activeCategory.name}</h1>
        <p className="nk-store-hero-subtitle">
          {tagParam ? `Mostrando productos con etiqueta "${tagParam}"` : 'Explora nuestra selección exclusiva de bordados de alta densidad y streetwear anime.'}
        </p>
      </div>

      {/* Catalog Main Container */}
      <div className="nk-container">
        {/* Filter controls & Search */}
        <div className="nk-catalog-controls">
          {/* Category Tabs */}
          <div className="nk-store-tabs">
            {CATEGORIES.filter(c => c.slug !== 'lo-mas-vendido').map(cat => (
              <Link 
                href={`/store?category=${cat.slug}`}
                key={cat.slug} 
                className={`nk-store-tab-btn ${categoryParam === cat.slug ? 'active' : ''}`}
              >
                {cat.name}
              </Link>
            ))}
          </div>

          {/* Search bar input */}
          <div className="nk-store-search">
            <span className="material-icons-outlined nk-search-icon">search</span>
            <input 
              type="text" 
              placeholder="Buscar productos..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="nk-search-input"
            />
            {searchQuery && (
              <button className="nk-search-clear" onClick={() => setSearchQuery('')}>
                <span className="material-icons-outlined">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Product Grid */}
        {loading && allProducts.length === 0 ? (
          <div className="nk-store-grid">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <SkeletonProductCard key={i} />)}
          </div>
        ) : allProducts.length > 0 ? (
          <>
            <div className="nk-store-grid">
              {allProducts.map(p => {
                // WPGraphQL mock price logic
                const minPrice = p.type === 'variable' && p.variations && p.variations.length > 0
                  ? Math.min(...p.variations.map(v => v.price)) 
                  : p.price;
                const maxPrice = p.type === 'variable' && p.variations && p.variations.length > 0
                  ? Math.max(...p.variations.map(v => v.price)) 
                  : p.price;
                const displayPrice = minPrice === maxPrice 
                  ? formatPrice(minPrice) 
                  : `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`;

                const isSpecial = p.categories.includes('edicion-especial');

                return (
                  <div className="nk-store-card group" key={p.id}>
                    <div className="nk-store-card-img-wrapper">
                      {isSpecial && <span className="nk-sale-badge">Especial</span>}
                      <Link href={`/product/${p.id}`} className="nk-card-img-link">
                        <img src={p.images && p.images[0] ? p.images[0] : 'https://via.placeholder.com/300x300'} alt={p.name} className="nk-card-img" />
                      </Link>
                      <div className="nk-card-overlay">
                        <Link href={`/product/${p.id}`} className="nk-overlay-btn">Ver Producto</Link>
                      </div>
                    </div>
                    
                    <div className="nk-card-info">
                      <h3 className="nk-card-title">
                        <Link href={`/product/${p.id}`}>{p.name}</Link>
                      </h3>
                      <p className="nk-card-price">{displayPrice}</p>
                    </div>
                  </div>
                );
              })}
              {loadingMore && [1, 2, 3, 4].map(i => <SkeletonProductCard key={`more-${i}`} />)}
            </div>
            
            {/* Infinite Scroll Sentinel */}
            {hasNextPage && !loadingMore && (
              <div ref={observerRef} style={{ textAlign: 'center', padding: '30px 0', color: 'var(--nk-text-sec)' }}>
                Haz scroll para ver más
              </div>
            )}
            
            {!hasNextPage && allProducts.length > 0 && (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--nk-text-sec)' }}>
                Has llegado al final de los resultados.
              </div>
            )}
          </>
        ) : (
          <div className="nk-no-results">
            <span className="material-icons-outlined nk-no-results-icon">sentiment_dissatisfied</span>
            <h3>No se encontraron productos</h3>
            <p>Intenta ajustar tus filtros de búsqueda.</p>
            <button className="nk-btn nk-btn-clear" onClick={() => { setSearchQuery(''); }}>
              Limpiar Búsqueda
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// Helper Components
// ---------------------------------------------------------

const SkeletonProductCard = () => (
  <div className="nk-store-card">
    <div className="nk-store-card-img-wrapper nk-skeleton" style={{ aspectRatio: '3/4' }}></div>
    <div className="nk-card-info" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginTop: '14px' }}>
      <div className="nk-skeleton" style={{ width: '80%', height: '20px' }}></div>
      <div className="nk-skeleton" style={{ width: '40%', height: '16px' }}></div>
    </div>
  </div>
);

export default function StorePage() {
  return (
    <Suspense fallback={
      <div className="nk-store-loading nk-container" style={{ padding: '100px 24px', textAlign: 'center' }}>
        <h2 className="animate-pulse" style={{ fontFamily: 'Teko', fontSize: '3rem' }}>Cargando Catálogo Nakama...</h2>
        <div className="nk-store-grid" style={{ marginTop: '40px', opacity: 0.5 }}>
           {[1, 2, 3, 4].map(i => <SkeletonProductCard key={i} />)}
        </div>
      </div>
    }>
      <StoreContent />
    </Suspense>
  );
}
