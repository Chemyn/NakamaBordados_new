import { fetchGraphQL } from './graphql-client';
import { Product } from '@/app/data/products'; // We will update this interface later

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

function mapNodeToProduct(node: any): Product {
  try {
    const imageUrl = (node.image?.sourceUrl && node.image.sourceUrl.trim() !== '') 
      ? node.image.sourceUrl 
      : 'https://via.placeholder.com/300x300?text=No+Image';
    const categories = node.productCategories?.nodes?.map((c: any) => c.slug) || [];
    
    let numericPrice = 0;
    if (node.price) {
      const parsed = parseFloat(node.price.replace(/[^0-9.-]+/g, ''));
      if (!isNaN(parsed)) numericPrice = parsed;
    }

    const variations = [];
    let type: 'simple' | 'variable' = 'simple';
    const variationImages: string[] = [];

    if (node.variations && node.variations.nodes && node.variations.nodes.length > 0) {
      type = 'variable';
      for (const vNode of node.variations.nodes) {
        let vPrice = 0;
        if (vNode.price) {
          const parsed = parseFloat(vNode.price.replace(/[^0-9.-]+/g, ''));
          if (!isNaN(parsed)) vPrice = parsed;
        }

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
            attrs[prettyName] = attr.value;
          }
        }
        
        variations.push({
          id: vNode.databaseId.toString(),
          sku: `WP-VAR-${vNode.databaseId}`,
          attributes: attrs,
          price: vPrice,
          stock: 10, // Mock stock
          images: vNode.image?.sourceUrl ? [vNode.image.sourceUrl] : []
        });
      }
    }

    const galleryImages = node.galleryImages?.nodes?.map((img: any) => img.sourceUrl) || [];
    const allImages = [imageUrl, ...galleryImages, ...variationImages].filter((url, index, self) => url && self.indexOf(url) === index);

    // Clean up description (strip HTML and fix whitespace)
    const cleanDescription = (html: string) => {
      if (!html) return '';
      return html
        .replace(/<[^>]*>?/gm, '') // Strip HTML tags
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .trim();
    };

    const description = cleanDescription(node.description || node.shortDescription || '');

    return {
      id: node.slug || node.databaseId.toString(),
      sku: `WP-${node.databaseId}`,
      name: node.name,
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
    console.error("Error mapping product node:", err, node);
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
  const perPage = 100; // WPGraphQL max per request

  try {
    while (hasNextPage && allProducts.length < limit) {
      const variables: Record<string, any> = { first: Math.min(perPage, limit - allProducts.length) };
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
    const variables: Record<string, any> = { first: limit };
    if (after) variables.after = after;
    // Map parameter to "todas" logic
    if (categorySlug && categorySlug !== 'todas') variables.category = categorySlug;
    if (searchQuery) variables.search = searchQuery;
    if (tagSlug) variables.tag = tagSlug;

    const { data } = await fetchGraphQL(GET_PRODUCTS_PAGE_QUERY, variables);
    
    if (!data || !data.products || !data.products.nodes) {
      return { products: [], pageInfo: { hasNextPage: false, endCursor: null } };
    }

    const products = data.products.nodes.map((node: any) => mapNodeToProduct(node));
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
    productCategories(first: 100, where: { hideEmpty: true }) {
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

export async function getCategoriesFromWP(): Promise<WPCategory[]> {
  const { data } = await fetchGraphQL(GET_CATEGORIES_QUERY);
  
  if (!data || !data.productCategories) {
    return [];
  }

  return data.productCategories.nodes.map((node: any) => ({
    id: node.databaseId,
    name: node.name,
    slug: node.slug,
    parentSlug: node.parent?.node?.slug || null
  }));
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

export async function getProductByIdFromWP(id: string): Promise<Product | undefined> {
  try {
    const { data } = await fetchGraphQL(GET_SINGLE_PRODUCT_QUERY, { id });
    if (!data || !data.product) return undefined;
    return mapNodeToProduct(data.product);
  } catch (err) {
    console.error("Error fetching single product from WP:", err);
    return undefined;
  }
}
