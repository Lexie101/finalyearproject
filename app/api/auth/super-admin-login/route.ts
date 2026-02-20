// Consolidated: This endpoint has been consolidated into /api/auth/admin-login
// Use /api/auth/admin-login for admin/super-admin login

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  return NextResponse.json(
    { error: "Use /api/auth/admin-login for admin login" },
    { status: 307 }
  );
}
