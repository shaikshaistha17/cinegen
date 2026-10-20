import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const supabase = createClient();

    // Fetch service with creator details
    const { data, error } = await supabase
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
      )
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // Map to camelCase
    const service = {
      id: data.id,
      creatorId: data.creator_id,
      creatorName: data.creator?.user?.name,
      creatorAvatar: data.creator?.avatar_url,
      creatorHandle: data.creator?.handle,
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

    return NextResponse.json({ service });
  } catch (error: any) {
    console.error("Error fetching service:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch service" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check ownership
    const { data: service, error: fetchError } = await supabase
      .from("creator_services")
      .select("creator_id, creator:creator_profiles(user_id)")
      .eq("id", id)
      .single();

    if (fetchError || !service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    if ((service.creator as any)?.user_id !== user.id) {
      return NextResponse.json(
        { error: "You can only update your own services" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Update service
    const updateData: any = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.skills !== undefined) updateData.skills = body.skills;
    if (body.priceRange !== undefined) updateData.price_range = body.priceRange;
    if (body.deliveryTime !== undefined) updateData.delivery_time = body.deliveryTime;
    if (body.portfolioItems !== undefined) updateData.portfolio_items = body.portfolioItems;
    if (body.isActive !== undefined) updateData.is_active = body.isActive;

    const { data, error } = await supabase
      .from("creator_services")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Map to camelCase
    const updatedService = {
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

    return NextResponse.json({ service: updatedService });
  } catch (error: any) {
    console.error("Error updating service:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update service" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check ownership
    const { data: service, error: fetchError } = await supabase
      .from("creator_services")
      .select("creator_id, creator:creator_profiles(user_id)")
      .eq("id", id)
      .single();

    if (fetchError || !service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    if ((service.creator as any)?.user_id !== user.id) {
      return NextResponse.json(
        { error: "You can only delete your own services" },
        { status: 403 }
      );
    }

    // Delete service
    const { error } = await supabase.from("creator_services").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting service:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete service" },
      { status: 500 }
    );
  }
}
