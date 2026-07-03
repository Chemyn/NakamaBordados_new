import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET;
// Fail-closed: sin un secreto configurado NO se firman/verifican tokens.
// Antes existía un fallback hardcodeado que permitía forjar tokens de admin.
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET no está configurado. Define JWT_SECRET en el entorno (.env.local).');
}
const key = new TextEncoder().encode(JWT_SECRET);

export async function signToken(payload: { id: number; email: string; role: string; name: string }) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch (err) {
    return null;
  }
}

export async function getAuthUser(request: Request) {
  // Try Authorization header
  const authHeader = request.headers.get('authorization');
  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }
  
  // Try Cookie header if header not present
  if (!token) {
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenCookie = cookieHeader
      .split(';')
      .find(c => c.trim().startsWith('token='));
    if (tokenCookie) {
      token = tokenCookie.split('=')[1];
    }
  }

  if (!token) return null;
  return await verifyToken(token);
}

export async function isAdmin(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return false;
  // Autorización basada en rol únicamente (se eliminó el email admin hardcodeado).
  return user.role === 'admin';
}
