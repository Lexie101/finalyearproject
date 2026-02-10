import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
  try {
    const { driverEmail, busId, location } = await req.json();

    if (!driverEmail || !busId || !location) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get driver info from admins table
    const { data: driver, error: driverError } = await supabase
      .from("admins")
      .select("id, email, name, role")
      .eq("email", driverEmail)
      .eq("role", "driver")
      .single();

    if (driverError || !driver) {
      return NextResponse.json(
        { error: "Driver not found" },
        { status: 404 }
      );
    }

    // Store emergency event in database (optional table: emergency_alerts)
    const { error: alertError } = await supabase.from("emergency_alerts").insert({
      driver_id: driver.id,
      driver_email: driverEmail,
      driver_name: driver.name,
      bus_id: busId,
      latitude: location.latitude,
      longitude: location.longitude,
      timestamp: new Date(),
      status: "active",
    });

    if (alertError) {
      console.error("Alert storage error:", alertError);
      // Continue anyway - this is non-critical
    }

    // Get all admin/super_admin users to notify
    const { data: admins, error: adminsError } = await supabase
      .from("admins")
      .select("id, email, role")
      .in("role", ["admin", "super_admin"]);

    if (adminsError) {
      console.error("Admin fetch error:", adminsError);
    }

    // TODO: Send email/push notifications to admin users
    // This could be done via:
    // - Email via Nodemailer
    // - Push notifications via Firebase
    // - Real-time Supabase notifications
    // For now, just log
    if (admins && admins.length > 0) {
      console.log(`Emergency alert from ${driver.name} (${busId}) at ${location.latitude}, ${location.longitude}`);
      console.log(`Notifying admin users: ${admins.map(a => a.email).join(", ")}`);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Emergency alert sent to admins",
        driver: {
          name: driver.name,
          email: driver.email,
          busId,
        },
        location,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Emergency alert error:", err);
    return NextResponse.json(
      { error: "Failed to process emergency alert" },
      { status: 500 }
    );
  }
}
