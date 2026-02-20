/**
 * Session Restoration Endpoint
 * Returns authenticated user from signed session cookie
 * Called by AuthProvider on client-side to restore session
 */

import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * GET /api/auth/session
 * Returns current session info if authenticated
 */
export async function GET(req: NextRequest) {
  try {
    // Extract and verify signed session cookie
    const cookieValue = req.cookies.get("cavendish_session")?.value;
    const session = await verifySession(cookieValue);

    if (!session) {
      // No valid session - return empty
      return NextResponse.json(
        {
          authenticated: false,
          user: null,
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    // Normalize role (super-admin -> super_admin)
    const normalizedRole = session.role
      ?.toLowerCase()
      .replace("-", "_");

    console.info(
      `[Session] Restored session for ${session.email} as ${normalizedRole}`
    );

    return NextResponse.json(
      {
        authenticated: true,
        user: {
          email: session.email,
          role: normalizedRole,
          userId: session.userId || undefined,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("[Session] Verification error:", error);
    return NextResponse.json(
      {
        authenticated: false,
        user: null,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }
}
