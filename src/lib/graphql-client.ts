export const WP_GRAPHQL_URL = 'https://nakamabordados.com/graphql';

export async function fetchGraphQL(query: string, variables = {}) {
  try {
    const response = await fetch(WP_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables,
      }),
      // Use Next.js fetch caching options if needed. 
      // For WooCommerce products, we typically revalidate often or don't cache.
      next: { revalidate: 60 }, // Revalidate every 60 seconds
    });

    if (!response.ok) {
      console.error('Network error fetching GraphQL', response.status, response.statusText);
      return null;
    }

    const body = await response.json();

    if (body.errors) {
      console.error('GraphQL Errors:', body.errors);
      return null;
    }

    return body.data;
  } catch (error) {
    console.error('Error in fetchGraphQL:', error);
    return null;
  }
}
