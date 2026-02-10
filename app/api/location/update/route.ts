import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
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

    const userId = session.user.id || session.user.email;

    // Server-side rate limiting for location updates (per user)
    try {
      const rlKey = `loc:${userId}`;
      const { checkRateLimit } = await import("@/lib/rateLimiter");
      const rl = await checkRateLimit(rlKey, 60 * 1000, 120); // 120 updates per minute
      if (!rl.allowed) {
        return NextResponse.json({ error: "Too many location updates. Slow down." }, { status: 429 });
      }
    } catch (e) {
      console.warn("Location rate limiter unavailable:", e);
    }

    const { error } = await supabase.from("locations").insert([
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
      console.error("Supabase insert location error:", error);
      return NextResponse.json({ error: "Failed to store location" }, { status: 500 });
    }

    return NextResponse.json({ message: "Location updated", stored: true });
  } catch (error) {
    console.error("Location update error:", error);
    return NextResponse.json({ error: "Failed to update location" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch latest location per bus/user (simple approach: latest N entries)
    const { data, error } = await supabase
      .from("locations")
      .select("id, user_id, lat, lng, speed, heading, bus_id, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Supabase fetch locations error:", error);
      return NextResponse.json({ error: "Failed to fetch locations" }, { status: 500 });
    }

    return NextResponse.json({ locations: data || [], count: (data || []).length });
  } catch (error) {
    console.error("Get locations error:", error);
    return NextResponse.json({ error: "Failed to get locations" }, { status: 500 });
  }
}
