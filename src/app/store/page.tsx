'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PRODUCTS, CATEGORIES } from '../data/products';

function StoreContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category') || 'todas';
  const tagParam = searchParams.get('tag') || '';
  const [searchQuery, setSearchQuery] = useState('');

  // Filter products directly during render (no useEffect/useState needed)
  let filteredProducts = PRODUCTS;

  // Filter by category
  if (categoryParam !== 'todas') {
    filteredProducts = filteredProducts.filter(p => p.categories.includes(categoryParam));
  }

  // Filter by tag
  if (tagParam) {
    filteredProducts = filteredProducts.filter(p => p.tags.map(t => t.toLowerCase()).includes(tagParam.toLowerCase()));
  }

  // Filter by search query
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filteredProducts = filteredProducts.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.description.toLowerCase().includes(q) ||
      p.tags.some(t => t.toLowerCase().includes(q))
    );
  }

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
        {filteredProducts.length > 0 ? (
          <div className="nk-store-grid">
            {filteredProducts.map(p => {
              const minPrice = p.type === 'variable' 
                ? Math.min(...p.variations.map(v => v.price)) 
                : p.price;
              const maxPrice = p.type === 'variable' 
                ? Math.max(...p.variations.map(v => v.price)) 
                : p.price;
              const displayPrice = minPrice === maxPrice 
                ? `$${minPrice} MXN` 
                : `$${minPrice} - $${maxPrice} MXN`;

              const isSpecial = p.categories.includes('edicion-especial');

              return (
                <div className="nk-store-card group" key={p.id}>
                  <div className="nk-store-card-img-wrapper">
                    {isSpecial && <span className="nk-sale-badge">Especial</span>}
                    <Link href={`/product/${p.id}`} className="nk-card-img-link">
                      <img src={p.images[0]} alt={p.name} className="nk-card-img" />
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
          </div>
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

export default function StorePage() {
  return (
    <Suspense fallback={
      <div className="nk-store-loading nk-container" style={{ padding: '100px 24px', textAlign: 'center' }}>
        <h2 className="animate-pulse">Cargando Catálogo Nakama...</h2>
      </div>
    }>
      <StoreContent />
    </Suspense>
  );
}
