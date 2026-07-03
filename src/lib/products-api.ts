/**
 * Cliente del API de productos servido por WordPress vía SQL directo
 * (plugin nakama-products-api.php) — SIN WPGraphQL.
 *
 * Se usa en el navegador (carga en runtime): cambiar un producto en WordPress
 * se refleja al instante, sin rebuild del sitio estático.
 */
import { Product } from '@/types/product';
import type { WPCategory, WPTag } from '@/lib/queries';

const API_BASE =
  (process.env.NEXT_PUBLIC_WP_REST_URL || 'https://nakamabordados.com') + '/wp-json/nakama/v1';

export interface ProductsSearchResult {
  products: Product[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
  categories: WPCategory[];
  tags: WPTag[];
}

const EMPTY_RESULT: ProductsSearchResult = {
  products: [],
  pageInfo: { hasNextPage: false, endCursor: null },
  categories: [],
  tags: [],
};

/** Lista/búsqueda/paginación de productos. `after` es el cursor (offset) devuelto en pageInfo.endCursor. */
export async function apiFetchProducts(opts: {
  limit?: number;
  after?: string | null;
  category?: string;
  search?: string;
  tag?: string;
} = {}): Promise<ProductsSearchResult> {
  const { limit = 20, after = null, category, search, tag } = opts;
  const offset = after ? parseInt(after, 10) || 0 : 0;

  const params = new URLSearchParams();
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  if (category) params.set('category', category);
  if (tag) params.set('tag', tag);
  if (search) params.set('search', search);

  try {
    const res = await fetch(`${API_BASE}/products?${params.toString()}`);
    if (!res.ok) return EMPTY_RESULT;
    const data = await res.json();
    return {
      products: data.products || [],
      pageInfo: data.pageInfo || { hasNextPage: false, endCursor: null },
      categories: data.categories || [],
      tags: data.tags || [],
    };
  } catch (err) {
    console.error('apiFetchProducts error:', err);
    return EMPTY_RESULT;
  }
}

/** Un producto por slug (con variaciones). null si no existe. */
export async function apiFetchProductBySlug(slug: string): Promise<Product | null> {
  try {
    const res = await fetch(`${API_BASE}/product?slug=${encodeURIComponent(slug)}`);
    if (!res.ok) return null;
    const data = await res.json();
    // El endpoint puede devolver el producto directo o { product: {...} }.
    return (data && data.id ? data : data?.product) || null;
  } catch (err) {
    console.error('apiFetchProductBySlug error:', err);
    return null;
  }
}

/** Todos los slugs de producto (para generateStaticParams en build). */
export async function apiFetchProductSlugs(): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE}/product-slugs`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : data?.slugs || [];
  } catch (err) {
    console.error('apiFetchProductSlugs error:', err);
    return [];
  }
}
