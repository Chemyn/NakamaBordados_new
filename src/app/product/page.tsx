'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ProductLoader from './ProductLoader';

function ProductPageContent() {
  const searchParams = useSearchParams();
  const slug = searchParams.get('id') || searchParams.get('slug') || '';

  if (!slug) {
    return (
      <div style={{ padding: '100px', textAlign: 'center', fontFamily: 'Teko, sans-serif', fontSize: '2rem' }}>
        No se especificó un producto válido.
      </div>
    );
  }

  return <ProductLoader slug={slug} />;
}

export default function ProductPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="nk-spinner"></div>
      </div>
    }>
      <ProductPageContent />
    </Suspense>
  );
}
