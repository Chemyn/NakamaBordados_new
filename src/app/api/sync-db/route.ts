import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate security token
    const authHeader = request.headers.get('authorization') || request.headers.get('x-sync-token');
    const expectedToken = process.env.SYNC_DB_SECRET;

    if (!expectedToken) {
      console.error('Database Sync Secret (SYNC_DB_SECRET) is not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    if (authHeader !== expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      console.warn('Unauthorized DB sync attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('[Sync DB] Triggered update for Product ID:', body.product_id);

    // Execute the clone-db.js script
    const scriptPath = path.join(process.cwd(), 'scripts', 'clone-db.js');
    
    // We run it asynchronously so we don't block the response
    exec(`node "${scriptPath}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`[Sync DB] Error executing script: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`[Sync DB] Script stderr: ${stderr}`);
        return;
      }
      console.log(`[Sync DB] Script stdout: ${stdout}`);
    });

    return NextResponse.json({ success: true, message: 'Sync process started in background' });
  } catch (error) {
    console.error('[Sync DB] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
