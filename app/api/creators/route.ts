import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const search = searchParams.get("search") || "";
    const tools = searchParams.get("tools")?.split(",").filter(Boolean) || [];
    const specializations = searchParams.get("specializations")?.split(",").filter(Boolean) || [];
    const rateMin = parseInt(searchParams.get("rateMin") || "0");
    const rateMax = parseInt(searchParams.get("rateMax") || "999999");
    const availability = searchParams.get("availability");
    const verifiedOnly = searchParams.get("verifiedOnly") === "true";

    const supabase = createClient();
    
    // Build query
    let query = supabase
      .from("creator_profiles")
      .select("*, user:users(email, name)");

    // Apply filters
    if (search) {
      query = query.or(`handle.ilike.%${search}%,headline.ilike.%${search}%,bio.ilike.%${search}%`);
    }

    if (tools.length > 0) {
      // Filter by verified tools - JSONB contains check
      query = query.contains("verified_tools", tools.map(tool => ({ name: tool })));
    }

    if (specializations.length > 0) {
      query = query.contains("specializations", specializations);
    }

    if (rateMin > 0) {
      query = query.gte("hourly_rate_usd", rateMin);
    }

    if (rateMax < 999999) {
      query = query.lte("hourly_rate_usd", rateMax);
    }

    if (availability) {
      query = query.eq("availability", availability);
    }

    if (verifiedOnly) {
      query = query.neq("verification->badge", "Unverified");
    }

    const { data, error } = await query.order("joined_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ creators: data || [] });
  } catch (error: any) {
    console.error("Error fetching creators:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch creators" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const { data, error } = await supabase
      .from("creator_profiles")
      .insert({
        user_id: user.id,
        handle: body.handle,
        avatar_url: body.avatarUrl,
        cover_url: body.coverUrl,
        headline: body.headline,
        bio: body.bio,
        location: body.location,
        hourly_rate_inr: body.hourlyRate,
        availability: body.availability,
        specializations: body.specializations || [],
        skills: body.skills || [],
        verified_tools: body.verifiedTools || [],
        languages: body.languages || [],
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ creator: data }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating creator profile:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create creator profile" },
      { status: 500 }
    );
  }
}
