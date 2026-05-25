export interface Variation {
  id: string;
  sku: string;
  price: number;
  attributes: {
    Color?: string;
    Estilo?: string;
    Talla?: string;
    [key: string]: string | undefined;
  };
  stock: number;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  description: string;
  categories: string[];
  tags: string[];
  images: string[];
  type: 'simple' | 'variable';
  variations: Variation[];
  rating: number;
  salesCount: number;
}

export const CATEGORIES = [
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
      { id: '5', sku: 'OP-LUFFY-G5-BLK-H-2XL', price: 589, attributes: { Color: 'Negro', Estilo: 'Hoodie', Talla: '2XL' }, stock: 3 },
      { id: '6', sku: 'OP-LUFFY-G5-KAK-H-S', price: 539, attributes: { Color: 'Kaki', Estilo: 'Hoodie', Talla: 'S' }, stock: 7 },
      { id: '7', sku: 'OP-LUFFY-G5-KAK-H-M', price: 539, attributes: { Color: 'Kaki', Estilo: 'Hoodie', Talla: 'M' }, stock: 9 },
      { id: '8', sku: 'OP-LUFFY-G5-KAK-H-L', price: 539, attributes: { Color: 'Kaki', Estilo: 'Hoodie', Talla: 'L' }, stock: 6 },
      { id: '9', sku: 'OP-LUFFY-G5-KAK-H-XL', price: 539, attributes: { Color: 'Kaki', Estilo: 'Hoodie', Talla: 'XL' }, stock: 4 },
      { id: '10', sku: 'OP-LUFFY-G5-KAK-H-2XL', price: 589, attributes: { Color: 'Kaki', Estilo: 'Hoodie', Talla: '2XL' }, stock: 2 }
    ],
    rating: 4.9,
    salesCount: 142
  },
  {
    id: 'zoro-onigashima-tshirt',
    name: 'T-Shirt Roronoa Zoro Onigashima (Doble)',
    sku: 'OP-ZORO-ONI',
    price: 399,
    description: '✨ Fabricado con pasión en Nakama Bordados ✨\n\nPlayera de corte clásico o oversize con estampado doble que muestra a Roronoa Zoro desatando sus tres espadas con auras espirituales en el asalto a Onigashima. Colores vívidos y gran durabilidad.',
    categories: ['estampados', 'bordado-con-estampado', 'lo-mas-vendido'],
    tags: ['One Piece', 'Zoro', 'Wano', 'Estampado'],
    images: [
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=600&auto=format&fit=crop'
    ],
    type: 'variable',
    variations: [
      { id: '11', sku: 'OP-ZORO-ONI-BLK-TS-S', price: 399, attributes: { Color: 'Negro', Estilo: 'T-shirt', Talla: 'S' }, stock: 15 },
      { id: '12', sku: 'OP-ZORO-ONI-BLK-TS-M', price: 399, attributes: { Color: 'Negro', Estilo: 'T-shirt', Talla: 'M' }, stock: 18 },
      { id: '13', sku: 'OP-ZORO-ONI-BLK-TS-L', price: 399, attributes: { Color: 'Negro', Estilo: 'T-shirt', Talla: 'L' }, stock: 14 },
      { id: '14', sku: 'OP-ZORO-ONI-BLK-TS-XL', price: 399, attributes: { Color: 'Negro', Estilo: 'T-shirt', Talla: 'XL' }, stock: 10 },
      { id: '15', sku: 'OP-ZORO-ONI-BLK-TS-2XL', price: 430, attributes: { Color: 'Negro', Estilo: 'T-shirt', Talla: '2XL' }, stock: 6 },
      { id: '16', sku: 'OP-ZORO-ONI-WHT-TS-S', price: 399, attributes: { Color: 'Blanco', Estilo: 'T-shirt', Talla: 'S' }, stock: 8 },
      { id: '17', sku: 'OP-ZORO-ONI-WHT-TS-M', price: 399, attributes: { Color: 'Blanco', Estilo: 'T-shirt', Talla: 'M' }, stock: 10 },
      { id: '18', sku: 'OP-ZORO-ONI-WHT-TS-L', price: 399, attributes: { Color: 'Blanco', Estilo: 'T-shirt', Talla: 'L' }, stock: 9 }
    ],
    rating: 4.8,
    salesCount: 98
  },
  {
    id: 'sukuna-domain-oversize',
    name: 'Oversize Ryomen Sukuna Malevolent Shrine',
    sku: 'JJK-SUKUNA-MS',
    price: 399,
    description: '✨ Fabricado con pasión en Nakama Bordados ✨\n\nPlayera estilo Oversize hecha de algodón de alto gramaje que presenta el Relicario Maldito de Ryomen Sukuna. Diseño minimalista en la parte delantera y arte extendido en la espalda.',
    categories: ['estampados', 'variedad'],
    tags: ['Jujutsu Kaisen', 'Sukuna', 'Oversize', 'Anime'],
    images: [
      'https://images.unsplash.com/photo-1562157873-818bc0726f68?q=80&w=600&auto=format&fit=crop'
    ],
    type: 'variable',
    variations: [
      { id: '19', sku: 'JJK-SUKUNA-MS-BLK-OV-S', price: 399, attributes: { Color: 'Negro', Estilo: 'Oversize', Talla: 'S' }, stock: 11 },
      { id: '20', sku: 'JJK-SUKUNA-MS-BLK-OV-M', price: 399, attributes: { Color: 'Negro', Estilo: 'Oversize', Talla: 'M' }, stock: 15 },
      { id: '21', sku: 'JJK-SUKUNA-MS-BLK-OV-L', price: 399, attributes: { Color: 'Negro', Estilo: 'Oversize', Talla: 'L' }, stock: 12 },
      { id: '22', sku: 'JJK-SUKUNA-MS-BLK-OV-XL', price: 399, attributes: { Color: 'Negro', Estilo: 'Oversize', Talla: 'XL' }, stock: 8 },
      { id: '23', sku: 'JJK-SUKUNA-MS-BLK-OV-2XL', price: 439, attributes: { Color: 'Negro', Estilo: 'Oversize', Talla: '2XL' }, stock: 4 }
    ],
    rating: 4.7,
    salesCount: 65
  },
  {
    id: 'naruto-sage-mode-sudadera',
    name: 'Sudadera Naruto Sage Mode (Completos)',
    sku: 'NS-NARUTO-SM',
    price: 549,
    description: '✨ Fabricado con pasión en Nakama Bordados ✨\n\nSudadera de cuello redondo clásica con bordado de tamaño completo en el pecho. Representa a Naruto Uzumaki en su Modo Sabio con la capa de Hokage. Bordado impecable con hilos metálicos sutiles.',
    categories: ['bordados', 'lo-mas-vendido'],
    tags: ['Naruto', 'Sage Mode', 'Bordado', 'Sudadera'],
    images: [
      'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?q=80&w=600&auto=format&fit=crop'
    ],
    type: 'variable',
    variations: [
      { id: '24', sku: 'NS-NARUTO-SM-BLK-S-S', price: 549, attributes: { Color: 'Negro', Estilo: 'Sudadera', Talla: 'S' }, stock: 6 },
      { id: '25', sku: 'NS-NARUTO-SM-BLK-S-M', price: 549, attributes: { Color: 'Negro', Estilo: 'Sudadera', Talla: 'M' }, stock: 9 },
      { id: '26', sku: 'NS-NARUTO-SM-BLK-S-L', price: 549, attributes: { Color: 'Negro', Estilo: 'Sudadera', Talla: 'L' }, stock: 7 },
      { id: '27', sku: 'NS-NARUTO-SM-BLK-S-XL', price: 549, attributes: { Color: 'Negro', Estilo: 'Sudadera', Talla: 'XL' }, stock: 5 },
      { id: '28', sku: 'NS-NARUTO-SM-BLK-S-2XL', price: 589, attributes: { Color: 'Negro', Estilo: 'Sudadera', Talla: '2XL' }, stock: 2 }
    ],
    rating: 4.9,
    salesCount: 110
  },
  {
    id: 'gorra-akatsuki-red',
    name: 'Gorra Akatsuki Red Cloud (Bordado)',
    sku: 'NS-AKATSUKI-CAP',
    price: 299,
    description: '✨ Fabricado con pasión en Nakama Bordados ✨\n\nGorra snapback ajustable con la clásica nube roja de Akatsuki bordada en alta densidad y relieve 3D en la parte frontal. Visera plana y broche ajustable clásico en la nuca.',
    categories: ['gorras', 'lo-mas-vendido'],
    tags: ['Naruto', 'Akatsuki', 'Gorra', 'Accesorios'],
    images: [
      'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?q=80&w=600&auto=format&fit=crop'
    ],
    type: 'simple',
    variations: [],
    rating: 4.8,
    salesCount: 230
  },
  {
    id: 'tshirt-lisa-negra',
    name: 'Playera Lisa Premium Heavy Cotton',
    sku: 'NK-LISA-BLK',
    price: 199,
    description: '✨ Fabricado con pasión en Nakama Bordados ✨\n\nPlayera lisa básica confeccionada con algodón de 220 gramos de la más alta calidad, ideal para uso diario o para tus propios diseños de bordado/serigrafía. No encoge ni deforma.',
    categories: ['lisas'],
    tags: ['Básica', 'Lisa', 'Algodón'],
    images: [
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=600&auto=format&fit=crop'
    ],
    type: 'simple',
    variations: [],
    rating: 4.5,
    salesCount: 45
  }
];

export function getProductById(id: string): Product | undefined {
  return PRODUCTS.find(p => p.id === id);
}

export function getProductsByCategory(categorySlug: string): Product[] {
  if (categorySlug === 'todas') {
    return PRODUCTS;
  }
  return PRODUCTS.filter(p => p.categories.includes(categorySlug));
}

// WPGraphQL Integration
import { getProductsFromWP, getProductsByCategoryFromWP, getCategoriesFromWP, WPCategory, getProductByIdFromWP } from '@/lib/queries';

export async function fetchCategories() {
  const cats = await getCategoriesFromWP();
  if (cats && cats.length > 0) {
    return cats;
  }
  // Return static mock structure if fails
  return CATEGORIES.map((c, i) => ({ id: i, name: c.name, slug: c.slug, parentSlug: null as string | null }));
}

// ... other code ...

export async function fetchProducts(): Promise<Product[]> {
  const wpProducts = await getProductsFromWP(500);
  if (wpProducts && wpProducts.length > 0) {
    return wpProducts;
  }
  return PRODUCTS;
}

export async function fetchProductsByCategory(categorySlug: string, limit: number = 12): Promise<Product[]> {
  return getProductsByCategoryFromWP(categorySlug, limit);
}

export async function fetchProductById(id: string): Promise<Product | undefined> {
  const wpProduct = await getProductByIdFromWP(id);
  if (wpProduct) return wpProduct;
  // Fallback to mock product
  return PRODUCTS.find(p => p.id === id);
}
