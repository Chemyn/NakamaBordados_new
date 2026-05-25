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
          description
          image {
            sourceUrl
            altText
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
        }
      }
    }
  }
`;

function mapNodeToProduct(node: any): Product {
  const imageUrl = node.image?.sourceUrl || 'https://via.placeholder.com/300x300?text=No+Image';
  const categories = node.productCategories?.nodes?.map((c: any) => c.slug) || [];
  
  let numericPrice = 0;
  if (node.price) {
    const parsed = parseFloat(node.price.replace(/[^0-9.-]+/g, ''));
    if (!isNaN(parsed)) numericPrice = parsed;
  }

  return {
    id: node.slug || node.databaseId.toString(),
    sku: `WP-${node.databaseId}`,
    name: node.name,
    price: numericPrice,
    description: node.description || '',
    categories: categories,
    tags: [],
    images: [imageUrl],
    type: 'simple',
    variations: [],
    rating: 5.0,
    salesCount: 10
  };
}

export async function getProductsFromWP(limit: number = 500): Promise<Product[]> {
  const allProducts: Product[] = [];
  let hasNextPage = true;
  let afterCursor: string | null = null;
  const perPage = 100; // WPGraphQL max per request

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

  return allProducts;
}

// Query products by specific category slug
const GET_PRODUCTS_BY_CATEGORY_QUERY = `
  query GetProductsByCategory($first: Int!, $category: String!) {
    products(first: $first, where: { category: $category }) {
      nodes {
        ... on Product {
          databaseId
          id
          name
          slug
          description
          image {
            sourceUrl
            altText
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
        }
      }
    }
  }
`;

export async function getProductsByCategoryFromWP(categorySlug: string, limit: number = 20): Promise<Product[]> {
  const { data } = await fetchGraphQL(GET_PRODUCTS_BY_CATEGORY_QUERY, { first: limit, category: categorySlug });
  
  if (!data || !data.products || !data.products.nodes) {
    return [];
  }

  return data.products.nodes.map((node: any) => mapNodeToProduct(node));
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

