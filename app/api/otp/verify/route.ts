import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, otp } = body;

    if (!email || !otp) {
      return NextResponse.json({ error: "Email and OTP required" }, { status: 400 });
    }

    // Query latest unused OTP for this email
    const { data, error } = await supabase
      .from("otps")
      .select("id, code, expires_at, used")
      .eq("email", email)
      .eq("used", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Supabase OTP select error:", error);
      return NextResponse.json({ error: "Failed to verify OTP" }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "No OTP found for this email" }, { status: 400 });
    }

    const now = new Date();
    const expiresAt = new Date(data.expires_at);

    if (now > expiresAt) {
      // mark used/expired
      await supabase.from("otps").update({ used: true }).eq("id", data.id);
      return NextResponse.json({ error: "OTP expired" }, { status: 400 });
    }

    if (data.code !== otp) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    }

    // Mark OTP as used
    await supabase.from("otps").update({ used: true }).eq("id", data.id);

    // Optionally upsert user record
    const upsertUser = await supabase.from("users").upsert({ email }, { onConflict: ["email"] });
    if (upsertUser.error) console.warn("User upsert warning:", upsertUser.error);

    return NextResponse.json({ message: "OTP verified successfully", verified: true });
  } catch (error) {
    console.error("OTP verify error:", error);
    return NextResponse.json({ error: "Failed to verify OTP" }, { status: 500 });
  }
}
