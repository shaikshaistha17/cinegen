import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const supabase = createClient();

    const { data, error } = await supabase
      .from("creator_profiles")
      .select("*, user:users(email, name)")
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 });
    }

    return NextResponse.json({ creator: data });
  } catch (error: any) {
    console.error("Error fetching creator:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch creator" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const supabase = createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership - user can only update their own profile
    const { data: existingProfile } = await supabase
      .from("creator_profiles")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!existingProfile || existingProfile.user_id !== user.id) {
      return NextResponse.json(
        { error: "Forbidden - You can only edit your own profile" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Update profile with RLS enforcing ownership
    const { data, error } = await supabase
      .from("creator_profiles")
      .update({
        handle: body.handle,
        avatar_url: body.avatarUrl,
        cover_url: body.coverUrl,
        headline: body.headline,
        bio: body.bio,
        location: body.location,
        hourly_rate_usd: body.hourlyRateUsd,
        availability: body.availability,
        specializations: body.specializations,
        skills: body.skills,
        verified_tools: body.verifiedTools,
        languages: body.languages,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ creator: data });
  } catch (error: any) {
    console.error("Error updating creator:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update creator" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Partial update - same as PUT but allows partial fields
  return PUT(request, { params });
}
