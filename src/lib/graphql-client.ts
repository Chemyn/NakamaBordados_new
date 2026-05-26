// For Server Components we can still use the direct URL, but for Client Components we use the local proxy to avoid CORS
export const WP_GRAPHQL_URL = 'https://nakamabordados.com/graphql';

export async function fetchGraphQL(query: string, variables = {}, extraHeaders: Record<string, string> = {}) {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Origin': 'https://nakamabordados.com',
      'Referer': 'https://nakamabordados.com/',
      ...extraHeaders,
    };

    // Determine the endpoint URL
    const endpoint = typeof window !== 'undefined' ? '/api/graphql' : WP_GRAPHQL_URL;

    const isMutation = query.trim().startsWith('mutation');
    const fetchOptions: any = {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query,
        variables,
      }),
    };

    // If it's a server-side request (not from window), we can use Next.js data cache
    if (typeof window === 'undefined') {
      if (isMutation) {
        fetchOptions.cache = 'no-store';
      } else {
        fetchOptions.next = { revalidate: 3600 }; // Cache for 1 hour by default
      }
    } else {
      // Browser fetch doesn't support 'next' key
      fetchOptions.cache = isMutation ? 'no-store' : 'default';
    }

    const response = await fetch(endpoint, fetchOptions);

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
