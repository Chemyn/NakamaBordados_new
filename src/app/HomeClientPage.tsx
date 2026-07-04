'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from './context/LanguageContext';
import ScrollytellingHero from './components/home/ScrollytellingHero';
import { 
  LazyCategorySection, 
  CategoriesExplore, 
  ScrollContainer 
} from './components/home/HomeClientComponents';
import { Product } from '@/types/product';
import { fetchProductsSearch } from './data/products';

interface HeroSources {
  webm?: string;
  mp4?: string;
  /** Override global (all_pages) del Nakama Hero Manager */
  video?: string;
  image?: string;
}

export default function HomeClientPage({ bestSellers: initialBestSellers, heroSources: initialHeroSources }: { bestSellers: Product[]; heroSources?: HeroSources }) {
  const { t } = useLanguage();
  const [bestSellers, setBestSellers] = React.useState<Product[]>(initialBestSellers || []);
  const [heroSources, setHeroSources] = React.useState<HeroSources | undefined>(initialHeroSources);

  React.useEffect(() => {
    // Cargar Best Sellers si vinieron vacíos (en dev o primera carga estática):
    // los 20 productos con más ventas reales (contador total_sales), no una categoría.
    if (!bestSellers || bestSellers.length === 0) {
      fetchProductsSearch({ orderby: 'sales', limit: 20 })
        .then(data => {
          if (data && data.products) {
            // Refuerzo client-side por si el plugin desplegado aún no soporta orderby.
            const sorted = [...data.products].sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));
            setBestSellers(sorted.slice(0, 20));
          }
        })
        .catch(err => console.error("Error fetching best sellers:", err));
    }

    // Cargar config del hero si no está inicializada (nkcb evita respuestas
    // cacheadas por LiteSpeed: el video debe reflejar el cambio al instante).
    if (!heroSources) {
      fetch((process.env.NEXT_PUBLIC_WP_REST_URL || 'https://nakamabordados.com') + `/?rest_route=/nakama/v1/hero-config&nkcb=${Date.now()}`)
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('API failed');
        })
        .then(data => {
          if (!data) return;
          const home = data.home || {};
          const all = data.all_pages || {};
          const next: HeroSources = {
            webm: home.webm || '',
            mp4: home.mp4 || home.url || '',
            // Override global: aplica cuando el home no tiene video propio
            // (misma precedencia que HeroBackground: específico > all_pages).
            video: all.video || '',
            image: all.image || '',
          };
          if (next.webm || next.mp4 || next.video || next.image) {
            setHeroSources(next);
          }
        })
        .catch(err => console.log("Using default hero config:", err));
    }
  }, []);

  return (
    <div className="nk-home-page">
      {/* 1. Scrollytelling Hero (Client Component) */}
      <ScrollytellingHero heroSources={heroSources} />

      {/* 2. Promotional Marquee Bar */}
      <div className="nk-marquee-bar nk-manga-border" style={{ borderLeft: 'none', borderRight: 'none' }}>
        <div className="nk-marquee-wrapper">
          <div className="nk-marquee-content animate-marquee">
            <span>• {t('marquee.welcome')} •</span>
            <span>• {t('marquee.shipping')} •</span>
            <span>• {t('marquee.msi')} •</span>
            <span>• {t('marquee.transfer')} •</span>
            <span>• {t('marquee.welcome')} •</span>
            <span>• {t('marquee.shipping')} •</span>
            <span>• {t('marquee.msi')} •</span>
            <span>• {t('marquee.transfer')} •</span>
          </div>
        </div>
      </div>

      {/* 3. Welcome / Intro Section */}
      <section className="nk-home-section" style={{ background: 'var(--nk-bg-wrapper)', position: 'relative', overflow: 'hidden' }}>
        <div className="op-floating-text" style={{ top: '10%', left: '-5%', fontSize: '15rem', transform: 'rotate(-15deg)', pointerEvents: 'none' }}>海賊</div>
        <div className="op-floating-text" style={{ bottom: '5%', right: '-5%', fontSize: '12rem', transform: 'rotate(10deg)', pointerEvents: 'none' }}>仲間</div>
        
        <div className="nk-container" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
            <span className="nk-store-hero-badge">{t('home.intro.badge')}</span>
            <h1 className="nk-section-title" style={{ fontSize: 'clamp(2.4rem, 8vw, 4rem)', marginBottom: '20px' }}>{t('home.intro.title')}</h1>
            <p style={{ fontSize: '1.2rem', color: 'var(--nk-text-sec)', lineHeight: '1.6', marginBottom: '30px' }}>
              {t('home.intro.text')}
            </p>
          </div>
        </div>
      </section>

      {/* 4. Best Sellers */}
      <section className="nk-home-section">
        <div className="nk-container" style={{ maxWidth: '100%', padding: 0 }}>
          <div className="nk-home-section-header" style={{ padding: '0 20px', marginBottom: '30px' }}>
            <div>
              <h2 className="nk-section-title">{t('home.bestsellers.title')}</h2>
              <p className="pulse-red-text" style={{ letterSpacing: '2px', fontWeight: '800' }}>{t('home.bestsellers.reward')}</p>
            </div>
          </div>
          <ScrollContainer products={bestSellers} />
        </div>
      </section>

      {/* 5. Dynamic Product Sections (Lazy Loaded Client Components) */}
      <LazyCategorySection title={t('nav.embroidery')} categorySlug="bordados" href="/store?category=bordados" />
      <LazyCategorySection title={t('nav.combo')} categorySlug="bordado-con-estampado" href="/store?category=bordado-con-estampado" />
      <LazyCategorySection title={t('nav.prints')} categorySlug="estampados" href="/store?category=estampados" />
      <LazyCategorySection title={t('nav.caps')} categorySlug="gorras" href="/store?category=gorras" />
      <LazyCategorySection title={t('nav.plain')} categorySlug="lisas" href="/store?category=lisas" />
      <LazyCategorySection title={t('nav.variety')} categorySlug="variedad" href="/store?category=variedad" />

      {/* 6. Explore By Category Slider */}
      <CategoriesExplore />
    </div>
  );
}
