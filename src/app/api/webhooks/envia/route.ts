import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // 1. Verify webhook signature or token if configured
    const authHeader = req.headers.get('authorization') || req.headers.get('x-envia-token');
    const expectedToken = process.env.ENVIA_WEBHOOK_SECRET;

    if (expectedToken && authHeader !== expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      console.warn('Unauthorized webhook attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    console.log('Received Envia.com Webhook:', JSON.stringify(payload, null, 2));

    // 2. Extract data (Envia.com payload structure can vary depending on the specific event)
    // Often it comes in a data array or object
    const data = payload.data ? (Array.isArray(payload.data) ? payload.data[0] : payload.data) : payload;
    
    // We look for tracking number, carrier, and the reference/order_id
    // Adjust these field names based on the exact webhook payload you configured in Envia
    const trackingNumber = data.trackingNumber || data.tracking_number;
    const carrier = data.carrier;
    // The order_id or reference in Envia where you saved the WooCommerce Order ID
    const orderId = data.order || data.order_id || data.reference;

    if (!trackingNumber || !orderId) {
      console.warn('Webhook payload missing required fields (trackingNumber or orderId)');
      return NextResponse.json({ received: true, status: 'ignored', reason: 'missing fields' });
    }

    // 3. Update WooCommerce Order via REST API
    const wpUrl = process.env.WP_REST_URL || 'https://nakamabordados.com';
    const consumerKey = process.env.WC_CONSUMER_KEY;
    const consumerSecret = process.env.WC_CONSUMER_SECRET;

    if (!consumerKey || !consumerSecret) {
      console.error('WooCommerce API keys are not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Clean order ID (just in case it comes with a prefix like "WP-123")
    const cleanOrderId = orderId.toString().replace(/\D/g, '');

    const updateResponse = await fetch(`${wpUrl}/wp-json/wc/v3/orders/${cleanOrderId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')
      },
      body: JSON.stringify({
        meta_data: [
          {
            key: '_envia_tracking_code',
            value: trackingNumber
          },
          {
            key: '_envia_carrier',
            value: carrier || ''
          }
        ]
      })
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error(`Failed to update WooCommerce order ${cleanOrderId}:`, updateResponse.status, errorText);
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }

    console.log(`Successfully updated order ${cleanOrderId} with tracking ${trackingNumber}`);
    return NextResponse.json({ success: true, order: cleanOrderId, tracking: trackingNumber });

  } catch (error) {
    console.error('Error processing Envia webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
