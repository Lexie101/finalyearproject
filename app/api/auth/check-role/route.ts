import { NextRequest, NextResponse } from "next/server";
import { checkUserRole } from "@/lib/supabase-auth";

export const runtime = "nodejs";

/**
 * Check User Role Endpoint
 * Determines if user is student, admin, or driver
 * Used to decide which login flow to show (OTP vs Password)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email required" },
        { status: 400 }
      );
    }

    // Check user role
    const roleInfo = await checkUserRole(email);

    if (!roleInfo.exists) {
      // User doesn't exist - default to student registration flow
      return NextResponse.json(
        {
          exists: false,
          role: "student",
          message: "New student - proceed with OTP registration",
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        exists: true,
        role: roleInfo.role,
        user_id: roleInfo.user_id,
        message: `User is ${roleInfo.role}`,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("[Check Role] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to check role" },
      { status: 500 }
    );
  }
}
