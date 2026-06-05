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

export default function HomeClientPage({ bestSellers }: { bestSellers: Product[] }) {
  const { t } = useLanguage();

  return (
    <div className="nk-home-page">
      {/* 1. Scrollytelling Hero (Client Component) */}
      <ScrollytellingHero />

      {/* 2. Promotional Marquee Bar */}
      <div className="nk-marquee-bar nk-manga-border" style={{ borderLeft: 'none', borderRight: 'none' }}>
        <div className="nk-marquee-wrapper">
          <div className="nk-marquee-content animate-marquee">
            <span>• {t('marquee.join')} •</span>
            <span>• {t('marquee.msi')} •</span>
            <span>• {t('marquee.quality')} •</span>
            <span>• {t('marquee.limited')} •</span>
            <span>• {t('marquee.high_density')} •</span>
            <span>• {t('marquee.join')} •</span>
            <span>• {t('marquee.msi')} •</span>
            <span>• {t('marquee.quality')} •</span>
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
            <h1 className="nk-section-title" style={{ fontSize: '4rem', marginBottom: '20px' }}>{t('home.intro.title')}</h1>
            <p style={{ fontSize: '1.2rem', color: 'var(--nk-text-sec)', lineHeight: '1.6', marginBottom: '30px' }}>
              {t('home.intro.text')}
            </p>
            <Link href="/store" className="nk-btn nk-btn-hero nk-manga-border" style={{ boxShadow: 'var(--nk-manga-shadow-lg)' }}>
              {t('home.intro.btn')}
            </Link>
          </div>
        </div>
      </section>

      {/* 4. Best Sellers */}
      <section className="nk-home-section">
        <div className="nk-container">
          <div className="nk-home-section-header">
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
