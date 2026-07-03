import React from 'react';
import { Metadata } from 'next';
import { fetchProductsByCategory } from './data/products';
import { getHeroConfig } from '@/lib/hero-config';
import HomeClientPage from './HomeClientPage';

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

  // Fetch the configurable hero video sources (falls back to hardcoded defaults on error).
  const heroConfig = await getHeroConfig();
  const heroSources = { webm: heroConfig.home.webm, mp4: heroConfig.home.mp4 };

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
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeClientPage bestSellers={bestSellers} heroSources={heroSources} />
    </>
  );
}
