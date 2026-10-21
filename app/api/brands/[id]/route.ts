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
      .from("brand_profiles")
      .select("*, user:users(email, name)")
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    return NextResponse.json({ brand: data });
  } catch (error: any) {
    console.error("Error fetching brand:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch brand" },
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

    // Verify ownership - user can only update their own brand profile
    const { data: existingProfile } = await supabase
      .from("brand_profiles")
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
      .from("brand_profiles")
      .update({
        company_name: body.companyName,
        website: body.website,
        industry: body.industry,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ brand: data });
  } catch (error: any) {
    console.error("Error updating brand:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update brand" },
      { status: 500 }
    );
  }
}
