/**
 * Logout Endpoint
 * Clears authenticated session by expiring the signed cookie
 */

import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * POST /api/auth/logout
 * Clears the session cookie and returns success
 */
export async function POST(req: NextRequest) {
  try {
    // Get session info before clearing (for logging)
    const cookieValue = req.cookies.get("cavendish_session")?.value;
    const session = await verifySession(cookieValue);

    const res = NextResponse.json(
      { success: true, message: "Logged out successfully" },
      { status: 200 }
    );

    // Clear the signed session cookie by setting maxAge=0
    res.cookies.set("cavendish_session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0, // Immediately expires the cookie
    });

    if (session) {
      console.info(`[Logout] User ${session.email} logged out`);
    }

    return res;
  } catch (error) {
    console.error("[Logout] Error:", error);
    return NextResponse.json(
      { success: false, error: "Logout failed" },
      { status: 500 }
    );
  }
}
