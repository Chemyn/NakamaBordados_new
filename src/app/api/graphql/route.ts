import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    
    // Forward WooCommerce Session
    const wooSession = request.headers.get('woocommerce-session');
    if (wooSession) {
      headers.set('woocommerce-session', wooSession);
    }
    
    // Forward Authorization token
    const auth = request.headers.get('authorization');
    if (auth) {
      headers.set('Authorization', auth);
    }

    const wpGraphQLUrl = process.env.NEXT_PUBLIC_WP_GRAPHQL_URL || 'https://nakamabordados.com/graphql';

    const isMutation = body.query?.trim().startsWith('mutation');
    const hasSession = !!wooSession || !!auth;

    const fetchOptions: any = {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body),
    };

    // If it's a mutation or has session headers, don't cache.
    // Otherwise, cache for a short period to speed up product loads.
    if (isMutation || hasSession) {
      fetchOptions.cache = 'no-store';
    } else {
      fetchOptions.next = { revalidate: 600 }; // 10 minutes cache for general products
    }

    const res = await fetch(wpGraphQLUrl, fetchOptions);

    const data = await res.json();
    
    // Return the response headers back to the client, especially woocommerce-session
    const responseHeaders = new Headers();
    const resSession = res.headers.get('woocommerce-session');
    if (resSession) {
      responseHeaders.set('woocommerce-session', resSession);
    }

    return NextResponse.json(data, { headers: responseHeaders });
  } catch (error) {
    console.error("GraphQL Proxy Error:", error);
    return NextResponse.json({ error: 'Failed to proxy GraphQL request' }, { status: 500 });
  }
}
