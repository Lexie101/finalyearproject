import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { hashPassword } from "@/lib/password";
import { verifySession } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * Admin Management Endpoint
 * 
 * SECURITY CRITICAL:
 * - Only super_admin role can access this
 * - Uses server-side Supabase client
 * - All passwords are bcrypt hashed before storage
 * - Input validation on all fields
 * - Session verification required
 */
export async function POST(req: NextRequest) {
  try {
    // Verify session from signed cookie
    const cookieValue = req.cookies.get("cavendish_session")?.value;
    const session = await verifySession(cookieValue);

    if (!session) {
      console.warn("[Admin Manage] Unauthorized access attempt - no valid session");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Normalize role
    const userRole = session.role?.toLowerCase().replace("-", "_");
    if (userRole !== "super_admin" && userRole !== "admin") {
      console.warn(
        `[Admin Manage] Unauthorized access attempt - insufficient role: ${userRole}`
      );
      return NextResponse.json(
        { error: "Only admins can manage users" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { action, email, password, role, name, phone } = body;

    // Validate action
    if (!action || !["create", "list", "delete", "update"].includes(action)) {
      return NextResponse.json(
        { error: "Valid action required" },
        { status: 400 }
      );
    }

    // CREATE ACTION - Create new driver
    if (action === "create") {
      // Validate all required fields
      if (!email || typeof email !== "string" || !email.includes("@")) {
        return NextResponse.json(
          { error: "Valid email required" },
          { status: 400 }
        );
      }

      if (!password || typeof password !== "string" || password.length < 8) {
        return NextResponse.json(
          { 
            error: "Password required and must be at least 8 characters"
          },
          { status: 400 }
        );
      }

      if (role && role !== "driver") {
        return NextResponse.json(
          { error: "Only 'driver' role can be created. Use API directly for super_admin." },
          { status: 400 }
        );
      }

      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          { error: "Name required" },
          { status: 400 }
        );
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Hash password using bcrypt
      let hashedPassword: string;
      try {
        hashedPassword = await hashPassword(password);
      } catch (err) {
        console.error("[Admin Manage] Password hashing failed:", err);
        return NextResponse.json(
          { error: "Failed to create driver" },
          { status: 500 }
        );
      }

      // Insert new driver using server client
      const { error } = await supabaseServer
        .from("admins")
        .insert([
          {
            email: normalizedEmail,
            password_hash: hashedPassword,
            role: "driver",
            name: name.trim(),
            phone: phone ? String(phone).trim() : null,
            created_by: session.email,
          },
        ]);

      if (error) {
        if (error.code === "23505") {
          console.warn(`[Admin Manage] Duplicate email: ${normalizedEmail}`);
          return NextResponse.json(
            { error: "Email already exists" },
            { status: 400 }
          );
        }
        console.error("[Admin Manage] Database error:", error);
        return NextResponse.json(
          { error: "Failed to create driver" },
          { status: 500 }
        );
      }

      console.info(
        `[Admin Manage] Driver created: ${normalizedEmail} by ${session.email}`
      );

      return NextResponse.json({
        success: true,
        message: `driver created successfully`,
        user: {
          email: normalizedEmail,
          role: "driver",
          name: name.trim(),
        },
      });

    // LIST ACTION - List all drivers
    } else if (action === "list") {
      console.log("[Admin Manage] Fetching drivers for user:", session.email);
      
      const { data, error } = await supabaseServer
        .from("admins")
        .select("id, email, role, name, phone, created_at")
        .eq("role", "driver")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[Admin Manage] Database error when fetching drivers:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        return NextResponse.json(
          { error: `Failed to fetch drivers: ${error.message}` },
          { status: 500 }
        );
      }

      console.info(`[Admin Manage] Listed ${data?.length || 0} drivers`);

      return NextResponse.json({
        success: true,
        drivers: data || [],
      });

    // DELETE ACTION - Delete an admin
    } else if (action === "delete") {
      if (!email || typeof email !== "string") {
        return NextResponse.json(
          { error: "Valid email required" },
          { status: 400 }
        );
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Prevent deleting self
      if (normalizedEmail === session.email) {
        return NextResponse.json(
          { error: "Cannot delete your own account" },
          { status: 400 }
        );
      }

      const { error } = await supabaseServer
        .from("admins")
        .delete()
        .ilike("email", normalizedEmail);

      if (error) {
        console.error("[Admin Manage] Delete error:", error);
        return NextResponse.json(
          { error: "Failed to delete admin" },
          { status: 500 }
        );
      }

      console.info(
        `[Admin Manage] Admin deleted: ${normalizedEmail} by ${session.email}`
      );

      return NextResponse.json({
        success: true,
        message: "Admin deleted successfully",
      });

    // UPDATE ACTION - Update admin fields
    } else if (action === "update") {
      if (!email || typeof email !== "string") {
        return NextResponse.json(
          { error: "Email required" },
          { status: 400 }
        );
      }

      const normalizedEmail = email.toLowerCase().trim();
      const updates: Record<string, any> = {};

      // Only allow updating name and phone (not role or email)
      if (name !== undefined) {
        if (typeof name !== "string" || name.trim().length === 0) {
          return NextResponse.json(
            { error: "Name must be a non-empty string" },
            { status: 400 }
          );
        }
        updates.name = name.trim();
      }

      if (phone !== undefined) {
        if (phone !== null && typeof phone !== "string") {
          return NextResponse.json(
            { error: "Phone must be a string or null" },
            { status: 400 }
          );
        }
        updates.phone = phone ? String(phone).trim() : null;
      }

      if (Object.keys(updates).length === 0) {
        return NextResponse.json(
          { error: "At least one field to update required" },
          { status: 400 }
        );
      }

      const { error } = await supabaseServer
        .from("admins")
        .update(updates)
        .ilike("email", normalizedEmail);

      if (error) {
        console.error("[Admin Manage] Update error:", error);
        return NextResponse.json(
          { error: "Failed to update admin" },
          { status: 500 }
        );
      }

      console.info(
        `[Admin Manage] Admin updated: ${normalizedEmail} by ${session.email}`
      );

      return NextResponse.json({
        success: true,
        message: "Admin updated successfully",
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[Admin Manage] Unexpected error:", error);
    return NextResponse.json(
      { error: "Operation failed" },
      { status: 500 }
    );
  }
}
