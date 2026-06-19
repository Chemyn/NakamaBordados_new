import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

// GET list of uploaded files
export async function GET(request: Request) {
  try {
    const authorized = await isAdmin(request);
    if (!authorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Ensure uploads directory exists
    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    const files = await fs.readdir(UPLOAD_DIR);
    
    // Filter out hidden files and format response
    const fileList = files
      .filter(file => !file.startsWith('.'))
      .map(file => ({
        name: file,
        url: `/uploads/${file}`,
        // Add a clean timestamp if filename matches our pattern (timestamp-name)
        uploadedAt: isNaN(parseInt(file.split('-')[0])) ? null : new Date(parseInt(file.split('-')[0])).toISOString()
      }))
      // Sort newest first
      .sort((a, b) => {
        if (!a.uploadedAt) return 1;
        if (!b.uploadedAt) return -1;
        return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
      });

    return NextResponse.json({ success: true, files: fileList });
  } catch (error) {
    console.error('[API Media GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST upload file
export async function POST(request: Request) {
  try {
    const authorized = await isAdmin(request);
    if (!authorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = await request.formData();
    const file = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Ensure uploads directory exists
    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Clean up filename: replace spaces with hyphens, keep valid alphanumeric and dots/dashes
    const cleanName = file.name
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9.\-_]/g, '');

    const filename = `${Date.now()}-${cleanName}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    await fs.writeFile(filepath, buffer);

    return NextResponse.json({
      success: true,
      message: 'Archivo subido correctamente',
      url: `/uploads/${filename}`,
      name: filename
    });
  } catch (error) {
    console.error('[API Media POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
