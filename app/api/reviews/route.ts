import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const creatorId = searchParams.get("creatorId");

    if (!creatorId) {
      return NextResponse.json(
        { error: "creatorId is required" },
        { status: 400 }
      );
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from("reviews")
      .select("*, brand:brand_profiles(company_name)")
      .eq("creator_id", creatorId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ reviews: data || [] });
  } catch (error: any) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch reviews" },
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
    const { briefId, creatorId, rating, comment } = body;

    // Validate input
    if (!briefId || !creatorId || !rating) {
      return NextResponse.json(
        { error: "briefId, creatorId, and rating are required" },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    // Get brand profile
    const { data: brandProfile, error: brandError } = await supabase
      .from("brand_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (brandError) {
      return NextResponse.json(
        { error: "Brand profile not found" },
        { status: 404 }
      );
    }

    // Check if brand hired this creator for this brief
    const { data: proposal, error: proposalError } = await supabase
      .from("proposals")
      .select("id")
      .eq("brief_id", briefId)
      .eq("creator_id", creatorId)
      .eq("status", "Accepted")
      .single();

    if (proposalError || !proposal) {
      return NextResponse.json(
        { error: "You can only review creators you have hired" },
        { status: 403 }
      );
    }

    // Check if brand already reviewed this creator for this brief
    const { data: existing, error: existingError } = await supabase
      .from("reviews")
      .select("id")
      .eq("brief_id", briefId)
      .eq("creator_id", creatorId)
      .eq("brand_id", brandProfile.id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "You have already reviewed this creator for this brief" },
        { status: 409 }
      );
    }

    // Submit review
    const { data, error } = await supabase
      .from("reviews")
      .insert({
        brief_id: briefId,
        creator_id: creatorId,
        brand_id: brandProfile.id,
        rating,
        comment: comment || "",
      })
      .select()
      .single();

    if (error) throw error;

    // Update creator's average rating
    const { data: reviews } = await supabase
      .from("reviews")
      .select("rating")
      .eq("creator_id", creatorId);

    if (reviews && reviews.length > 0) {
      const sum = reviews.reduce((acc: number, r: any) => acc + r.rating, 0);
      const average = sum / reviews.length;

      // Update creator profile stats
      const { data: profile } = await supabase
        .from("creator_profiles")
        .select("stats")
        .eq("id", creatorId)
        .single();

      if (profile) {
        const updatedStats = {
          ...profile.stats,
          avgRating: average,
        };
        await supabase
          .from("creator_profiles")
          .update({ stats: updatedStats })
          .eq("id", creatorId);
      }
    }

    return NextResponse.json({ review: data }, { status: 201 });
  } catch (error: any) {
    console.error("Error submitting review:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit review" },
      { status: 500 }
    );
  }
}
