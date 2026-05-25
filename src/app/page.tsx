'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Product, fetchProducts, fetchProductsByCategory, PRODUCTS } from './data/products';
import { useCurrency } from './context/CurrencyContext';

export default function HomePage() {
  const [loaded, setLoaded] = useState(false);
  const [preloaderVisible, setPreloaderVisible] = useState(true);
  const [currentHeroSlide, setCurrentHeroSlide] = useState(0);

  // Category-specific product states
  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [bordados, setBordados] = useState<Product[]>([]);
  const [bordadoConEstampado, setBordadoConEstampado] = useState<Product[]>([]);
  const [estampados, setEstampados] = useState<Product[]>([]);
  const [gorras, setGorras] = useState<Product[]>([]);
  const [lisas, setLisas] = useState<Product[]>([]);
  const [edicionEspecial, setEdicionEspecial] = useState<Product[]>([]);
  const [variedad, setVariedad] = useState<Product[]>([]);
  
  const heroSlides = [
    "https://nakamabordados.com/wp-content/uploads/2026/05/hsale1.avif",
    "https://nakamabordados.com/wp-content/uploads/2026/05/hsale2.avif",
    "https://nakamabordados.com/wp-content/uploads/2026/05/hsale3.avif"
  ];

  // Fetch products by category directly from WPGraphQL
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const [bs, bo, bce, es, go, li, ee, va] = await Promise.all([
        fetchProductsByCategory('lo-mas-vendido', 12),
        fetchProductsByCategory('bordados', 12),
        fetchProductsByCategory('bordado-con-estampado', 12),
        fetchProductsByCategory('estampados', 12),
        fetchProductsByCategory('gorras', 12),
        fetchProductsByCategory('lisas', 12),
        fetchProductsByCategory('edicion-especial', 12),
        fetchProductsByCategory('variedad', 12),
      ]);
      if (mounted) {
        setBestSellers(bs);
        setBordados(bo);
        setBordadoConEstampado(bce);
        setEstampados(es);
        setGorras(go);
        setLisas(li);
        setEdicionEspecial(ee);
        setVariedad(va);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  // Initialize preloader state
  useEffect(() => {
    const isVisited = sessionStorage.getItem('nakama_visited');
    const delay = isVisited ? 1200 : 2200;
    sessionStorage.setItem('nakama_visited', 'true');

    const timer = setTimeout(() => {
      setLoaded(true);
      const hideTimer = setTimeout(() => setPreloaderVisible(false), 400);
      return () => clearTimeout(hideTimer);
    }, delay);

    return () => clearTimeout(timer);
  }, []);

  // Hero Slider logic
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHeroSlide((prev) => (prev + 1) % heroSlides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [heroSlides.length]);

  return (
    <div className="nk-home-page">
      {/* 1. Preloader Screen */}
      {preloaderVisible && (
        <div className="nk-preloader" style={{ opacity: loaded ? 0 : 1, visibility: loaded ? 'hidden' : 'visible' }}>
          <div className="nk-preloader-content">
            <div className="nk-loader-ring"></div>
            <img src="https://nakamabordados.com/wp-content/uploads/2026/01/logon.avif" className="nk-preloader-logo" alt="NAKAMA" />
          </div>
        </div>
      )}

      {/* 2. Hero Slider */}
      <section className="nk-hero-slider" id="hero-slider">
        {heroSlides.map((slide, index) => (
          <div key={index} className={`nk-hero-slide ${index === currentHeroSlide ? 'nk-hero-slide--active' : ''}`}>
            <img src={slide} alt={`Promoción ${index + 1}`} />
          </div>
        ))}
        <div className="nk-hero-scroll-hint force-white-always">
          <span className="material-icons-outlined">keyboard_arrow_down</span>
        </div>
      </section>

      {/* 3. Promotional Marquee Bar */}
      <div className="nk-marquee-bar">
        <div className="nk-marquee-wrapper">
          <div className="nk-marquee-content animate-marquee">
            <span>• 3 MSI A PARTIR DE $500 MXN</span>
            <span>• ENVIO GRATIS EN 4PZ AL PAGAR POR TRANSFERENCIA</span>
            <span>• PIEZAS LIMITADAS</span>
            <span>• ENVÍOS A TODO MÉXICO</span>
            <span>• BORDADO PREMIUM</span>
            <span>• PERSONALIZADOS</span>
            <span>• 3 MSI A PARTIR DE $500 MXN</span>
            <span>• ENVIO GRATIS EN 4PZ AL PAGAR POR TRANSFERENCIA</span>
            <span>• PIEZAS LIMITADAS</span>
            <span>• ENVÍOS A TODO MÉXICO</span>
            <span>• BORDADO PREMIUM</span>
            <span>• PERSONALIZADOS</span>
          </div>
        </div>
      </div>

      {/* 4. Best Sellers */}
      <section className="nk-home-section">
        <div className="nk-container">
          <div className="nk-home-section-header">
            <div>
              <h2 className="nk-section-title">LO MÁS VENDIDO</h2>
              <p className="pulse-red-text">Lo que todos están amando</p>
            </div>
          </div>
          <ScrollContainer products={bestSellers} />
        </div>
      </section>

      {/* 5. Dynamic Product Sections */}
      <ProductSection title="BORDADOS" href="/store?category=bordados" products={bordados} />
      <ProductSection title="BORDADO CON ESTAMPADO" href="/store?category=bordado-con-estampado" products={bordadoConEstampado} />
      <ProductSection title="ESTAMPADOS" href="/store?category=estampados" products={estampados} />
      <ProductSection title="GORRAS" href="/store?category=gorras" products={gorras} />
      <ProductSection title="LISAS" href="/store?category=lisas" products={lisas} />
      <ProductSection title="EDICIÓN ESPECIAL" href="/store?category=edicion-especial" products={edicionEspecial} isSpecial />
      <ProductSection title="VARIEDAD" href="/store?category=variedad" products={variedad} />

      {/* 6. Explore By Category Slider */}
      <CategoriesExplore />
    </div>
  );
}

// ---------------------------------------------------------
// Helper Components
// ---------------------------------------------------------

const ProductSection = ({ title, href, products, isSpecial }: { title: string, href: string, products: Product[], isSpecial?: boolean }) => {
  if (products.length === 0) return null; // Don't render empty sections while loading
  return (
    <section className="nk-home-section" style={{ borderTop: '1px solid var(--nk-border)' }}>
      <div className="nk-container">
        <div className="nk-home-section-header">
          <h2 className="nk-section-title" style={isSpecial ? { color: 'var(--nk-primary)' } : undefined}>{title}</h2>
          <Link className="nk-home-view-all" href={href}>
            VER TODO <span className="material-icons-outlined" style={{ fontSize: '14px' }}>arrow_forward</span>
          </Link>
        </div>
        <ScrollContainer products={products} />
      </div>
    </section>
  );
};

const ScrollContainer = ({ products }: { products: Product[] }) => {
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
    return <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--nk-text-sec)' }}>Cargando productos...</div>;
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

const CategoriesExplore = () => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeftRef = useRef(0);

  const categories = [
    { name: 'Todas', img: 'https://nakamabordados.com/wp-content/uploads/2026/01/todas.avif', href: '/store' },
    { name: 'Bordados', img: 'https://nakamabordados.com/wp-content/uploads/2026/01/bordadocat.avif', href: '/store?category=bordados' },
    { name: 'Con Estampado', img: 'https://nakamabordados.com/wp-content/uploads/2026/01/bordado%20con%20estampado.avif', href: '/store?category=bordado-con-estampado' },
    { name: 'Estampado', img: 'https://nakamabordados.com/wp-content/uploads/2026/01/estampado.avif', href: '/store?category=estampados' },
    { name: 'Gorras', img: 'https://nakamabordados.com/wp-content/uploads/2026/01/gorras.avif', href: '/store?category=gorras' },
    { name: 'Lisas', img: 'https://nakamabordados.com/wp-content/uploads/2026/01/lisas.avif', href: '/store?category=lisas' },
    { name: 'Edición Especial', img: 'https://nakamabordados.com/wp-content/uploads/2026/01/edicionespecial.avif', href: '/store?category=edicion-especial' },
    { name: 'Variedad', img: 'https://nakamabordados.com/wp-content/uploads/2026/01/varias.avif', href: '/store?category=variedad' }
  ];

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    if (sliderRef.current) {
      startX.current = e.pageX - sliderRef.current.offsetLeft;
      scrollLeftRef.current = sliderRef.current.scrollLeft;
    }
  };

  const handleMouseUp = () => { isDragging.current = false; };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    e.preventDefault();
    if (sliderRef.current) {
      const x = e.pageX - sliderRef.current.offsetLeft;
      const walk = (x - startX.current) * 2;
      sliderRef.current.scrollLeft = scrollLeftRef.current - walk;
    }
  };

  return (
    <section className="nk-home-section" style={{ borderTop: '1px solid var(--nk-border)' }}>
      <div className="nk-container">
        <h2 className="nk-section-title" style={{ textAlign: 'center', marginBottom: '40px' }}>EXPLORA POR CATEGORÍA</h2>
        <div
          ref={sliderRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseUp}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          className="nk-categories-slider scrollbar-hide"
        >
          {categories.map((cat, idx) => (
            <Link href={cat.href} key={idx} className="nk-explore-card">
              <img loading="lazy" decoding="async" alt={cat.name} className="nk-explore-card-img" src={cat.img} />
              <div className="nk-explore-card-overlay"></div>
              <div className="nk-explore-card-info">
                <h3>{cat.name}</h3>
                <span>Ver Colección</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
