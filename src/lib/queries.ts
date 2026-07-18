import { fetchGraphQL } from './graphql-client';
import { Product, Variation } from '@/types/product';

// Standard WPGraphQL WooCommerce query with pagination
const GET_PRODUCTS_QUERY = `
  query GetProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        ... on Product {
          databaseId
          id
          name
          slug
          shortDescription
          description
          image {
            sourceUrl
            altText
          }
          galleryImages {
            nodes {
              sourceUrl
              altText
            }
          }
          productCategories {
            nodes {
              name
              slug
            }
          }
          productTags {
            nodes {
              name
              slug
            }
          }
        }
        ... on SimpleProduct {
          price
          regularPrice
          salePrice
        }
        ... on VariableProduct {
          price
          regularPrice
          salePrice
          variations(first: 100) {
            nodes {
              id
              databaseId
              name
              price
              image {
                sourceUrl
              }
              attributes {
                nodes {
                  name
                  value
                }
              }
            }
          }
        }
      }
    }
  }
`;

function mapNodeToProduct(node: unknown): Product {
  const n = node as {
    databaseId: number;
    id: string;
    name: string;
    slug: string;
    shortDescription?: string;
    description?: string;
    price?: string | number;
    type?: string;
    __typename?: string;
    image?: { sourceUrl: string };
    galleryImages?: { nodes: { sourceUrl: string }[] };
    productCategories?: { nodes: { slug: string }[] };
    variations?: { 
      nodes: { 
        databaseId: number; 
        price?: string | number; 
        image?: { sourceUrl: string };
        attributes?: { nodes: { name: string; value: string }[] };
      }[] 
    };
  };

  const parsePrice = (val?: string | number): number => {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return val;
    const num = parseFloat(val.replace(/[^0-9.-]+/g, ''));
    return isNaN(num) ? 0 : num;
  };

  try {
    const imageUrl = (n.image?.sourceUrl && n.image.sourceUrl.trim() !== '') 
      ? n.image.sourceUrl 
      : 'https://via.placeholder.com/300x300?text=No+Image';
    const categories = n.productCategories?.nodes?.map((c) => c.slug) || [];
    const numericPrice = parsePrice(n.price);

    const variations: Variation[] = [];
    let type: 'simple' | 'variable' = (n.type === 'variable' || n.__typename === 'VariableProduct' || (n.variations?.nodes?.length || 0) > 0) ? 'variable' : 'simple';
    const variationImages: string[] = [];

    if (n.variations && n.variations.nodes && n.variations.nodes.length > 0) {
      for (const vNode of n.variations.nodes) {
        const vPrice = parsePrice(vNode.price);

        if (vNode.image?.sourceUrl) {
          variationImages.push(vNode.image.sourceUrl);
        }
        
        const attrs: Record<string, string> = {};
        if (vNode.attributes && vNode.attributes.nodes) {
          for (const attr of vNode.attributes.nodes) {
            let prettyName = attr.name;
            if (prettyName.startsWith('pa_')) {
              prettyName = prettyName.substring(3);
            }
            // Capitalize first letter
            prettyName = prettyName.charAt(0).toUpperCase() + prettyName.slice(1);
            attrs[prettyName] = attr.value;
          }
        }
        
        variations.push({
          id: vNode.databaseId.toString(),
          databaseId: vNode.databaseId,
          sku: `WP-VAR-${vNode.databaseId}`,
          attributes: attrs,
          price: vPrice,
          // Camino GraphQL de respaldo: sin datos de stock reales, se deja null
          // (fuera del sistema de almacén) para no marcar agotado por error.
          stock: null,
          images: vNode.image?.sourceUrl ? [vNode.image.sourceUrl] : []
        });
      }
    }

    const galleryImages = n.galleryImages?.nodes?.map((img) => img.sourceUrl) || [];
    const allImages = [imageUrl, ...galleryImages, ...variationImages].filter((url, index, self) => url && self.indexOf(url) === index);

    const cleanDescription = (html: string) => {
      if (!html) return '';
      return html
        .replace(/<[^>]*>?/gm, '') 
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .trim();
    };

    const description = cleanDescription(n.description || n.shortDescription || '');

    return {
      id: n.slug || n.databaseId.toString(),
      databaseId: n.databaseId,
      sku: `WP-${n.databaseId}`,
      name: n.name,
      price: numericPrice,
      description: description,
      categories: categories,
      tags: [],
      images: allImages,
      type: type,
      variations: variations,
      rating: 5.0,
      salesCount: 10
    };
  } catch (err) {
    console.error("Error mapping product node:", err, n);
    // Return a safe fallback mock product so we don't crash the whole array
    return {
      id: 'error-' + Math.random(),
      sku: 'ERROR',
      name: 'Error Loading Product',
      price: 0,
      description: '',
      categories: [],
      tags: [],
      images: ['https://via.placeholder.com/300'],
      type: 'simple',
      variations: [],
      rating: 0,
      salesCount: 0
    };
  }
}

export async function getProductsFromWP(limit: number = 500): Promise<Product[]> {
  const allProducts: Product[] = [];
  let hasNextPage = true;
  let afterCursor: string | null = null;
  const perPage = 20; // Decreased from 100 to prevent 500 Internal Server Error from WPGraphQL

  try {
    while (hasNextPage && allProducts.length < limit) {
      const variables: Record<string, unknown> = { first: Math.min(perPage, limit - allProducts.length) };
      if (afterCursor) variables.after = afterCursor;

      const { data } = await fetchGraphQL(GET_PRODUCTS_QUERY, variables);
      
      if (!data || !data.products || !data.products.nodes) {
        if (allProducts.length === 0) {
          console.warn("No products returned from WPGraphQL. Check if WPGraphQL WooCommerce is installed.");
        }
        break;
      }

      const nodes = data.products.nodes;
      for (const node of nodes) {
        allProducts.push(mapNodeToProduct(node));
      }

      hasNextPage = data.products.pageInfo?.hasNextPage ?? false;
      afterCursor = data.products.pageInfo?.endCursor ?? null;
    }
  } catch (error) {
    console.error("Error in getProductsFromWP:", error);
  }

  return allProducts;
}

// Unified Query for Procedural Loading
const GET_PRODUCTS_PAGE_QUERY = `
  query GetProductsPage($first: Int!, $after: String, $category: String, $search: String, $tag: String) {
    products(first: $first, after: $after, where: { category: $category, search: $search, tag: $tag }) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        ... on Product {
          databaseId
          id
          name
          slug
          shortDescription
          description
          image {
            sourceUrl
            altText
          }
          galleryImages {
            nodes {
              sourceUrl
              altText
            }
          }
          productCategories {
            nodes {
              name
              slug
            }
          }
          productTags {
            nodes {
              name
              slug
            }
          }
        }
        ... on SimpleProduct {
          price
          regularPrice
          salePrice
        }
        ... on VariableProduct {
          price
          regularPrice
          salePrice
          variations(first: 100) {
            nodes {
              id
              databaseId
              name
              price
              image {
                sourceUrl
              }
              attributes {
                nodes {
                  name
                  value
                }
              }
            }
          }
        }
      }
    }
  }
`;

export interface ProductsPageResult {
  products: Product[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
}

export async function getProductsPageFromWP(
  limit: number = 20,
  after: string | null = null,
  categorySlug?: string,
  searchQuery?: string,
  tagSlug?: string
): Promise<ProductsPageResult> {
  try {
    const variables: Record<string, unknown> = { first: limit };
    if (after) variables.after = after;
    // Map parameter to "todas" logic
    if (categorySlug && categorySlug !== 'todas') variables.category = categorySlug;
    if (searchQuery) variables.search = searchQuery;
    if (tagSlug) variables.tag = tagSlug;

    const { data } = await fetchGraphQL(GET_PRODUCTS_PAGE_QUERY, variables);
    
    if (!data || !data.products || !data.products.nodes) {
      return { products: [], pageInfo: { hasNextPage: false, endCursor: null } };
    }

    const products = data.products.nodes.map((node: unknown) => mapNodeToProduct(node));
    return {
      products,
      pageInfo: {
        hasNextPage: data.products.pageInfo?.hasNextPage ?? false,
        endCursor: data.products.pageInfo?.endCursor ?? null
      }
    };
  } catch (error) {
    console.error("Error in getProductsPageFromWP:", error);
    return { products: [], pageInfo: { hasNextPage: false, endCursor: null } };
  }
}

// Keep the old category function for backward compatibility temporarily if needed, 
// but we can just map it to the new one:
export async function getProductsByCategoryFromWP(categorySlug: string, limit: number = 20): Promise<Product[]> {
  const result = await getProductsPageFromWP(limit, null, categorySlug);
  return result.products;
}

// Categories Query
const GET_CATEGORIES_QUERY = `
  query GetCategories {
    productCategories(first: 100) {
      nodes {
        databaseId
        name
        slug
        parent {
          node {
            slug
          }
        }
      }
    }
  }
`;

export interface WPCategory {
  id: number;
  name: string;
  slug: string;
  parentSlug: string | null;
}

export interface WPTag {
  databaseId: number;
  name: string;
  slug: string;
}

export async function getCategoriesFromWP(): Promise<WPCategory[]> {
  const { data } = await fetchGraphQL(GET_CATEGORIES_QUERY);
  
  if (!data || !data.productCategories) {
    return [];
  }

  return data.productCategories.nodes.map((node: { databaseId: number; name: string; slug: string; parent?: { node: { slug: string } } }) => ({
    id: node.databaseId,
    name: node.name,
    slug: node.slug,
    parentSlug: node.parent?.node?.slug || null
  }));
}

export async function getCategoriesBySearch(searchQuery: string): Promise<WPCategory[]> {
  const SEARCH_CATEGORIES_QUERY = `
    query SearchCategories($search: String) {
      productCategories(where: { search: $search }, first: 50) {
        nodes {
          databaseId
          name
          slug
        }
      }
    }
  `;

  try {
    const { data } = await fetchGraphQL(SEARCH_CATEGORIES_QUERY, { search: searchQuery });
    if (!data || !data.productCategories) return [];
    return data.productCategories.nodes.map((node: { databaseId: number; name: string; slug: string }) => ({
      id: node.databaseId,
      name: node.name,
      slug: node.slug,
      parentSlug: null
    }));
  } catch (error) {
    console.error("Error searching categories:", error);
    return [];
  }
}

export async function getTagsBySearch(searchQuery: string) {
  const SEARCH_TAGS_QUERY = `
    query SearchTags($search: String) {
      productTags(where: { search: $search }, first: 50) {
        nodes {
          databaseId
          name
          slug
        }
      }
    }
  `;

  try {
    const { data } = await fetchGraphQL(SEARCH_TAGS_QUERY, { search: searchQuery });
    if (!data || !data.productTags) return [];
    return data.productTags.nodes;
  } catch (error) {
    console.error("Error searching tags:", error);
    return [];
  }
}

const GET_SINGLE_PRODUCT_QUERY = `
  query GetSingleProduct($id: ID!) {
    product(id: $id, idType: SLUG) {
      ... on Product {
        databaseId
        id
        name
        slug
        shortDescription
        description
        image {
          sourceUrl
          altText
        }
        galleryImages {
          nodes {
            sourceUrl
            altText
          }
        }
        productCategories {
          nodes {
            name
            slug
          }
        }
      }
      ... on SimpleProduct {
        price
        regularPrice
        salePrice
      }
      ... on VariableProduct {
        price
        regularPrice
        salePrice
        variations(first: 100) {
          nodes {
            id
            databaseId
            name
            price
            image {
              sourceUrl
            }
            attributes {
              nodes {
                name
                value
              }
            }
          }
        }
      }
    }
  }
`;

export async function getComprehensiveSearchResults(
  query: string,
  limit: number = 20,
  after: string | null = null
): Promise<ProductsPageResult> {
  try {
    const normalizedQuery = query.trim().toLowerCase();
    console.log(`Deep Search for: "${normalizedQuery}"`);

    // 1. Encontrar categorías y etiquetas que coincidan con la búsqueda
    // Usamos tanto la búsqueda literal como variaciones comunes (ej. "one piece" -> "one-piece")
    const searchTerms = [normalizedQuery];
    if (normalizedQuery.includes(' ')) {
      searchTerms.push(normalizedQuery.replace(/\s+/g, '-'));
    }

    const [matchingCats, matchingTags] = await Promise.all([
      getCategoriesBySearch(normalizedQuery),
      getTagsBySearch(normalizedQuery)
    ]);

    const catSlugs = new Set(matchingCats.map((c: WPCategory) => c.slug));
    const tagSlugs = new Set(matchingTags.map((t: WPTag) => t.slug));
    
    // Añadimos variaciones manuales de slug si no fueron detectadas
    searchTerms.forEach(term => {
      catSlugs.add(term);
      tagSlugs.add(term);
    });

    console.log(`Matching categories: ${Array.from(catSlugs).join(', ')}`);
    console.log(`Matching tags: ${Array.from(tagSlugs).join(', ')}`);

    // 2. Ejecutar búsquedas en paralelo: por texto, por categorías y por etiquetas
    const searchVars = { first: limit, search: query, after };
    
    // Filtros de taxonomía (OR entre categorías y etiquetas encontradas)
    const taxFilters = [];
    if (catSlugs.size > 0) {
      taxFilters.push({ taxonomy: 'PRODUCT_CAT', terms: Array.from(catSlugs), operator: 'IN' });
    }
    if (tagSlugs.size > 0) {
      taxFilters.push({ taxonomy: 'PRODUCT_TAG', terms: Array.from(tagSlugs), operator: 'IN' });
    }

    const promises = [
      fetchGraphQL(GET_PRODUCTS_PAGE_QUERY, searchVars)
    ];

    if (taxFilters.length > 0) {
      const taxQuery = `
        query GetProductsByTax($first: Int!, $after: String, $taxFilter: ProductTaxonomyInput) {
          products(first: $first, after: $after, where: { taxonomyFilter: $taxFilter }) {
            pageInfo { hasNextPage endCursor }
            nodes {
              ... on Product {
                databaseId id name slug shortDescription description
                image { sourceUrl altText }
                galleryImages { nodes { sourceUrl altText } }
                productCategories { nodes { name slug } }
                productTags { nodes { name slug } }
              }
              ... on SimpleProduct { price regularPrice salePrice }
              ... on VariableProduct {
                price regularPrice salePrice
                variations(first: 100) {
                  nodes {
                    id databaseId name price
                    image { sourceUrl }
                    attributes { nodes { name value } }
                  }
                }
              }
            }
          }
        }
      `;
      promises.push(fetchGraphQL(taxQuery, { 
        first: limit, 
        after, 
        taxFilter: {
          relation: 'OR',
          filters: taxFilters
        }
      }));
    }

    const results = await Promise.all(promises);
    
    const allProductsMap = new Map();
    let hasNextPage = false;
    let endCursor = null;

    results.forEach(res => {
      const data = res.data?.products;
      if (data && data.nodes) {
        data.nodes.forEach((node: unknown) => {
          const product = mapNodeToProduct(node);
          allProductsMap.set(product.databaseId, product);
        });
        if (data.pageInfo?.hasNextPage) hasNextPage = true;
        if (data.pageInfo?.endCursor) endCursor = data.pageInfo.endCursor;
      }
    });

    const combinedProducts = Array.from(allProductsMap.values());

    return {
      products: combinedProducts.slice(0, limit),
      pageInfo: {
        hasNextPage,
        endCursor
      }
    };
  } catch (error) {
    console.error("Error in getComprehensiveSearchResults:", error);
    return { products: [], pageInfo: { hasNextPage: false, endCursor: null } };
  }
}

export async function getProductByIdFromWP(id: string): Promise<Product | undefined> {
  try {
    console.log(`Fetching single product from WP: ${id}`);
    const { data } = await fetchGraphQL(GET_SINGLE_PRODUCT_QUERY, { id });
    if (!data || !data.product) {
      console.warn(`Product not found in WP: ${id}`);
      return undefined;
    }
    return mapNodeToProduct(data.product);
  } catch (err) {
    console.error("Error fetching single product from WP:", err);
    return undefined;
  }
}

export async function getProductsByIds(ids: number[]): Promise<Product[]> {
  if (ids.length === 0) return [];

  const GET_PRODUCTS_BY_IDS_QUERY = `
    query GetProductsByIds($ids: [Int]!) {
      products(where: { include: $ids }, first: 100) {
        nodes {
          ... on Product {
            databaseId id name slug shortDescription description
            image { sourceUrl altText }
            galleryImages { nodes { sourceUrl altText } }
            productCategories { nodes { name slug } }
            productTags { nodes { name slug } }
          }
          ... on SimpleProduct { price regularPrice salePrice }
          ... on VariableProduct {
            price regularPrice salePrice
            variations(first: 100) {
              nodes {
                id databaseId name price
                image { sourceUrl }
                attributes { nodes { name value } }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const { data } = await fetchGraphQL(GET_PRODUCTS_BY_IDS_QUERY, { ids });
    if (!data || !data.products || !data.products.nodes) return [];
    return data.products.nodes.map((node: unknown) => mapNodeToProduct(node));
  } catch (error) {
    console.error("Error fetching products by IDs:", error);
    return [];
  }
}
