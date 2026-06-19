import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// GET all settings
export async function GET(request: Request) {
  try {
    const authorized = await isAdmin(request);
    if (!authorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [rows] = await pool.execute('SELECT key_name, value FROM settings');
    
    // Map array to key-value record object
    const settings: Record<string, string> = {};
    (rows as any[]).forEach(row => {
      settings[row.key_name] = row.value;
    });

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('[API Settings GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST update settings
export async function POST(request: Request) {
  try {
    const authorized = await isAdmin(request);
    if (!authorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json(); // Expected: { key: value, key2: value2 }

    for (const [key, val] of Object.entries(body)) {
      const stringValue = typeof val === 'object' ? JSON.stringify(val) : String(val);
      
      // Update setting, insert if not exists
      await pool.execute(`
        INSERT INTO settings (key_name, value) 
        VALUES (?, ?) 
        ON DUPLICATE KEY UPDATE value = ?
      `, [key, stringValue, stringValue]);
    }

    return NextResponse.json({ success: true, message: 'Configuración guardada correctamente' });
  } catch (error) {
    console.error('[API Settings POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
