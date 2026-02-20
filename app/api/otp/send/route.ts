import { NextRequest, NextResponse } from "next/server";
import { sendOTPEmail } from "@/lib/supabase-auth";

export const runtime = "nodejs";

/**
 * Send OTP Endpoint
 * POST /api/otp/send
 * Body: { email: string }
 * 
 * Validates student email and sends 6-digit OTP via nodemailer
 * Rate limit: 3 requests per hour per email
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email required" },
        { status: 400 }
      );
    }

    // Validate email format (student emails)
    const studentEmailRegex = /^[a-z0-9]+@[a-z0-9.]+\.[a-z]{2,}$/i;
    if (!studentEmailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Send OTP with built-in rate limiting
    const otpCode = await sendOTPEmail(email);

    if (!otpCode) {
      return NextResponse.json(
        { error: "Failed to generate OTP" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "OTP sent successfully. Check your email.",
        // Only show OTP in development for testing
        ...(process.env.NODE_ENV === "development" && { otp: otpCode }),
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("[OTP Send] Error:", err);

    // Handle specific error types
    if (err.message?.includes("Too many")) {
      return NextResponse.json(
        { error: err.message },
        { status: 429 }
      );
    }

    if (err.message?.includes("not configured")) {
      return NextResponse.json(
        { error: "Email service not configured. Contact administrator." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: err.message || "Failed to send OTP" },
      { status: 500 }
    );
  }
}
