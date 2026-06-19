import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const decodedUser = await getAuthUser(request);
    
    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get fresh user details from DB
    const [userRows] = await pool.execute(
      'SELECT id, email, first_name, last_name, phone, role FROM users WHERE id = ?',
      [(decodedUser as any).id]
    );

    const users = userRows as any[];
    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const user = users[0];

    // Get shipping addresses
    const [addressRows] = await pool.execute(
      'SELECT street_address, apartment, city, state, postal_code, country FROM addresses WHERE user_id = ? AND address_type = "shipping" LIMIT 1',
      [user.id]
    );
    const addresses = addressRows as any[];
    const shipping = addresses.length > 0 ? {
      address1: addresses[0].street_address || '',
      address2: addresses[0].apartment || '',
      city: addresses[0].city || '',
      state: addresses[0].state || '',
      postcode: addresses[0].postal_code || '',
      country: addresses[0].country || 'MX'
    } : {
      address1: '',
      address2: '',
      city: '',
      state: '',
      postcode: '',
      country: 'MX'
    };

    // Get orders
    const [orderRows] = await pool.execute(
      'SELECT id, order_number, status, total, created_at as date, tracking_code, tracking_carrier FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
      [user.id]
    );
    
    const orders = [];
    for (const order of orderRows as any[]) {
      // Get order items
      const [itemRows] = await pool.execute(
        'SELECT product_name, quantity FROM order_items WHERE order_id = ?',
        [order.id]
      );
      orders.push({
        id: `order-${order.id}`,
        orderNumber: order.order_number,
        status: order.status.toUpperCase(),
        total: order.total.toString(),
        date: order.date.toISOString(),
        enviaTrackingCode: order.tracking_code || undefined,
        enviaCarrier: order.tracking_carrier || undefined,
        metaData: [],
        lineItems: {
          nodes: (itemRows as any[]).map(item => ({
            product: { node: { name: item.product_name } },
            quantity: item.quantity
          }))
        }
      });
    }

    return NextResponse.json({
      success: true,
      viewer: {
        id: decodedUser.email, // using email as client-side GraphQL ID fallback
        databaseId: user.id,
        username: user.email,
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        role: user.role,
        email: user.email,
        roles: {
          nodes: [{ name: user.role }]
        }
      },
      customer: {
        shipping,
        orders: {
          nodes: orders
        }
      }
    });

  } catch (error) {
    console.error('[API Me] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
