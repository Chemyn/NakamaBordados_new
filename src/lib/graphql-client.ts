// For Server Components we can still use the direct URL, but for Client Components we use the local proxy to avoid CORS
export const WP_GRAPHQL_URL = 'https://nakamabordados.com/graphql';

export async function fetchGraphQL(query: string, variables = {}, extraHeaders: Record<string, string> = {}) {
  const isServer = typeof window === 'undefined';

  // If on server and in development, try to handle query locally with SQL
  if (isServer && process.env.NODE_ENV === 'development') {
    try {
      // Dynamic import to avoid bundling Node-only modules (mysql2, net) on client
      const { handleLocalGraphQL } = await import('./local-graphql-handler');
      const localResult = await handleLocalGraphQL(query, variables);
      if (localResult) {
        console.log(`[GraphQL] Query handled locally via SQL. Data present: ${!!localResult.data}`);
        return { data: localResult.data, responseHeaders: new Headers() };
      } else {
        console.log('[GraphQL] Local handler skipped or failed. Falling back to remote API.');
      }
    } catch (err) {
      console.error('Error in local GraphQL handler:', err);
      // Fallback to fetch if local fails
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      ...extraHeaders,
    };

    // Export estático: el cliente llama a WordPress directo (requiere CORS en WP).
    // Ya no existe el proxy /api/graphql.
    const isClient = typeof window !== 'undefined';
    const endpoint = WP_GRAPHQL_URL;

    const isMutation = query.trim().startsWith('mutation');
    const fetchOptions: RequestInit & { next?: { revalidate: number } } = {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query,
        variables,
      }),
      signal: controller.signal
    };

    if (!isClient) {
      // Disable cache in development for easier debugging
      fetchOptions.next = { revalidate: process.env.NODE_ENV === 'development' ? 0 : (isMutation ? 0 : 3600) };
    }

    const response = await fetch(endpoint, fetchOptions);
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('Network error fetching GraphQL', response.status, response.statusText);
      console.error('Failed Query:', query.substring(0, 100));
      return { data: null, responseHeaders: response.headers };
    }

    const body = await response.json();
    console.log(`[GraphQL-Remote] Received response status: ${response.status}. Data present: ${!!body.data}`);

    if (body.errors) {
      const errors = body.errors as Array<{message: string, path?: string[]}>;
      const isHarmlessEmptyCart = errors.length === 1 && errors[0].message === 'Cart is empty';
      
      // Check if this looks like a JWT authentication failure (often returns "Internal server error" on viewer/customer/cart)
      const isAuthError = errors.some(e => 
        (e.message === 'Internal server error' || e.message.toLowerCase().includes('jwt')) && 
        (e.path?.includes('viewer') || e.path?.includes('customer') || e.path?.includes('cart'))
      );

      if (!isHarmlessEmptyCart && !isAuthError) {
        console.error('GraphQL Errors Details:', JSON.stringify(errors, null, 2));
        console.error('on Query:', query.substring(0, 200));
        console.error('with Variables:', JSON.stringify(variables));
      } else if (isAuthError) {
        // Silently log for developers but don't spam console error if it's a routine auth expiry
        console.log('[GraphQL] Authentication failure or expired session detected.');
      }

      return { data: body.data || null, errors: body.errors, responseHeaders: response.headers };
    }

    return { data: body.data, errors: null, responseHeaders: response.headers };
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('GraphQL Request Timed Out');
    } else {
      console.error('Error in fetchGraphQL:', error);
    }
    return { data: null, errors: [error], responseHeaders: new Headers() };
  }
}
