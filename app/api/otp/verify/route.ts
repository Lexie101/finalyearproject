import { NextRequest, NextResponse } from "next/server";
import { verifyOTPCode, createStudentProfile } from "@/lib/supabase-auth";
import { signSession } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * Verify OTP Endpoint
 * POST /api/otp/verify
 * Body: { email: string, otp: string }
 * 
 * Validates OTP code, creates student profile, and sets session
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, otp } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email required" },
        { status: 400 }
      );
    }

    if (!otp || typeof otp !== "string" || otp.length !== 6) {
      return NextResponse.json(
        { error: "Valid 6-digit OTP required" },
        { status: 400 }
      );
    }

    // Verify OTP code against database
    const isValid = await verifyOTPCode(email, otp);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid or expired OTP" },
        { status: 401 }
      );
    }

    // Create initial student profile
    const profile = await createStudentProfile(email);

    if (!profile) {
      return NextResponse.json(
        { error: "Failed to create profile" },
        { status: 500 }
      );
    }

    // Create session token for student
    const sessionToken = await signSession({
      email,
      userId: profile.id,
      role: "student",
    });

    // Create response with session cookie
    const response = NextResponse.json(
      {
        success: true,
        message: "OTP verified. Welcome!",
        user: {
          id: profile.id,
          email: profile.email,
          role: profile.role,
        },
      },
      { status: 200 }
    );

    // Set secure session cookie
    response.cookies.set({
      name: "cavendish_session",
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("[OTP Verify] Error:", error);

    return NextResponse.json(
      { error: error?.message || "Failed to verify OTP" },
      { status: 500 }
    );
  }
}
