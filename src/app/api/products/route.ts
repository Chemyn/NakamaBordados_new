import { NextResponse } from 'next/server';
import { 
  getProductsPageFromWP, 
  getCategoriesBySearch, 
  getTagsBySearch, 
  WPCategory, 
  WPTag 
} from '@/lib/queries';
import { searchProductIdsBySQL, searchTaxonomyBySQL } from '@/lib/db';
import { Product } from '@/types/product';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const after = searchParams.get('after') || null;
  const category = searchParams.get('category') || undefined;
  const search = searchParams.get('search') || undefined;
  const tag = searchParams.get('tag') || undefined;

  try {
    let productsData: { products: Product[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } };
    let categories: WPCategory[] = [];
    let tags: WPTag[] = [];

    // Si es una búsqueda
    if (search && !category && !tag) {
      console.log(`[SEARCH] Hybrid Mode for: "${search}" (Page: ${after ? 'Next' : '1'})`);
      
      // 1. Obtener IDs y Taxonomías vía SQL (Taxonomías solo en la primera página)
      const [sqlProductIds, sqlTaxonomies] = await Promise.all([
        searchProductIdsBySQL(search),
        !after ? searchTaxonomyBySQL(search) : Promise.resolve({ categories: [], tags: [] })
      ]);

      console.log(`[SEARCH] SQL found ${sqlProductIds?.length || 0} matching IDs`);

      // 2. Obtener los detalles paginados vía GraphQL/LocalHandler
      // Usamos getProductsPageFromWP para aprovechar el handler local y la paginación estable
      productsData = await getProductsPageFromWP(limit, after, undefined, search, undefined);
      
      categories = (sqlTaxonomies?.categories || []) as WPCategory[];
      tags = (sqlTaxonomies?.tags || []) as WPTag[];
    } else {
      // Búsqueda estándar (o paginación) vía GraphQL
      productsData = await getProductsPageFromWP(limit, after, category, search, tag);
      
      if (search && !after) {
        const [catResults, tagResults] = await Promise.all([
          getCategoriesBySearch(search),
          getTagsBySearch(search)
        ]);
        categories = catResults;
        tags = tagResults as WPTag[];
      }
    }

    console.log(`Search Engine Response: Found ${productsData.products.length} products`);
    
    return NextResponse.json({
      ...productsData,
      categories,
      tags
    });
  } catch (error) {
    console.error('Error in Hybrid Search Route:', error);
    return NextResponse.json({ error: 'Search service failed' }, { status: 500 });
  }
}
