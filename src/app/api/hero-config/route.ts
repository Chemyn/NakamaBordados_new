import { NextResponse } from 'next/server';
import { getHeroConfig } from '@/lib/hero-config';

// Config pública de display (URLs de hero por página). No expone nada sensible.
// La consumen los componentes cliente de las bandas nk-store-hero.
export async function GET() {
  const config = await getHeroConfig();
  return NextResponse.json(config);
}

export const dynamic = 'force-dynamic';
