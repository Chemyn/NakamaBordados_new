// For Server Components we can still use the direct URL, but for Client Components we use the local proxy to avoid CORS
export const WP_GRAPHQL_URL = 'https://nakamabordados.com/graphql';

export async function fetchGraphQL(query: string, variables = {}, extraHeaders: Record<string, string> = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

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
    const isClient = typeof window !== 'undefined';
    const endpoint = isClient ? '/api/graphql' : WP_GRAPHQL_URL;

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
      fetchOptions.next = { revalidate: isMutation ? 0 : 3600 };
    }

    const response = await fetch(endpoint, fetchOptions);
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('Network error fetching GraphQL', response.status, response.statusText);
      return { data: null, responseHeaders: response.headers };
    }

    const body = await response.json();

    if (body.errors) {
      const isHarmlessEmptyCart = body.errors.length === 1 && body.errors[0].message === 'Cart is empty';
      if (!isHarmlessEmptyCart) {
        console.error('GraphQL Errors:', body.errors);
      }
      return { data: null, responseHeaders: response.headers };
    }

    return { data: body.data, responseHeaders: response.headers };
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('GraphQL Request Timed Out');
    } else {
      console.error('Error in fetchGraphQL:', error);
    }
    return { data: null, responseHeaders: new Headers() };
  }
}
