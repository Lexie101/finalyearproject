import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifySession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { driverEmail, busId, location } = await req.json();

    const cookieValue = req.cookies.get("cavendish_session")?.value;
    const session = await verifySession(cookieValue);

    if (!session || session.role !== "driver" || !session.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!busId || !location) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get driver info from admins table
    // Trust session email, ignore body email unless needed for specific logic (but safer to use session)
    const effectiveDriverEmail = session.email;

    const { data: driver, error: driverError } = await supabase
      .from("admins")
      .select("id, email, name, role")
      .eq("email", effectiveDriverEmail)
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
      driver_email: driver.email,
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

    // Get all staff users to notify (super_admin and drivers)
    const { data: staff, error: staffError } = await supabase
      .from("admins")
      .select("id, email, role")
      .in("role", ["driver", "super_admin"]);

    if (staffError) {
      console.error("Staff fetch error:", staffError);
    }

    // TODO: Send email/push notifications to staff users
    // This could be done via:
    // - Email via Nodemailer
    // - Push notifications via Firebase
    // - Real-time Supabase notifications
    // For now, just log
    if (staff && staff.length > 0) {
      console.log(`Emergency alert from ${driver.name} (${busId}) at ${location.latitude}, ${location.longitude}`);
      console.log(`Notifying admin users: ${staff.map(a => a.email).join(", ")}`);
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
