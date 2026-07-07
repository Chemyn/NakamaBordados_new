/**
 * Cliente del API de productos servido por WordPress vía SQL directo
 * (plugin nakama-products-api.php) — SIN WPGraphQL.
 *
 * Se usa en el navegador (carga en runtime): cambiar un producto en WordPress
 * se refleja al instante, sin rebuild del sitio estático.
 */
import { Product, Variation } from '@/types/product';
import type { WPCategory, WPTag } from '@/lib/queries';

const API_BASE =
  process.env.NEXT_PUBLIC_WP_REST_URL || 'https://nakamabordados.com';

/**
 * Reglas para ocultar variaciones al cliente en todo el catálogo (tienda,
 * buscador, relacionados y página de producto) sin tocar WordPress. Una
 * variación se oculta si CUALQUIER regla aplica; una regla aplica si TODAS
 * sus condiciones se cumplen. Los valores van normalizados (minúsculas, sin
 * acentos). El cotizador no consume este API, así que no le afecta.
 */
type HiddenRule = Partial<Record<'color' | 'estilo' | 'talla', string[]>> & {
  /** Slugs de producto; si se omite, la regla aplica a todo el catálogo. */
  producto?: string[];
};

const HIDDEN_RULES: HiddenRule[] = [
  { color: ['rosa'] },
  { estilo: ['t-shirt'], color: ['kaki', 'khaki'] },
  { estilo: ['tank top'], talla: ['3xl'] },
  { estilo: ['oversize'], talla: ['2xl', '3xl'], producto: ['roronoa-zoro-king-of-hell-edition'] },
];

const normalizeValue = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

/** WooCommerce nombra los atributos Color / Estilo / Size (o Talla). */
const canonicalAttr = (name: string): 'color' | 'estilo' | 'talla' | null => {
  const n = normalizeValue(name);
  if (n.includes('color')) return 'color';
  if (n.includes('estilo') || n.includes('style')) return 'estilo';
  if (n.includes('talla') || n.includes('size')) return 'talla';
  return null;
};

const isHiddenVariation = (variation: Variation, product: Product): boolean => {
  const attrs: Partial<Record<'color' | 'estilo' | 'talla', string>> = {};
  for (const [name, value] of Object.entries(variation.attributes || {})) {
    const key = canonicalAttr(name);
    if (key && typeof value === 'string') attrs[key] = normalizeValue(value);
  }
  const nameNorm = normalizeValue(product.name || '');
  const slug = normalizeValue(String(product.id || ''));
  return HIDDEN_RULES.some(rule => {
    if (rule.producto && !rule.producto.includes(slug)) return false;
    return (['color', 'estilo', 'talla'] as const).every(key => {
      const values = rule[key];
      if (!values) return true;
      const attr = attrs[key];
      if (attr !== undefined) return values.includes(attr);
      // Productos de un solo estilo no lo llevan como atributo de variación
      // (p.ej. "T-shirt de Algodón", el producto "Tank Top"): se infiere del nombre.
      if (key === 'estilo') return values.some(v => nameNorm.includes(v));
      return false;
    });
  });
};

function sanitizeProduct(product: Product): Product {
  if (!product || !Array.isArray(product.variations) || product.variations.length === 0) {
    return product;
  }
  const visible = product.variations.filter(v => !isHiddenVariation(v, product));
  if (visible.length === product.variations.length) return product;
  return { ...product, variations: visible };
}

/** Un producto variable cuyas variaciones quedaron todas ocultas no se lista. */
const isSellable = (product: Product): boolean =>
  product.type !== 'variable' || product.variations.length > 0;

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
  /** 'sales' = más vendidos primero (total_sales de WooCommerce) */
  orderby?: 'sales';
} = {}): Promise<ProductsSearchResult> {
  const { limit = 20, after = null, category, search, tag, orderby } = opts;
  const offset = after ? parseInt(after, 10) || 0 : 0;

  const params = new URLSearchParams();
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  if (category) params.set('category', category);
  if (tag) params.set('tag', tag);
  if (search) params.set('search', search);
  if (orderby) params.set('orderby', orderby);

  try {
    const res = await fetch(`${API_BASE}/?rest_route=/nakama/v1/products&${params.toString()}`);
    if (!res.ok) return EMPTY_RESULT;
    const data = await res.json();
    return {
      products: ((data.products || []) as Product[]).map(sanitizeProduct).filter(isSellable),
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
    const res = await fetch(`${API_BASE}/?rest_route=/nakama/v1/product&slug=${encodeURIComponent(slug)}`);
    if (!res.ok) return null;
    const data = await res.json();
    // El endpoint puede devolver el producto directo o { product: {...} }.
    const product = (data && data.id ? data : data?.product) || null;
    return product ? sanitizeProduct(product) : null;
  } catch (err) {
    console.error('apiFetchProductBySlug error:', err);
    return null;
  }
}

/** Todos los slugs de producto (para generateStaticParams en build). */
export async function apiFetchProductSlugs(): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE}/?rest_route=/nakama/v1/product-slugs`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : data?.slugs || [];
  } catch (err) {
    console.error('apiFetchProductSlugs error:', err);
    return [];
  }
}
