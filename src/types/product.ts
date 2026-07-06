export interface Variation {
  id: string;
  databaseId?: number;
  sku: string;
  price: number;
  /** Precio regular (sin oferta); si > price hay descuento activo */
  regularPrice?: number;
  images?: string[];
  attributes: {
    Color?: string;
    Estilo?: string;
    Talla?: string;
    [key: string]: string | undefined;
  };
  stock: number;
}

export interface Review {
  id: string;
  name: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Product {
  id: string;
  databaseId?: number;
  name: string;
  sku: string;
  price: number;
  /** Precio regular (sin oferta); en variables, el del rango más barato */
  regularPrice?: number;
  description: string;
  categories: string[];
  tags: string[];
  images: string[];
  type: 'simple' | 'variable';
  variations: Variation[];
  rating: number;
  salesCount: number;
  reviews?: Review[];
}

export interface Category {
  slug: string;
  name: string;
}
