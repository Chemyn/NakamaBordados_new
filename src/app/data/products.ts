import { Product, Category } from '@/types/product';
import {
  getProductsFromWP,
  getProductsByCategoryFromWP,
  getCategoriesFromWP,
  getProductByIdFromWP,
  getProductsPageFromWP,
  getCategoriesBySearch,
  getTagsBySearch,
  WPCategory,
  WPTag
} from '@/lib/queries';

export interface ProductsSearchResult {
  products: Product[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
  categories: WPCategory[];
  tags: WPTag[];
}

/**
 * Búsqueda/paginación de productos 100% vía WPGraphQL (reemplaza la ruta
 * /api/products del server, que hacía un híbrido SQL+GraphQL). Apto para
 * export estático: corre en el cliente llamando a WordPress directo.
 * Devuelve el mismo shape que devolvía /api/products.
 */
export async function fetchProductsSearch(opts: {
  limit?: number;
  after?: string | null;
  category?: string;
  search?: string;
  tag?: string;
} = {}): Promise<ProductsSearchResult> {
  const { limit = 20, after = null, category, search, tag } = opts;
  let productsData: { products: Product[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } } = {
    products: [],
    pageInfo: { hasNextPage: false, endCursor: null },
  };
  let categories: WPCategory[] = [];
  let tags: WPTag[] = [];

  try {
    productsData = await getProductsPageFromWP(limit, after, category, search, tag);
    // En una búsqueda (primera página) también traemos categorías/tags coincidentes.
    if (search && !after) {
      const [catResults, tagResults] = await Promise.all([
        getCategoriesBySearch(search),
        getTagsBySearch(search),
      ]);
      categories = catResults;
      tags = tagResults as WPTag[];
    }
  } catch (err) {
    console.error('fetchProductsSearch error:', err);
  }

  return { ...productsData, categories, tags };
}

export const CATEGORIES: Category[] = [
  { slug: 'todas', name: 'Todas' },
  { slug: 'bordados', name: 'Bordados' },
  { slug: 'estampados', name: 'Estampados' },
  { slug: 'bordado-con-estampado', name: 'C/Estampado' },
  { slug: 'edicion-especial', name: 'Edición Especial' },
  { slug: 'gorras', name: 'Gorras' },
  { slug: 'lisas', name: 'Lisas' },
  { slug: 'variedad', name: 'Variedad' },
  { slug: 'lo-mas-vendido', name: 'Lo más vendido' }
];

export const PRODUCTS: Product[] = [
  {
    id: 'luffy-gear5-hoodie',
    name: 'Hoodie Luffy Gear 5 (Highlight)',
    sku: 'OP-LUFFY-G5',
    price: 589,
    description: '✨ Fabricado con pasión en Nakama Bordados ✨\n\nSudadera premium con gorro con el diseño exclusivo de Luffy Gear 5 en su estado de despertar (Sun God Nika). Bordado de alta densidad combinado con detalles finos. Prenda muy duradera y abrigadora.',
    categories: ['bordados', 'lo-mas-vendido', 'edicion-especial'],
    tags: ['One Piece', 'Luffy', 'Gear 5', 'Anime'],
    images: [
      'https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=600&auto=format&fit=crop'
    ],
    type: 'variable',
    variations: [
      { id: '1', sku: 'OP-LUFFY-G5-BLK-H-S', price: 539, attributes: { Color: 'Negro', Estilo: 'Hoodie', Talla: 'S' }, stock: 10 },
      { id: '2', sku: 'OP-LUFFY-G5-BLK-H-M', price: 539, attributes: { Color: 'Negro', Estilo: 'Hoodie', Talla: 'M' }, stock: 12 },
      { id: '3', sku: 'OP-LUFFY-G5-BLK-H-L', price: 539, attributes: { Color: 'Negro', Estilo: 'Hoodie', Talla: 'L' }, stock: 8 },
      { id: '4', sku: 'OP-LUFFY-G5-BLK-H-XL', price: 539, attributes: { Color: 'Negro', Estilo: 'Hoodie', Talla: 'XL' }, stock: 5 },
      { id: '5', sku: 'OP-LUFFY-G5-BLK-H-2XL', price: 589, attributes: { Color: 'Negro', Estilo: 'Hoodie', Talla: '2XL' }, stock: 3 }
    ],
    rating: 4.9,
    salesCount: 142
  },
  {
    id: 'zoro-onigashima-tshirt',
    name: 'T-Shirt Roronoa Zoro Onigashima (Doble)',
    sku: 'OP-ZORO-ONI',
    price: 399,
    description: '✨ Fabricado con pasión en Nakama Bordados ✨\n\nPlayera de corte clásico o oversize con estampado doble que muestra a Roronoa Zoro desatando sus tres espadas con auras espirituales en el asalto a Onigashima.',
    categories: ['estampados', 'bordado-con-estampado', 'lo-mas-vendido'],
    tags: ['One Piece', 'Zoro', 'Wano', 'Estampado'],
    images: [
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=600&auto=format&fit=crop'
    ],
    type: 'variable',
    variations: [
      { id: '11', sku: 'OP-ZORO-ONI-BLK-TS-S', price: 399, attributes: { Color: 'Negro', Estilo: 'T-shirt', Talla: 'S' }, stock: 15 }
    ],
    rating: 4.8,
    salesCount: 98
  }
];

export function getProductsByCategory(categorySlug: string): Product[] {
  if (categorySlug === 'todas') {
    return PRODUCTS;
  }
  return PRODUCTS.filter(p => p.categories.includes(categorySlug));
}

export async function fetchCategories(): Promise<WPCategory[]> {
  try {
    const cats = await getCategoriesFromWP();
    if (cats && cats.length > 0) {
      // console.log(`Successfully fetched ${cats.length} categories from WP`);
      return cats;
    }
    console.warn('No categories returned from WP, using mock fallback');
  } catch (err) {
    console.error('Error fetching categories from WP:', err);
  }
  
  // Return static mock structure if fails
  return CATEGORIES.map((c, i) => ({ 
    id: 1000 + i, 
    name: c.name, 
    slug: c.slug, 
    parentSlug: null 
  }));
}

export async function fetchProducts(): Promise<Product[]> {
  try {
    const wpProducts = await getProductsFromWP(500);
    if (wpProducts && wpProducts.length > 0) {
      return wpProducts;
    }
  } catch (err) {
    console.error('Error fetching products from WP:', err);
  }
  return PRODUCTS;
}

export async function fetchProductsByCategory(categorySlug: string, limit: number = 12): Promise<Product[]> {
  try {
    const wpProducts = await getProductsByCategoryFromWP(categorySlug, limit);
    if (wpProducts && wpProducts.length > 0) {
      return wpProducts;
    }
  } catch (err) {
    console.error(`Error fetching products for category ${categorySlug}:`, err);
  }
  
  // Fallback to local products
  console.log(`Using fallback local products for category: ${categorySlug}`);
  return getProductsByCategory(categorySlug).slice(0, limit);
}

export async function fetchProductById(id: string): Promise<Product | undefined> {
  try {
    const wpProduct = await getProductByIdFromWP(id);
    if (wpProduct) return wpProduct;
  } catch (err) {
    console.error(`Error fetching product by ID ${id}:`, err);
  }
  
  // Fallback to mock product
  return PRODUCTS.find(p => p.id === id);
}
