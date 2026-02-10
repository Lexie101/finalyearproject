import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import sendOtpEmail from "@/lib/nodemailer";
import { checkRateLimit } from "@/lib/rateLimiter";

const RATE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_MAX = 3; // max sends per window

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    // Validate student email format: 2 or 3 letters (initials) followed by either 6 or 8 digits
    const studentRegex = /^[A-Za-z]{2,3}(?:\d{6}|\d{8})@students\.cavendish\.co\.zm$/;
    if (!studentRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid Cavendish student email" },
        { status: 400 }
      );
    }

    // Rate limiting by email using Redis
    const rlKey = `otp:${email.toLowerCase()}`;
    try {
      const rl = await checkRateLimit(rlKey, RATE_WINDOW_MS, RATE_MAX);
      if (!rl.allowed) {
        return NextResponse.json({ error: "Too many OTP requests. Try again later." }, { status: 429 });
      }
    } catch (e) {
      console.warn("Rate limiter error, falling back to allowed:", e);
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Persist OTP to Supabase
    const { error: insertError } = await supabase.from("otps").insert([
      { email, code: otp, expires_at: expiresAt, used: false },
    ]);

    if (insertError) {
      console.error("Supabase OTP insert error:", insertError);
      return NextResponse.json({ error: "Failed to store OTP" }, { status: 500 });
    }

    // Send OTP via SMTP (nodemailer)
    try {
      await sendOtpEmail(email, otp);
    } catch (mailErr) {
      console.error("Failed to send OTP email:", mailErr);
      // Continue, but warn
    }

    return NextResponse.json({
      message: "OTP sent to your email",
      ...(process.env.NODE_ENV === "development" && { otp }),
    });
  } catch (error) {
    console.error("OTP send error:", error);
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}
