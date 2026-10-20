import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is a creator
    const { data: creatorProfile, error: creatorError } = await supabase
      .from("creator_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (creatorError || !creatorProfile) {
      return NextResponse.json(
        { error: "Only creators can create services" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Insert service
    const { data, error } = await supabase
      .from("creator_services")
      .insert({
        creator_id: creatorProfile.id,
        title: body.title,
        description: body.description,
        skills: body.skills || [],
        price_range: body.priceRange,
        delivery_time: body.deliveryTime,
        portfolio_items: body.portfolioItems || [],
        is_active: body.isActive !== undefined ? body.isActive : true,
      })
      .select()
      .single();

    if (error) throw error;

    // Map snake_case to camelCase
    const service = {
      id: data.id,
      creatorId: data.creator_id,
      title: data.title,
      description: data.description,
      skills: data.skills,
      priceRange: data.price_range,
      deliveryTime: data.delivery_time,
      portfolioItems: data.portfolio_items,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return NextResponse.json({ service }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating service:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create service" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const creatorId = searchParams.get("creatorId");
    const skills = searchParams.get("skills")?.split(",").filter(Boolean) || [];
    const priceRange = searchParams.get("priceRange");
    const deliveryTime = searchParams.get("deliveryTime");
    const search = searchParams.get("search") || "";
    const isActive = searchParams.get("isActive") !== "false"; // Default true
    const sort = searchParams.get("sort") || "created_at";

    const supabase = createClient();

    // Build query with creator details join
    let query = supabase
      .from("creator_services")
      .select(
        `
        *,
        creator:creator_profiles(
          id,
          handle,
          avatar_url,
          user:users(name)
        )
      `
      );

    // Apply filters
    if (creatorId) {
      query = query.eq("creator_id", creatorId);
    }

    if (skills.length > 0) {
      query = query.contains("skills", skills);
    }

    if (priceRange) {
      query = query.eq("price_range", priceRange);
    }

    if (deliveryTime) {
      query = query.eq("delivery_time", deliveryTime);
    }

    if (search) {
      query = query.or(
        `title.ilike.%${search}%,description.ilike.%${search}%`
      );
    }

    if (isActive) {
      query = query.eq("is_active", true);
    }

    // Sort
    query = query.order(sort, { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    // Map to camelCase and flatten creator info
    const services = (data || []).map((item: any) => ({
      id: item.id,
      creatorId: item.creator_id,
      creatorName: item.creator?.user?.name,
      creatorAvatar: item.creator?.avatar_url,
      creatorHandle: item.creator?.handle,
      title: item.title,
      description: item.description,
      skills: item.skills,
      priceRange: item.price_range,
      deliveryTime: item.delivery_time,
      portfolioItems: item.portfolio_items,
      isActive: item.is_active,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));

    return NextResponse.json({ services });
  } catch (error: any) {
    console.error("Error fetching services:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch services" },
      { status: 500 }
    );
  }
}
