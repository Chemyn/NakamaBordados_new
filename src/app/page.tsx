import React from 'react';
import { Metadata } from 'next';
import HomeClientPage from './HomeClientPage';

export const metadata: Metadata = {
  title: 'Nakama Bordados | Streetwear Anime Premium & Bordados de Colección',
  description: 'La tienda #1 de streetwear anime premium. Bordados de alta densidad, piezas limitadas y diseños exclusivos de tus series favoritas como One Piece, Naruto y Jujutsu Kaisen. ¡Envíos globales!',
  openGraph: {
    title: 'Nakama Bordados - Streetwear Anime Premium',
    description: 'Bordados de alta densidad y diseños exclusivos de anime. ¡Únete a la tripulación!',
    url: 'https://nakamabordados.com',
    siteName: 'Nakama Bordados',
    // PNG en lugar del .avif anterior: WhatsApp/Facebook/Twitter no muestran
    // preview con AVIF. Banner servido desde public/ (og-banner.png).
    images: [
      {
        url: 'https://nakamabordados.com/og-banner.png',
        width: 1280,
        height: 720,
        alt: 'Nakama Bordados - Streetwear Anime',
      },
    ],
    locale: 'es_MX',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nakama Bordados - Streetwear Anime Premium',
    description: 'Bordados de alta densidad y diseños exclusivos de anime. ¡Únete a la tripulación!',
    images: ['https://nakamabordados.com/og-banner.png'],
  },
  alternates: {
    canonical: 'https://nakamabordados.com',
  },
};

export default async function HomePage() {
  // Los datos y configuraciones se cargan de forma dinámica en el cliente
  const bestSellers: any[] = [];
  const heroSources = undefined;

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
