import React from 'react';
import { Metadata } from 'next';
import { fetchProductById, fetchProductsByCategory } from '../../data/products';
import { Product } from '@/types/product';
import ProductClient from './ProductClient';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await fetchProductById(id);

  if (!product) {
    return {
      title: 'Producto no encontrado | Nakama Bordados',
    };
  }

  return {
    title: `${product.name} | Streetwear Anime Premium | Nakama Bordados`,
    description: product.description.substring(0, 160),
    openGraph: {
      title: product.name,
      description: product.description.substring(0, 160),
      images: [{ url: product.images[0] }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: product.description.substring(0, 160),
      images: [product.images[0]],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  console.log(`Rendering Product Page for ID/Slug: "${id}"`);
  
  const product = await fetchProductById(id);

  if (!product) {
    console.error(`Product with ID/Slug "${id}" not found. Triggering 404.`);
    notFound();
  }

  let relatedProducts: Product[] = [];
  if (product.categories && product.categories.length > 0) {
    // Pick a random category from the product's categories (excluding generic 'bordados' or 'estampados' if there are others)
    let catToFetch = product.categories[product.categories.length - 1]; // usually more specific
    if (product.categories.length > 1 && (catToFetch === 'bordados' || catToFetch === 'estampados')) {
        catToFetch = product.categories[product.categories.length - 2];
    }

    const related = await fetchProductsByCategory(catToFetch, 12);
    
    // Create a shuffled copy
    // eslint-disable-next-line @next/next/no-assign-module-variable, react-hooks/purity
    const shuffled = [...related]
      .filter(p => p.id !== product.id)
      .sort(() => 0.5 - Math.random());
      
    relatedProducts = shuffled.slice(0, 4);
  }

  // Schema.org JSON-LD
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.images,
    description: product.description,
    sku: product.sku,
    brand: {
      '@type': 'Brand',
      name: 'Nakama Bordados',
    },
    offers: {
      '@type': 'Offer',
      url: `https://nakamabordados.com/product/${product.id}`,
      priceCurrency: 'MXN',
      price: product.price,
      itemCondition: 'https://schema.org/NewCondition',
      availability: 'https://schema.org/InStock',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: product.rating || 5,
      reviewCount: product.salesCount || 10,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductClient initialProduct={product} relatedProducts={relatedProducts} />
    </>
  );
}
