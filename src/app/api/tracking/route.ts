import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
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
