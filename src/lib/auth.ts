import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignJWT, jwtVerify } from 'jose';

const COOKIE = 'gt_session';
const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me');

export type SessionUser = { id: number; name: string; email: string };

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ uid: user.id, name: user.name, email: user.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret);

  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      id: Number(payload.uid),
      name: String(payload.name ?? ''),
      email: String(payload.email ?? '')
    };
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect('/login');
  return session;
}

export function destroySession() {
  cookies().delete(COOKIE);
}
