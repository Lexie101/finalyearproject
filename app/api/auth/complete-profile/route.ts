import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { verifySession } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * Complete Profile Endpoint
 * Allows new students to complete their profile after OTP verification
 * Updates: full_name, phone, is_verified
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fullName, phone } = body;

    // Verify session
    const cookieValue = req.cookies.get("cavendish_session")?.value;
    const session = await verifySession(cookieValue);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only students can complete profile
    if (session.role !== "student") {
      return NextResponse.json(
        { error: "Only students can use this endpoint" },
        { status: 403 }
      );
    }

    // Ensure userId exists
    if (!session.userId) {
      return NextResponse.json(
        { error: "Invalid session: userId missing" },
        { status: 401 }
      );
    }

    // Validation
    if (!fullName || typeof fullName !== "string" || fullName.trim().length === 0) {
      return NextResponse.json(
        { error: "Full name is required" },
        { status: 400 }
      );
    }

    if (!phone || typeof phone !== "string" || phone.trim().length === 0) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();

    // Update profile in database
    const { data, error } = await supabaseServer
      .from("profiles")
      .update({
        full_name: trimmedName,
        phone: trimmedPhone,
        is_verified: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.userId)
      .eq("email", session.email)
      .eq("role", "student")
      .select("id, email, full_name, phone, role, is_verified")
      .maybeSingle();

    if (error) {
      console.error("[Complete Profile] Update error:", error);
      return NextResponse.json(
        { error: "Failed to complete profile" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    console.info(`[Complete Profile] Profile completed for ${session.email}`);
    return NextResponse.json(
      {
        success: true,
        message: "Profile completed successfully",
        user: {
          id: data.id,
          email: data.email,
          role: data.role,
          fullName: data.full_name,
          phone: data.phone,
          isVerified: data.is_verified,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("[Complete Profile] Error:", err);
    return NextResponse.json(
      { error: err.message || "Profile completion failed" },
      { status: 500 }
    );
  }
}
