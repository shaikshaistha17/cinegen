import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

// GET: Fetch specific decision room
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const roomId = params.id;
    
    // Get decision room (RLS will enforce user ownership)
    const { data: room, error: fetchError } = await supabase
      .from('decision_rooms')
      .select('*')
      .eq('id', roomId)
      .single();
    
    if (fetchError || !room) {
      return NextResponse.json({ error: "Decision room not found" }, { status: 404 });
    }
    
    return NextResponse.json({ room });
  } catch (err) {
    console.error('[Decision Room] Error:', err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH: Update decision room
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const roomId = params.id;
    const body = await req.json();
    
    // Extract allowed fields
    const updates: any = {};
    if (body.idea_text !== undefined) updates.idea_text = body.idea_text;
    if (body.requirements !== undefined) updates.requirements = body.requirements;
    if (body.selected_direction !== undefined) updates.selected_direction = body.selected_direction;
    if (body.selected_creator_id !== undefined) updates.selected_creator_id = body.selected_creator_id;
    if (body.linked_brief_id !== undefined) updates.linked_brief_id = body.linked_brief_id;
    if (body.stage_progress !== undefined) updates.stage_progress = body.stage_progress;
    
    // Update decision room (RLS will enforce user ownership)
    const { data: room, error: updateError } = await supabase
      .from('decision_rooms')
      .update(updates)
      .eq('id', roomId)
      .select()
      .single();
    
    if (updateError) {
      console.error('[Decision Room] Failed to update:', updateError);
      return NextResponse.json({ error: "Failed to update decision room" }, { status: 500 });
    }
    
    if (!room) {
      return NextResponse.json({ error: "Decision room not found" }, { status: 404 });
    }
    
    return NextResponse.json({ room });
  } catch (err) {
    console.error('[Decision Room] Error:', err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
