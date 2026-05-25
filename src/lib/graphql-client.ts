// For Server Components we can still use the direct URL, but for Client Components we use the local proxy to avoid CORS
export const WP_GRAPHQL_URL = 'https://nakamabordados.com/graphql';

export async function fetchGraphQL(query: string, variables = {}, extraHeaders: Record<string, string> = {}) {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...extraHeaders,
    };

    // Determine the endpoint URL
    const endpoint = typeof window !== 'undefined' ? '/api/graphql' : WP_GRAPHQL_URL;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query,
        variables,
      }),
      // Caching disabled for mutations or cart queries, but typically we manage this per-request in Next 13+
      // For general compatibility we keep it simple here, cart context will override caching if needed
      cache: 'no-store', 
    });

    if (!response.ok) {
      console.error('Network error fetching GraphQL', response.status, response.statusText);
      return { data: null, responseHeaders: response.headers };
    }

    const body = await response.json();

    if (body.errors) {
      // WPGraphQL WooCommerce throws an error if we try to empty an already empty cart.
      // We can safely ignore this specific error to prevent console spam and Next.js error overlays.
      const isHarmlessEmptyCart = body.errors.length === 1 && body.errors[0].message === 'Cart is empty';
      
      if (!isHarmlessEmptyCart) {
        console.error('GraphQL Errors:', body.errors);
      }
      return { data: null, responseHeaders: response.headers };
    }

    return { data: body.data, responseHeaders: response.headers };
  } catch (error) {
    console.error('Error in fetchGraphQL:', error);
    return { data: null, responseHeaders: new Headers() };
  }
}
