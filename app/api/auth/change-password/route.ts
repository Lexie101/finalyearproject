import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { comparePassword, hashPassword } from "@/lib/password";
import { verifySession } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * Change Password Endpoint
 * Allows super admins and drivers to change their password
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { oldPassword, newPassword } = body;

    // Verify session
    const cookieValue = req.cookies.get("cavendish_session")?.value;
    const session = await verifySession(cookieValue);

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!oldPassword || !newPassword) {
      return NextResponse.json(
        { error: "Old password and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Allow only admin, super_admin and driver roles to change password
    const normalizedRole = session.role?.toLowerCase().replace("-", "_");
    if (!["admin", "super_admin", "driver"].includes(normalizedRole)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    let user;
    let selectError;

    if (normalizedRole === "driver") {
      const { data, error } = await supabaseServer
        .from("admins")
        .select("password_hash")
        .eq("email", session.email)
        .eq("role", "driver")
        .maybeSingle();
      user = data;
      selectError = error;
    } else if (normalizedRole === "admin" || normalizedRole === "super_admin") {
      const { data, error } = await supabaseServer
        .from("profiles")
        .select("password_hash")
        .eq("email", session.email)
        .in("role", ["admin", "super_admin"])
        .maybeSingle();
      user = data;
      selectError = error;
    } else {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    if (selectError && selectError.code !== "PGRST116") {
      console.error("[Change Password] Query error:", selectError);
      return NextResponse.json(
        { error: "Failed to verify identity" },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const passwordMatch = await comparePassword(oldPassword, user.password_hash || "");
    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 }
      );
    }

    // Hash and update new password
    const newHash = await hashPassword(newPassword);
    let updateError;

    if (normalizedRole === "driver") {
      const { error } = await supabaseServer
        .from("admins")
        .update({ password_hash: newHash })
        .eq("email", session.email)
        .eq("role", "driver");
      updateError = error;
    } else if (normalizedRole === "admin" || normalizedRole === "super_admin") {
      const { error } = await supabaseServer
        .from("profiles")
        .update({ password_hash: newHash })
        .eq("email", session.email)
        .in("role", ["admin", "super_admin"]);
      updateError = error;
    } else {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    if (updateError) {
      console.error("[Change Password] Update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update password" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Password updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Change Password] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
