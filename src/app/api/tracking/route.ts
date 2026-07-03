import { NextResponse } from 'next/server';

// Basic anti-abuse same-origin guard. This is NOT full authentication: it only
// blocks cross-origin browser requests (which always send an Origin/Referer header)
// from third parties trying to burn our server-side ENVIA_API_TOKEN. Server-to-server
// callers (curl, our own server code) send no Origin/Referer and are allowed through.
// Rate-limiting is strongly recommended on top of this for real protection.
function isAllowedOrigin(req: Request): boolean {
  const origin = req.headers.get('origin') || req.headers.get('referer');
  // No origin/referer header (server-to-server / curl): allow to avoid breaking existing usage.
  if (!origin) return true;

  try {
    const originHost = new URL(origin).host;
    const requestHost = new URL(req.url).host;
    const siteHost = process.env.NEXT_PUBLIC_SITE_URL
      ? new URL(process.env.NEXT_PUBLIC_SITE_URL).host
      : null;

    if (originHost === requestHost) return true;
    if (siteHost && originHost === siteHost) return true;
    if (originHost.startsWith('localhost') || originHost.startsWith('127.0.0.1')) return true;

    return false;
  } catch {
    // Malformed origin header: reject to be safe.
    return false;
  }
}

export async function GET(req: Request) {
  try {
    if (!isAllowedOrigin(req)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const trackingNumber = searchParams.get('tracking');
    const carrier = searchParams.get('carrier');

    if (!trackingNumber || !carrier) {
      return NextResponse.json({ error: 'Tracking number and carrier are required' }, { status: 400 });
    }

    const enviaToken = process.env.ENVIA_API_TOKEN;
    if (!enviaToken) {
      console.error('Envia.com API Token is not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Official Envia.com Tracking API
    // Doc: https://ship.envia.com/shipment/track
    const url = `https://queries.envia.com/guide/track`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${enviaToken}`
      },
      body: JSON.stringify({
        trackingNumbers: [trackingNumber],
        carrier: carrier
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch tracking from Envia:', response.status, errorText);
      return NextResponse.json({ error: 'Failed to fetch tracking data' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('Error fetching tracking data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
