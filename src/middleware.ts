import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC_PATHS = ['/login', '/register'];
const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me');

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('gt_session')?.value;

  let authed = false;
  if (token) {
    try {
      await jwtVerify(token, secret);
      authed = true;
    } catch {
      authed = false;
    }
  }

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!authed && !isPublic) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  if (authed && isPublic) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)']
};
