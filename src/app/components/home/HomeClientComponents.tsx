'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Product } from '@/types/product';
import { useCurrency } from '../../context/CurrencyContext';
import { useLanguage } from '../../context/LanguageContext';
import { fetchProductsSearch } from '../../data/products';

// ---------------------------------------------------------
// Helper Components
// ---------------------------------------------------------

export const SkeletonProductCard = () => (
  <div className="nk-carousel-card">
    <div className="nk-carousel-link" style={{ pointerEvents: 'none' }}>
      <div className="nk-carousel-img-wrapper nk-skeleton" style={{ boxShadow: 'var(--nk-manga-shadow)', border: 'var(--nk-manga-border)', aspectRatio: '3/4', borderRadius: '0' }}></div>
      <div className="nk-carousel-info" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '120px', marginTop: '14px', textAlign: 'left', padding: '0 5px' }}>
        <div>
          <div className="nk-skeleton" style={{ width: '90%', height: '18px', borderRadius: '0' }}></div>
        </div>
        <div>
          <div className="nk-skeleton" style={{ width: '45%', height: '16px', borderRadius: '0' }}></div>
        </div>
      </div>
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
  const [loading, setLoading] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasFetched) {
          setHasFetched(true);
          setLoading(true);
          fetchProductsSearch({ category: categorySlug, limit: 12 })
            .then(data => {
              if (data && data.products) {
                // Randomize results
                const shuffled = [...data.products].sort(() => 0.5 - Math.random());
                setProducts(shuffled);
              }
            })
            .catch(err => console.error(err))
            .finally(() => {
              setLoading(false);
            });
        }
      },
      { rootMargin: '200px' }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [categorySlug, hasFetched]);

  // Solo ocultar si la carga finalizó y la API retornó cero productos
  if (hasFetched && !loading && products.length === 0) return null;

  return (
    <section ref={sectionRef} className="nk-home-section" style={{ borderTop: '1px solid var(--nk-border)', minHeight: '300px' }}>
      <div className="nk-container" style={{ maxWidth: '100%', padding: 0 }}>
        <div className="nk-home-section-header" style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '15px', marginBottom: '30px', padding: '0 20px' }}>
          <h2 className="nk-section-title" style={isSpecial ? { color: 'var(--nk-primary)', margin: 0 } : { margin: 0 }}>{title}</h2>
          <Link className="nk-home-view-all" href={href} style={{ borderBottom: '2px solid var(--nk-primary)', paddingBottom: '2px' }}>
            {t('nav.all')} <span className="material-icons-outlined" style={{ fontSize: '14px' }}>arrow_forward</span>
          </Link>
        </div>
        {loading || !hasFetched ? (
          <SkeletonScrollContainer />
        ) : (
          <ScrollContainer products={products} />
        )}
      </div>
    </section>
  );
};

// ---------------------------------------------------------
// Hooks
// ---------------------------------------------------------

export const useDraggableScroll = (autoScroll: boolean = false) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  useEffect(() => {
    if (!autoScroll || isDragging || isHovered) return;
    
    const interval = setInterval(() => {
      if (ref.current) {
        ref.current.scrollLeft += 1;
        // Infinite loop reset
        if (ref.current.scrollLeft >= ref.current.scrollWidth * 0.66) {
          ref.current.scrollLeft = ref.current.scrollWidth * 0.33;
        }
      }
    }, 30);
    return () => clearInterval(interval);
  }, [autoScroll, isDragging, isHovered]);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!ref.current) return;
    setIsDragging(true);
    setStartX(e.pageX - ref.current.offsetLeft);
    setScrollLeft(ref.current.scrollLeft);
    ref.current.style.cursor = 'grabbing';
    ref.current.style.userSelect = 'none';
  };

  const onMouseUp = () => {
    setIsDragging(false);
    if (ref.current) {
      ref.current.style.cursor = 'grab';
      ref.current.style.removeProperty('user-select');
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !ref.current) return;
    e.preventDefault();
    ref.current.style.scrollBehavior = 'auto'; // Disable smooth scroll while dragging
    const x = e.pageX - ref.current.offsetLeft;
    const walk = (x - startX) * 2; 
    ref.current.scrollLeft = scrollLeft - walk;
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (!ref.current) return;
    setIsDragging(true);
    setStartX(e.touches[0].pageX - ref.current.offsetLeft);
    setScrollLeft(ref.current.scrollLeft);
    ref.current.style.scrollBehavior = 'auto';
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !ref.current) return;
    // We don't preventDefault here to allow vertical page scroll
    const x = e.touches[0].pageX - ref.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    ref.current.scrollLeft = scrollLeft - walk;
  };

  return { 
    ref, 
    onMouseDown, 
    onMouseUp, 
    onMouseLeave: () => { onMouseUp(); setIsHovered(false); }, 
    onMouseEnter: () => setIsHovered(true),
    onMouseMove,
    onTouchStart,
    onTouchEnd: () => { setIsDragging(false); if(ref.current) ref.current.style.scrollBehavior = 'smooth'; },
    onTouchMove
  };
};

export const ScrollContainer = ({ products }: { products: Product[] }) => {
  const { t } = useLanguage();
  const { formatPrice } = useCurrency();
  const dragProps = useDraggableScroll(true);

  useEffect(() => {
    if (dragProps.ref.current) {
      dragProps.ref.current.scrollLeft = dragProps.ref.current.scrollWidth * 0.33;
    }
  }, [products]);

  if (products.length === 0) {
    return <SkeletonScrollContainer />;
  }

  // Triple duplicated items for infinite effect
  const displayProducts = [...products, ...products, ...products];

  return (
    <div className="nk-draggable-scroll-container" {...dragProps} style={{ cursor: 'grab', overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      <div className="nk-product-carousel-inner">
        {displayProducts.map((p, idx) => {
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
            <div className="nk-carousel-card" key={`${p.id}-${idx}`}>
              <Link href={`/product?id=${p.id}`} className="nk-carousel-link">
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
                <div className="nk-carousel-info" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '120px', marginTop: '14px', textAlign: 'left', padding: '0 5px' }}>
                  <h3 className="nk-carousel-name" style={{ margin: 0 }}>{p.name}</h3>
                  <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
                    <p className="nk-carousel-price" style={{ margin: 0, fontFamily: 'Teko', fontSize: '1.2rem', fontWeight: 800 }}>{displayPrice}</p>
                    {p.salesCount !== undefined && p.salesCount > 0 && (
                      <p className="nk-carousel-sales" style={{ fontSize: '0.8rem', color: 'var(--nk-text-sec)', margin: '4px 0 0 0', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
                        {p.salesCount} {p.salesCount === 1 ? 'vendido' : 'vendidos'}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .nk-draggable-scroll-container {
          width: 100%;
          overflow-x: auto;
          padding: 20px 0;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .nk-draggable-scroll-container::-webkit-scrollbar {
          display: none;
        }

        .nk-product-carousel-inner {
          display: flex;
          gap: 25px;
          padding: 0 20px;
          width: max-content;
        }

        .nk-carousel-card {
          flex: 0 0 300px;
          transition: transform 0.3s cubic-bezier(0.19, 1, 0.22, 1);
        }

        .nk-carousel-card:hover {
          transform: translateY(-10px);
        }

        @media (max-width: 768px) {
          .nk-carousel-card {
            flex: 0 0 240px;
          }
        }
      `}</style>
    </div>
  );
};

export const CategoriesExplore = () => {
  const { t } = useLanguage();
  const dragProps = useDraggableScroll(true);
  
  const categories = [
    { name: t('nav.all'), img: 'https://nakamabordados.com/wp-content/uploads/2026/01/todas.avif', href: '/store' },
    { name: t('nav.embroidery'), img: 'https://nakamabordados.com/wp-content/uploads/2026/01/bordadocat.avif', href: '/store?category=bordados' },
    { name: t('nav.combo'), img: 'https://nakamabordados.com/wp-content/uploads/2026/01/bordado%20con%20estampado.avif', href: '/store?category=bordado-con-estampado' },
    { name: t('nav.prints'), img: 'https://nakamabordados.com/wp-content/uploads/2026/01/estampado.avif', href: '/store?category=estampados' },
    { name: t('nav.caps'), img: 'https://nakamabordados.com/wp-content/uploads/2026/01/gorras.avif', href: '/store?category=gorras' },
    { name: t('nav.plain'), img: 'https://nakamabordados.com/wp-content/uploads/2026/01/lisas.avif', href: '/store?category=lisas' },
    { name: t('nav.special'), img: '/edicion-especial.jpg', href: '/store?category=edicion-especial' },
    { name: t('nav.variety'), img: 'https://nakamabordados.com/wp-content/uploads/2026/01/varias.avif', href: '/store?category=variedad' }
  ];

  const displayCategories = [...categories, ...categories, ...categories];

  useEffect(() => {
    if (dragProps.ref.current) {
      dragProps.ref.current.scrollLeft = dragProps.ref.current.scrollWidth * 0.33;
    }
  }, []);

  return (
    <section className="nk-home-section" style={{ borderTop: '1px solid var(--nk-border)', overflow: 'hidden', padding: '80px 0' }}>
      <div className="nk-container" style={{ maxWidth: '100%', padding: 0 }}>
        <h2 className="nk-section-title" style={{ textAlign: 'center', marginBottom: '40px' }}>{t('home.explore_cats.title')}</h2>
        
        <div className="nk-categories-drag-wrapper" {...dragProps} style={{ cursor: 'grab', overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <div className="nk-categories-drag-content">
            {displayCategories.map((cat, idx) => (
              <Link 
                href={cat.href} 
                key={idx} 
                className="nk-explore-card nk-manga-border" 
                style={{ 
                  boxShadow: 'var(--nk-manga-shadow)'
                }}
              >
                <Image 
                  src={cat.img} 
                  alt={cat.name} 
                  width={300} 
                  height={350} 
                  className="nk-explore-card-img" 
                  loading="lazy"
                  style={{ objectFit: 'cover', height: '100%' }}
                />
                <div className="nk-explore-card-overlay" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)', opacity: 1 }}></div>
                <div className="nk-explore-card-info" style={{ bottom: '20px', left: '20px' }}>
                  <h3 style={{ fontSize: '1.8rem', textShadow: '2px 2px 0px #000', margin: 0 }}>{cat.name}</h3>
                  <span style={{ color: 'var(--nk-primary)', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase' }}>{t('home.explore_cats.view')}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .nk-categories-drag-wrapper {
          width: 100%;
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .nk-categories-drag-wrapper::-webkit-scrollbar {
          display: none;
        }

        .nk-categories-drag-content {
          display: flex;
          gap: 25px;
          padding: 0 20px;
          width: max-content;
        }

        .nk-explore-card {
          transition: all 0.3s cubic-bezier(0.19, 1, 0.22, 1);
        }

        .nk-explore-card:hover {
          transform: scale(1.02);
          border-color: var(--nk-primary);
        }
      `}</style>
    </section>
  );
};
