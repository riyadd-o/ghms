import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('staff_token')?.value;
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/admin') || pathname.startsWith('/kitchen')) {
    if (!token) {
      return NextResponse.redirect(new URL('/staff-login', request.url));
    }
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      const { payload } = await jwtVerify(token, secret);
      
      if (pathname.startsWith('/admin') && payload.role !== 'admin') {
        return NextResponse.redirect(new URL('/staff-login', request.url));
      }
      if (pathname.startsWith('/kitchen') && payload.role !== 'chef') {
        return NextResponse.redirect(new URL('/staff-login', request.url));
      }
      return NextResponse.next();
    } catch {
      return NextResponse.redirect(new URL('/staff-login', request.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/kitchen/:path*'],
};
