'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { PRODUCTS, CATEGORIES, Product } from './data/products';

export default function HomePage() {
  const [loaded, setLoaded] = useState(false);
  const [preloaderVisible, setPreloaderVisible] = useState(true);

  // Initialize preloader state
  useEffect(() => {
    const isVisited = sessionStorage.getItem('nakama_visited');
    const delay = isVisited ? 1200 : 2200;
    sessionStorage.setItem('nakama_visited', 'true');

    const timer = setTimeout(() => {
      setLoaded(true);
      const hideTimer = setTimeout(() => setPreloaderVisible(false), 400); // match transition
      return () => clearTimeout(hideTimer);
    }, delay);

    return () => clearTimeout(timer);
  }, []);

  // Filter products for carousels
  const bestSellers = PRODUCTS.filter(p => p.categories.includes('lo-mas-vendido'));
  const bordados = PRODUCTS.filter(p => p.categories.includes('bordados'));

  return (
    <div className="nk-home-page">
      {/* 1. Preloader Screen */}
      {preloaderVisible && (
        <div 
          className="nk-preloader" 
          style={{ 
            opacity: loaded ? 0 : 1, 
            visibility: loaded ? 'hidden' : 'visible' 
          }}
        >
          <div className="nk-preloader-content">
            <div className="nk-loader-ring"></div>
            <img 
              src="https://nakamabordados.com/wp-content/uploads/2026/01/logon.avif" 
              className="nk-preloader-logo" 
              alt="NAKAMA" 
            />
          </div>
        </div>
      )}

      {/* 2. Hero Section */}
      <section className="nk-hero">
        <div className="nk-hero-overlay"></div>
        <div className="nk-hero-content">
          <span className="nk-hero-badge">Colección Nakama {new Date().getFullYear()}</span>
          <h1 className="nk-hero-title">EL STREETWEAR ANIME DEFINITIVO</h1>
          <p className="nk-hero-subtitle">
            Bordados de alta densidad y estampados exclusivos hechos para durar toda una vida.
          </p>
          <div className="nk-hero-actions">
            <Link href="/store" className="nk-btn nk-btn-hero">Explorar Colección</Link>
          </div>
        </div>
      </section>

      {/* 3. Promotional Marquee Bar */}
      <div className="nk-marquee-bar">
        <div className="nk-marquee-wrapper">
          <div className="nk-marquee-content animate-marquee">
            <span>• 3 MSI A PARTIR DE $500 MXN</span>
            <span>• ENVIO GRATIS EN 4PZ O DESDE $1200 MXN</span>
            <span>• PIEZAS LIMITADAS</span>
            <span>• ENVIOS A TODO MÉXICO</span>
            <span>• CALIDAD PREMIUM GARANTIZADA</span>
            
            <span>• 3 MSI A PARTIR DE $500 MXN</span>
            <span>• ENVIO GRATIS EN 4PZ O DESDE $1200 MXN</span>
            <span>• PIEZAS LIMITADAS</span>
            <span>• ENVIOS A TODO MÉXICO</span>
            <span>• CALIDAD PREMIUM GARANTIZADA</span>
          </div>
        </div>
      </div>

      {/* 4. Sliding Carousel: Best Sellers */}
      <div className="nk-container">
        <ScrollContainer products={bestSellers} title="Lo Más Vendido" />
      </div>

      {/* 5. Visual Categories Section */}
      <section className="nk-categories-section">
        <div className="nk-container">
          <h2 className="nk-section-title text-center">Nuestras Categorías</h2>
          <div className="nk-categories-grid">
            {CATEGORIES.filter(c => c.slug !== 'todas' && c.slug !== 'lo-mas-vendido').map(cat => (
              <Link href={`/store?category=${cat.slug}`} className="nk-category-card" key={cat.slug}>
                <div className="nk-category-img-overlay"></div>
                <div className="nk-category-info">
                  <h3 className="nk-category-title">{cat.name}</h3>
                  <span className="nk-category-link-text">Ver Colección</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Sliding Carousel: Embroidery */}
      <div className="nk-container pb-20">
        <ScrollContainer products={bordados} title="Bordados Exclusivos" />
      </div>
    </div>
  );
}

// Custom Horizontal Scroll component
const ScrollContainer = ({ products, title }: { products: Product[], title: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (containerRef.current) {
      const scrollAmount = 300;
      containerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="nk-section">
      <div className="nk-section-header">
        <h2 className="nk-section-title">{title}</h2>
        <div className="nk-scroll-arrows">
          <button className="nk-arrow-btn" onClick={() => scroll('left')} aria-label="Scroll left">
            <span className="material-icons-outlined">arrow_back</span>
          </button>
          <button className="nk-arrow-btn" onClick={() => scroll('right')} aria-label="Scroll right">
            <span className="material-icons-outlined">arrow_forward</span>
          </button>
        </div>
      </div>

      <div className="nk-product-carousel" ref={containerRef}>
        {products.map(p => {
          const minPrice = p.type === 'variable' 
            ? Math.min(...p.variations.map(v => v.price)) 
            : p.price;
          const maxPrice = p.type === 'variable' 
            ? Math.max(...p.variations.map(v => v.price)) 
            : p.price;
          const displayPrice = minPrice === maxPrice 
            ? `$${minPrice} MXN` 
            : `$${minPrice} - $${maxPrice} MXN`;

          return (
            <div className="nk-carousel-card" key={p.id}>
              <Link href={`/product/${p.id}`} className="nk-carousel-link">
                <div className="nk-carousel-img-wrapper">
                  <img src={p.images[0]} alt={p.name} className="nk-carousel-img" />
                  <div className="nk-carousel-overlay">
                    <span className="nk-overlay-btn">Ver Producto</span>
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
