import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { fetchProductsByCategory } from './data/products';
import HomeHero from './components/home/HomeHero';
import { 
  LazyCategorySection, 
  CategoriesExplore, 
  ScrollContainer 
} from './components/home/HomeClientComponents';

export const metadata: Metadata = {
  title: 'Nakama Bordados | Streetwear Anime Premium & Bordados de Colección',
  description: 'La tienda #1 de streetwear anime premium. Bordados de alta densidad, piezas limitadas y diseños exclusivos de tus series favoritas como One Piece, Naruto y Jujutsu Kaisen. ¡Envíos globales!',
  openGraph: {
    title: 'Nakama Bordados - Streetwear Anime Premium',
    description: 'Bordados de alta densidad y diseños exclusivos de anime. ¡Únete a la tripulación!',
    url: 'https://nakamabordados.com',
    siteName: 'Nakama Bordados',
    images: [
      {
        url: 'https://nakamabordados.com/wp-content/uploads/2026/05/hsale1.avif',
        width: 1200,
        height: 630,
        alt: 'Nakama Bordados - Streetwear Anime',
      },
    ],
    locale: 'es_MX',
    type: 'website',
  },
  alternates: {
    canonical: 'https://nakamabordados.com',
  },
};

export default async function HomePage() {
  // Fetch best sellers on the server for better SEO indexation
  const bestSellers = await fetchProductsByCategory('lo-mas-vendido', 12);

  // Organization JSON-LD
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    name: 'Nakama Bordados',
    url: 'https://nakamabordados.com',
    logo: 'https://nakamabordados.com/wp-content/uploads/2026/01/logo.png',
    description: 'Streetwear Anime Premium con bordados de alta densidad.',
    sameAs: [
      'https://www.instagram.com/nakamabordados',
      'https://www.facebook.com/nakamabordados',
    ],
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'MX',
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://nakamabordados.com/store?search={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <div className="nk-home-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      {/* 1. Hero Slider (Client Component) */}
      <HomeHero />

      {/* 2. Promotional Marquee Bar */}
      <div className="nk-marquee-bar nk-manga-border" style={{ borderLeft: 'none', borderRight: 'none' }}>
        <div className="nk-marquee-wrapper">
          <div className="nk-marquee-content animate-marquee">
            <span>• ÚNETE A LA TRIPULACIÓN •</span>
            <span>• ENVÍO GRATIS DESDE $1,200 MXN •</span>
            <span>• 3 MSI CON TARJETAS PARTICIPANTES •</span>
            <span>• CALIDAD PREMIUM GRAND LINE •</span>
            <span>• PIEZAS LIMITADAS DE COLECCIÓN •</span>
            <span>• BORDADOS DE ALTA DENSIDAD •</span>
            <span>• ÚNETE A LA TRIPULACIÓN •</span>
            <span>• ENVÍO GRATIS DESDE $1,200 MXN •</span>
            <span>• 3 MSI CON TARJETAS PARTICIPANTES •</span>
            <span>• CALIDAD PREMIUM GRAND LINE •</span>
          </div>
        </div>
      </div>

      {/* 3. Welcome / Intro Section */}
      <section className="nk-home-section" style={{ background: 'var(--nk-bg-wrapper)', position: 'relative', overflow: 'hidden' }}>
        <div className="op-floating-text" style={{ top: '10%', left: '-5%', fontSize: '15rem', transform: 'rotate(-15deg)', pointerEvents: 'none' }}>海賊</div>
        <div className="op-floating-text" style={{ bottom: '5%', right: '-5%', fontSize: '12rem', transform: 'rotate(10deg)', pointerEvents: 'none' }}>仲間</div>
        
        <div className="nk-container" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
            <span className="nk-store-hero-badge">Estilo Streetwear Anime</span>
            <h1 className="nk-section-title" style={{ fontSize: '4rem', marginBottom: '20px' }}>Tu Próximo Tesoro</h1>
            <p style={{ fontSize: '1.2rem', color: 'var(--nk-text-sec)', lineHeight: '1.6', marginBottom: '30px' }}>
              En <strong>Nakama Bordados</strong> no solo hacemos ropa, forjamos el equipo para tu próxima aventura. 
              Bordados de alta densidad y diseños exclusivos con la calidad que un futuro Rey de los Piratas merece. 
              Moda anime hecha por fans para fans.
            </p>
            <Link href="/store" className="nk-btn nk-btn-hero nk-manga-border" style={{ boxShadow: '8px 8px 0px #000' }}>
              Explorar Catálogo
            </Link>
          </div>
        </div>
      </section>

      {/* 4. Best Sellers (Rendered initially from server) */}
      <section className="nk-home-section">
        <div className="nk-container">
          <div className="nk-home-section-header">
            <div>
              <h2 className="nk-section-title">LOS MÁS BUSCADOS</h2>
              <p className="pulse-red-text" style={{ letterSpacing: '2px', fontWeight: '800' }}>RECOMPENSA: CALIDAD MÁXIMA</p>
            </div>
          </div>
          <ScrollContainer products={bestSellers} />
        </div>
      </section>

      {/* 5. Dynamic Product Sections (Lazy Loaded Client Components) */}
      <LazyCategorySection title="BORDADOS" categorySlug="bordados" href="/store?category=bordados" />
      <LazyCategorySection title="BORDADO CON ESTAMPADO" categorySlug="bordado-con-estampado" href="/store?category=bordado-con-estampado" />
      <LazyCategorySection title="ESTAMPADOS" categorySlug="estampados" href="/store?category=estampados" />
      <LazyCategorySection title="GORRAS" categorySlug="gorras" href="/store?category=gorras" />
      <LazyCategorySection title="LISAS" categorySlug="lisas" href="/store?category=lisas" />
      <LazyCategorySection title="EDICIÓN ESPECIAL" categorySlug="edicion-especial" href="/store?category=edicion-especial" isSpecial />
      <LazyCategorySection title="VARIEDAD" categorySlug="variedad" href="/store?category=variedad" />

      {/* 6. Explore By Category Slider */}
      <CategoriesExplore />
    </div>
  );
}
