/**
 * app/api/auth/[...nextauth]/route.ts
 * 
 * This file is kept as a placeholder for potential future NextAuth integration
 * Currently, authentication is handled by:
 * - /app/api/auth/admin-login (admin/super-admin credentials)
 * - /app/api/auth/super-admin-login (super-admin specific)
 * - /app/api/otp/send (student OTP email)
 * - /app/api/otp/verify (student OTP validation)
 * - /middleware.ts (session validation)
 * - /lib/auth.ts (signSession, verifySession)
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// NextAuth is not used in this project
// All authentication is handled through custom API routes and signed JWT cookies

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: "NextAuth not configured for this project" },
    { status: 404 }
  );
}

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: "NextAuth not configured for this project" },
    { status: 404 }
  );
}

