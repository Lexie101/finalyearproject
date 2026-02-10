import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, role } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    if (!["admin", "driver", "super_admin"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    // Query the admins table for matching credentials
    // Support both university emails and personal emails
    const { data, error } = await supabase
      .from("admins")
      .select("id, email, password, role, name")
      .eq("email", email)
      .single();

    if (error || !data) {
      console.warn("Admin lookup error:", error);
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Check if role matches (or super_admin can login with any admin role)
    if (data.role === "super_admin" && role === "admin") {
      // Allow super_admin to login as admin
    } else if (data.role !== role) {
      return NextResponse.json(
        { error: "Invalid role for this account" },
        { status: 401 }
      );
    }

    // Simple password comparison (in production, use bcrypt)
    if (data.password !== password) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      message: `${data.role} login successful`,
      verified: true,
      user: {
        email: data.email,
        role: data.role,
        name: data.name,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}
