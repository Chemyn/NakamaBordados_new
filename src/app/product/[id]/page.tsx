import { Metadata } from 'next';
import { apiFetchProductSlugs } from '@/lib/products-api';
import ProductLoader from './ProductLoader';

interface Props {
  params: Promise<{ id: string }>;
}

// Export estático: pre-generamos un cascarón por producto (rutas), pero los
// DATOS se cargan en el navegador (ProductLoader) desde el API PHP/MySQL.
// => cambiar el contenido de un producto NO requiere rebuild; solo agregar o
//    quitar productos del catálogo necesita regenerar rutas.
export const dynamicParams = false;

export async function generateStaticParams() {
  const slugs = await apiFetchProductSlugs();
  if (!slugs || slugs.length === 0) {
    // Si el API no responde en build, no rompas el build: deja un placeholder.
    return [{ id: 'placeholder' }];
  }
  return slugs.map((slug) => ({ id: String(slug) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  // Título derivado del slug (sin fetch en build → build rápido y desacoplado).
  const pretty = id
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  return {
    title: `${pretty} | Streetwear Anime Premium | Nakama Bordados`,
    description: `${pretty} — bordados y estampados premium de anime, hechos con pasión en Nakama Bordados.`,
  };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  return <ProductLoader slug={id} />;
}
