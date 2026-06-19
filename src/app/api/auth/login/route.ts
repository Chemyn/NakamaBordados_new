import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { signToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username/Email and password are required' }, { status: 400 });
    }

    // Query database for user by email or username
    const [rows] = await pool.execute(
      'SELECT id, email, password_hash, first_name, last_name, role FROM users WHERE email = ?',
      [username]
    );

    const users = rows as any[];
    if (users.length === 0) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    const user = users[0];

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    // Sign JWT
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
    const token = await signToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: fullName
    });

    const response = NextResponse.json({
      success: true,
      authToken: token,
      user: {
        id: token, // Using token or unique node ID for compatibility with frontend mapping
        databaseId: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      }
    });

    // Set cookie
    response.cookies.set({
      name: 'token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return response;
  } catch (error) {
    console.error('[API Login] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
