import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { comparePassword, hashPassword } from "@/lib/password";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { signSession } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * Driver Login Endpoint
 * Email + Password authentication for drivers
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    // Validation
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email required" },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Valid password required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Rate limiting
    const rateLimit = checkRateLimit(normalizedEmail);
    if (!rateLimit.allowed) {
      const resetMinutes = Math.ceil((rateLimit.resetTime - Date.now()) / 1000 / 60);
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${resetMinutes} minutes.` },
        { status: 429 }
      );
    }

    // Query driver user from admins table
    const { data: driverProfile, error: queryError } = await supabaseServer
      .from("admins")
      .select("id, email, name, password_hash, role")
      .ilike("email", normalizedEmail)
      .eq("role", "driver")
      .maybeSingle();

    if (queryError && queryError.code !== "PGRST116") {
      console.error("[Driver Login] Query error:", queryError);
      return NextResponse.json(
        { error: "Login failed" },
        { status: 401 }
      );
    }

    if (!driverProfile) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Verify password
    let passwordMatches = false;

    // Try bcrypt hash first (preferred)
    if (driverProfile.password_hash && driverProfile.password_hash.startsWith("$2")) {
      try {
        passwordMatches = await comparePassword(password, driverProfile.password_hash);
      } catch (err) {
        console.error("[Driver Login] Password comparison error:", err);
        return NextResponse.json(
          { error: "Login failed" },
          { status: 401 }
        );
      }
    }

    // Fallback to legacy plaintext password (DEPRECATED - for migration only)
    if (!passwordMatches && !driverProfile.password_hash?.startsWith("$2")) {
      if (driverProfile.password_hash === password) {
        passwordMatches = true;

        // Auto-migrate legacy plaintext password to bcrypt
        try {
          const newHash = await hashPassword(password);
          await supabaseServer
            .from("admins")
            .update({ password_hash: newHash })
            .eq("id", driverProfile.id);

          console.info(
            `[Driver Login] Auto-migrated password to bcrypt for user ${driverProfile.id}`
          );
        } catch (err) {
          console.warn(
            `[Driver Login] Failed to auto-migrate password for user ${driverProfile.id}:`,
            err
          );
          // Continue with login even if migration fails
        }
      }
    }

    if (!passwordMatches) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Reset rate limit on successful login
    resetRateLimit(normalizedEmail);

    // Create session token
    const sessionToken = await signSession({
      email: normalizedEmail,
      role: "driver",
      userId: driverProfile.id,
    });

    const res = NextResponse.json(
      {
        success: true,
        user: {
          id: driverProfile.id,
          email: normalizedEmail,
          role: "driver",
          name: driverProfile.name,
        },
      },
      { status: 200 }
    );

    // Set secure session cookie
    res.cookies.set("cavendish_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    console.info(`[Driver Login] Successful login for ${normalizedEmail}`);
    return res;
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("[Driver Login] Error:", err);
    return NextResponse.json(
      { error: err.message || "Login failed" },
      { status: 500 }
    );
  }
}
