import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Logica básica de seguridad
    // En producción, valida un token secreto o header
    
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
