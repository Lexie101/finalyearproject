import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // [Location Update] Verify signed session cookie
    const cookie = req.cookies.get("cavendish_session")?.value;
    const session = await verifySession(cookie);

    if (!session?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { latitude, longitude, speed, heading, busId } = body;

    if (latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: "Latitude and longitude required" },
        { status: 400 }
      );
    }

    const userId = session.email;

    // Rate limiting for location updates (lenient - allow up to 5 per 10 minutes)
    try {
      const { checkRateLimit } = await import("@/lib/rate-limit");
      const status = checkRateLimit(userId);
      
      if (!status.allowed) {
        const retryAfter = Math.ceil((status.resetTime - Date.now()) / 1000);
        return NextResponse.json(
          { error: "Location updates rate limited. Try again later." },
          { status: 429, headers: { "Retry-After": retryAfter.toString() } }
        );
      }
    } catch (e) {
      console.warn("[Location Update] Rate limiter unavailable:", e);
    }

    const { error } = await supabase.from("bus-locations").insert([
      {
        user_id: userId,
        lat: latitude,
        lng: longitude,
        speed: speed || 0,
        heading: heading || 0,
        bus_id: busId,
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.error("[Location Update] Supabase insert error:", error);
      return NextResponse.json({ error: "Failed to store location" }, { status: 500 });
    }

    return NextResponse.json({ message: "Location updated", stored: true });
  } catch (error) {
    console.error("[Location Update] Error:", error);
    return NextResponse.json({ error: "Failed to update location" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    // [Location Get] Verify signed session cookie
    const cookie = req.cookies.get("cavendish_session")?.value;
    const session = await verifySession(cookie);

    if (!session?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch latest locations (simple approach: latest N entries)
    const { data, error } = await supabase
      .from("bus-locations")
      .select("id, user_id, lat, lng, speed, heading, bus_id, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("[Location Get] Supabase fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch locations" }, { status: 500 });
    }

    return NextResponse.json({ locations: data || [], count: (data || []).length });
  } catch (error) {
    console.error("[Location Get] Error:", error);
    return NextResponse.json({ error: "Failed to get locations" }, { status: 500 });
  }
}
