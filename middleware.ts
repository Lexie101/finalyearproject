import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth';

// Middleware now verifies a signed session cookie set at login
// Cookie contains a signed payload with { email, role, iat }

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const pathname = req.nextUrl.pathname;

  // Protect these routes
  const superAdminPaths = ['/super-admin', '/super-admin/'];
  const adminPaths = ['/admin', '/admin/'];
  const driverPaths = ['/driver', '/driver/'];
  const studentPaths = ['/student', '/student/'];

  const raw = req.cookies.get('cavendish_session')?.value ?? null;
  const session = await verifySession(raw);

  // Super Admin pages only
  if (superAdminPaths.some((p) => pathname === p || pathname.startsWith(p))) {
    if (!session || (session.role !== 'super_admin' && session.role !== 'super-admin' && session.role !== 'admin')) {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  // Admin pages (alias to super admin dashboard)
  if (adminPaths.some((p) => pathname === p || pathname.startsWith(p))) {
    if (!session || (session.role !== 'super_admin' && session.role !== 'super-admin' && session.role !== 'admin')) {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  // Driver pages
  if (driverPaths.some((p) => pathname === p || pathname.startsWith(p))) {
    if (!session || session.role !== 'driver') {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  // Student pages
  if (studentPaths.some((p) => pathname === p || pathname.startsWith(p))) {
    if (!session || session.role !== 'student') {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/driver/:path*', '/student/:path*', '/super-admin/:path*', '/admin/:path*'],
};
