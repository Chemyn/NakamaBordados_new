import { 
  getProductsSQL, 
  getProductBySlugSQL, 
  getCategoriesSQL, 
  searchTaxonomyBySQL
} from './db';

interface GraphQLVariables {
  first?: string | number;
  category?: string;
  search?: string;
  tag?: string;
  ids?: string[];
  id?: string;
  after?: string;
  where?: {
    first?: string | number;
    category?: string;
    search?: string;
    tag?: string;
    include?: string[];
    taxonomyFilter?: {
      filters: {
        taxonomy: string;
        terms: string[];
      }[];
    };
  };
}

export async function handleLocalGraphQL(query: string, variables: Record<string, unknown> = {}) {
  try {
    const queryLower = query.toLowerCase();
    const vars = (variables || {}) as GraphQLVariables;

    // 1. GetProducts / GetProductsPage / GetProductsByIds / GetProductsByTax
    if (
      queryLower.includes('query getproducts') || 
      queryLower.includes('query getproductspage') ||
      queryLower.includes('query getproductsbyids') ||
      queryLower.includes('query getproductsbytax')
    ) {
      // Extract variables, handling both flat and nested 'where' object
      const first = vars.first || (vars.where && vars.where.first);
      const limit = parseInt(first as string, 10) || 20;
      
      let category = vars.category || (vars.where && vars.where.category) || null;
      const search = vars.search || (vars.where && vars.where.search) || null;
      let tag = vars.tag || (vars.where && vars.where.tag) || null;
      const include = vars.ids || (vars.where && vars.where.include) || null;
      
      // Handle taxonomyFilter if it exists (for GetProductsByTax)
      if (vars.where && vars.where.taxonomyFilter) {
        const tf = vars.where.taxonomyFilter;
        if (tf.filters && tf.filters.length > 0) {
          // Simple mapping for OR relation: use the first category/tag found
          const catFilter = tf.filters.find((f: { taxonomy: string }) => f.taxonomy === 'PRODUCT_CAT');
          const tagFilter = tf.filters.find((f: { taxonomy: string }) => f.taxonomy === 'PRODUCT_TAG');
          if (catFilter && catFilter.terms) category = catFilter.terms[0];
          if (tagFilter && tagFilter.terms) tag = tagFilter.terms[0];
        }
      }

      // Normalize "todas" logic
      if (category === 'todas') category = null;

      // Handle pagination using Buffer for cross-env base64
      let offset = 0;
      if (vars.after) {
        try {
          const decoded = Buffer.from(vars.after, 'base64').toString('utf-8');
          if (decoded.startsWith('offset:')) {
            offset = parseInt(decoded.split(':')[1], 10);
          }
        } catch (e) {
          console.error('Error decoding cursor:', e);
        }
      }

      const includeIds = include ? include.map(id => parseInt(id, 10)).filter(id => !isNaN(id)) : undefined;

      const products = await getProductsSQL({ 
        limit, 
        offset, 
        category: category || undefined, 
        search: search || undefined, 
        tag: tag || undefined, 
        include: includeIds
      });
      
      if (products === null) return null; // Signal fallback to remote
      
      const nextOffset = offset + products.length;
      
      // WPGraphQL usually returns hasNextPage = true if we got exactly 'limit' items
      const hasNextPage = products.length >= limit;

      return {
        data: {
          products: {
            pageInfo: {
              hasNextPage: hasNextPage,
              endCursor: hasNextPage ? Buffer.from(`offset:${nextOffset}`).toString('base64') : null
            },
            nodes: products.map(p => {
              const parsePrice = (val?: string) => {
                if (!val) return 0;
                const num = parseFloat(val.replace(/[^0-9.-]+/g, ''));
                return isNaN(num) ? 0 : num;
              };

              const variations = (p as any).sql_variations?.map((v: any) => ({
                id: Buffer.from(`variation:${v.databaseId}`).toString('base64'),
                databaseId: v.databaseId,
                name: p.post_title,
                price: v.price,
                image: v.image_url ? { sourceUrl: v.image_url } : null,
                attributes: {
                  nodes: Object.entries(v.attributes).map(([name, value]) => ({
                    name: `pa_${name}`,
                    value: value as string
                  }))
                }
              })) || [];

              return {
                __typename: (p as any).sql_variations?.length > 0 ? 'VariableProduct' : 'SimpleProduct',
                databaseId: p.databaseId,
                id: Buffer.from(`product:${p.databaseId}`).toString('base64'),
                name: p.post_title,
                slug: p.post_name,
                shortDescription: p.post_excerpt,
                description: p.post_content,
                image: p.image_url ? { sourceUrl: p.image_url, altText: p.post_title } : null,
                galleryImages: { nodes: [] },
                productCategories: { nodes: p.categories || [] },
                productTags: { nodes: [] },
                price: parsePrice(p.price),
                regularPrice: parsePrice(p.regular_price),
                salePrice: parsePrice(p.sale_price),
                variations: { nodes: variations }
              };
            })
          }
        }
      };
    }

    // 2. GetCategories / SearchCategories
    if (queryLower.includes('query getcategories') || queryLower.includes('query searchcategories')) {
      const searchTerm = vars.search || (vars.where && vars.where.search) || '';
      let nodes = [];
      
      if (searchTerm) {
        const results = await searchTaxonomyBySQL(searchTerm);
        if (results === null) return null;
        nodes = results.categories.map(c => ({
          databaseId: c.id,
          name: c.name,
          slug: c.slug,
          parent: null
        }));
      } else {
        const categories = await getCategoriesSQL();
        if (categories === null) return null;
        nodes = (categories as Record<string, unknown>[]).map((c) => ({
          databaseId: c.databaseId,
          name: c.name,
          slug: c.slug,
          parent: c.parent_slug ? { node: { slug: c.parent_slug } } : null
        }));
      }

      return {
        data: {
          productCategories: {
            nodes
          }
        }
      };
    }

    // 3. SearchTags
    if (queryLower.includes('query searchtags')) {
      const searchTerm = vars.search || (vars.where && vars.where.search) || '';
      const results = await searchTaxonomyBySQL(searchTerm);
      if (results === null) return null;
      return {
        data: {
          productTags: {
            nodes: results.tags.map(t => ({
              databaseId: t.databaseId,
              name: t.name,
              slug: t.slug
            }))
          }
        }
      };
    }

    // 4. GetSingleProduct
    if (queryLower.includes('query getsingleproduct')) {
      const slug = vars.id;
      if (!slug) return { data: { product: null } };
      
      const p = await getProductBySlugSQL(slug);
      if (!p) return { data: { product: null } };

      const parsePrice = (val?: string) => {
        if (!val) return 0;
        const num = parseFloat(val.replace(/[^0-9.-]+/g, ''));
        return isNaN(num) ? 0 : num;
      };

      const variations = (p as any).sql_variations?.map((v: any) => ({
        id: Buffer.from(`variation:${v.databaseId}`).toString('base64'),
        databaseId: v.databaseId,
        name: p.post_title,
        price: v.price,
        image: v.image_url ? { sourceUrl: v.image_url } : null,
        attributes: {
          nodes: Object.entries(v.attributes).map(([name, value]) => ({
            name: `pa_${name}`,
            value: value as string
          }))
        }
      })) || [];

      return {
        data: {
          product: {
            __typename: (p as any).sql_variations?.length > 0 ? 'VariableProduct' : 'SimpleProduct',
            databaseId: p.databaseId,
            id: Buffer.from(`product:${p.databaseId}`).toString('base64'),
            name: p.post_title,
            slug: p.post_name,
            shortDescription: p.post_excerpt,
            description: p.post_content,
            image: p.image_url ? { sourceUrl: p.image_url, altText: p.post_title } : null,
            galleryImages: { nodes: [] },
            productCategories: { nodes: p.categories || [] },
            price: parsePrice(p.price),
            regularPrice: parsePrice(p.regular_price),
            salePrice: parsePrice(p.sale_price),
            variations: { nodes: variations }
          }
        }
      };

    }

    // Fallback to remote for unhandled queries (mutations, etc)
    return null;
  } catch (err) {
    console.error('Error in handleLocalGraphQL:', err);
    return null; // Fallback to remote API
  }
}
