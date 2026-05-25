export const WP_GRAPHQL_URL = 'https://nakamabordados.com/graphql';

export async function fetchGraphQL(query: string, variables = {}, extraHeaders: Record<string, string> = {}) {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...extraHeaders,
    };

    const response = await fetch(WP_GRAPHQL_URL, {
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
      console.error('GraphQL Errors:', body.errors);
      return { data: null, responseHeaders: response.headers };
    }

    return { data: body.data, responseHeaders: response.headers };
  } catch (error) {
    console.error('Error in fetchGraphQL:', error);
    return { data: null, responseHeaders: new Headers() };
  }
}
