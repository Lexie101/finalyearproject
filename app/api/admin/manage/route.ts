import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    // Only super admin can create/manage admins
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is super_admin
    const body = await req.json();

    // First, verify the requesting user is a super_admin
    const { data: requester, error: requesterError } = await supabase
      .from("admins")
      .select("role")
      .eq("email", session.user.email)
      .single();

    if (requesterError || !requester || requester.role !== "super_admin") {
      return NextResponse.json(
        { error: "Only super admins can manage admins" },
        { status: 403 }
      );
    }

    const { action, email, password, role, name, phone } = body;

    if (action === "create") {
      // Create new admin or driver
      if (!email || !password || !role || !name) {
        return NextResponse.json(
          { error: "Email, password, role, and name are required" },
          { status: 400 }
        );
      }

      if (!["admin", "driver"].includes(role)) {
        return NextResponse.json(
          { error: "Role must be 'admin' or 'driver'" },
          { status: 400 }
        );
      }

      const { error } = await supabase.from("admins").insert([
        {
          email,
          password, // In production, hash this with bcrypt
          role,
          name,
          phone: phone || null,
          created_by: session.user.id || session.user.email,
        },
      ]);

      if (error) {
        if (error.code === "23505") {
          return NextResponse.json(
            { error: "Email already exists" },
            { status: 400 }
          );
        }
        console.error("Supabase insert error:", error);
        return NextResponse.json(
          { error: "Failed to create admin" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: `${role} created successfully`,
        user: { email, role, name },
      });
    } else if (action === "list") {
      // List all admins (super admin view)
      const { data, error } = await supabase
        .from("admins")
        .select("id, email, role, name, phone, created_at");

      if (error) {
        console.error("Supabase select error:", error);
        return NextResponse.json(
          { error: "Failed to fetch admins" },
          { status: 500 }
        );
      }

      return NextResponse.json({ admins: data });
    } else if (action === "delete") {
      // Delete an admin (super admin only)
      if (!email) {
        return NextResponse.json(
          { error: "Email required for deletion" },
          { status: 400 }
        );
      }

      // Prevent deletion of self
      if (email === session.user.email) {
        return NextResponse.json(
          { error: "Cannot delete your own account" },
          { status: 400 }
        );
      }

      const { error } = await supabase.from("admins").delete().eq("email", email);

      if (error) {
        console.error("Supabase delete error:", error);
        return NextResponse.json(
          { error: "Failed to delete admin" },
          { status: 500 }
        );
      }

      return NextResponse.json({ message: "Admin deleted successfully" });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Admin management error:", error);
    return NextResponse.json(
      { error: "Admin management failed" },
      { status: 500 }
    );
  }
}
