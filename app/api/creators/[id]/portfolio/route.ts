import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

export async function POST(
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

    // Verify ownership
    const { data: existingProfile } = await supabase
      .from("creator_profiles")
      .select("user_id, portfolio")
      .eq("id", id)
      .single();

    if (!existingProfile || existingProfile.user_id !== user.id) {
      return NextResponse.json(
        { error: "Forbidden - You can only add portfolio items to your own profile" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Add new portfolio item
    const newItem = {
      id: `port_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      creatorId: id,
      title: body.title,
      description: body.description,
      mediaType: body.mediaType || "image",
      thumbnailUrl: body.thumbnailUrl,
      mediaUrl: body.mediaUrl,
      aspectRatio: body.aspectRatio || "16:9",
      contentType: body.contentType,
      styleTags: body.styleTags || [],
      toolsUsed: body.toolsUsed || [],
      workflow: body.workflow || [],
      seedLogged: body.seedLogged || false,
      commercialUse: body.commercialUse || {
        licenseTier: "Limited",
        modelIndemnity: false,
        trainingDataClean: false,
      },
      clientName: body.clientName,
      year: body.year || new Date().getFullYear(),
      featured: body.featured || false,
    };

    const currentPortfolio = (existingProfile.portfolio as any[]) || [];
    const updatedPortfolio = [...currentPortfolio, newItem];

    // Update profile with new portfolio
    const { data, error } = await supabase
      .from("creator_profiles")
      .update({
        portfolio: updatedPortfolio,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ portfolioItem: newItem, creator: data }, { status: 201 });
  } catch (error: any) {
    console.error("Error adding portfolio item:", error);
    return NextResponse.json(
      { error: error.message || "Failed to add portfolio item" },
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
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("itemId");

    if (!itemId) {
      return NextResponse.json({ error: "Portfolio item ID required" }, { status: 400 });
    }

    const supabase = createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership
    const { data: existingProfile } = await supabase
      .from("creator_profiles")
      .select("user_id, portfolio")
      .eq("id", id)
      .single();

    if (!existingProfile || existingProfile.user_id !== user.id) {
      return NextResponse.json(
        { error: "Forbidden - You can only delete your own portfolio items" },
        { status: 403 }
      );
    }

    const currentPortfolio = (existingProfile.portfolio as any[]) || [];
    const updatedPortfolio = currentPortfolio.filter((item: any) => item.id !== itemId);

    // Update profile with filtered portfolio
    const { data, error } = await supabase
      .from("creator_profiles")
      .update({
        portfolio: updatedPortfolio,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, creator: data });
  } catch (error: any) {
    console.error("Error deleting portfolio item:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete portfolio item" },
      { status: 500 }
    );
  }
}
