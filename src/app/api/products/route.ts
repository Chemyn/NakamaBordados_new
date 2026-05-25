import { NextResponse } from 'next/server';
import { getProductsPageFromWP } from '@/lib/queries';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const after = searchParams.get('after') || null;
  const category = searchParams.get('category') || undefined;
  const search = searchParams.get('search') || undefined;
  const tag = searchParams.get('tag') || undefined;

  try {
    const data = await getProductsPageFromWP(limit, after, category, search, tag);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching products from API route', error);
    return NextResponse.json({ error: 'Failed to load products' }, { status: 500 });
  }
}
