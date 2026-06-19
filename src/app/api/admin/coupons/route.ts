import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// GET all coupons
export async function GET(request: Request) {
  try {
    const authorized = await isAdmin(request);
    if (!authorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [rows] = await pool.execute('SELECT id, code, type, amount, status, expiration_date, created_at FROM coupons ORDER BY created_at DESC');
    return NextResponse.json({ success: true, coupons: rows });
  } catch (error) {
    console.error('[API Coupons GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST create coupon
export async function POST(request: Request) {
  try {
    const authorized = await isAdmin(request);
    if (!authorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { code, type, amount, expiration_date } = await request.json();

    if (!code || !type || amount === undefined) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const normalizedCode = code.trim().toUpperCase();

    // Check if code already exists
    const [existing] = await pool.execute('SELECT id FROM coupons WHERE code = ?', [normalizedCode]);
    if ((existing as any[]).length > 0) {
      return NextResponse.json({ error: 'El código de cupón ya existe' }, { status: 400 });
    }

    const expDate = expiration_date ? new Date(expiration_date) : null;

    const [result] = await pool.execute(
      'INSERT INTO coupons (code, type, amount, expiration_date) VALUES (?, ?, ?, ?)',
      [normalizedCode, type, amount, expDate]
    );

    return NextResponse.json({
      success: true,
      message: 'Cupón creado correctamente',
      couponId: (result as any).insertId
    });
  } catch (error) {
    console.error('[API Coupons POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE coupon
export async function DELETE(request: Request) {
  try {
    const authorized = await isAdmin(request);
    if (!authorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing ID parameter' }, { status: 400 });
    }

    await pool.execute('DELETE FROM coupons WHERE id = ?', [id]);

    return NextResponse.json({ success: true, message: 'Cupón eliminado correctamente' });
  } catch (error) {
    console.error('[API Coupons DELETE] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
