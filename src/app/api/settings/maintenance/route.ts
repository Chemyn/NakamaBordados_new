import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
  try {
    const [rows] = await pool.execute(`
      SELECT key_name, value 
      FROM settings 
      WHERE key_name IN ('maintenance_mode', 'social_links', 'maintenance_message', 'maintenance_image')
    `);

    const settings: Record<string, string> = {};
    (rows as any[]).forEach(row => {
      settings[row.key_name] = row.value;
    });

    const isMaintenance = settings['maintenance_mode'] === 'true';
    let socialLinks = { facebook: '', instagram: '', tiktok: '' };
    try {
      if (settings['social_links']) {
        socialLinks = JSON.parse(settings['social_links']);
      }
    } catch (e) {
      console.error('Error parsing social links setting:', e);
    }

    return NextResponse.json({
      success: true,
      maintenanceMode: isMaintenance,
      message: settings['maintenance_message'] || 'Sitio en mantenimiento.',
      image: settings['maintenance_image'] || '',
      socialLinks
    });
  } catch (error) {
    console.error('[API Public Maintenance] Error:', error);
    // Safe default if DB is offline or table doesn't exist yet
    return NextResponse.json({
      success: true,
      maintenanceMode: false,
      message: 'Sitio en mantenimiento.',
      image: '',
      socialLinks: { facebook: '', instagram: '', tiktok: '' }
    });
  }
}
export const dynamic = 'force-dynamic';
