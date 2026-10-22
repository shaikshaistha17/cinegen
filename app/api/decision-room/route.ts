import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

// POST: Create new decision room
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get user role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (userError || !userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Verify user is a brand
    if (userData.role !== 'brand') {
      return NextResponse.json({ error: "Only brands can create decision rooms" }, { status: 403 });
    }
    
    const body = await req.json();
    const { idea_text, requirements } = body;
    
    // Create decision room
    const { data: room, error: createError } = await supabase
      .from('decision_rooms')
      .insert({
        user_id: user.id,
        idea_text: idea_text || null,
        requirements: requirements || {},
        stage_progress: {
          idea: false,
          directions: false,
          evidence: false,
          review: false,
          passport: false
        }
      })
      .select()
      .single();
    
    if (createError) {
      console.error('[Decision Room] Failed to create:', createError);
      return NextResponse.json({ error: "Failed to create decision room" }, { status: 500 });
    }
    
    return NextResponse.json({ room });
  } catch (err) {
    console.error('[Decision Room] Error:', err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET: List user's decision rooms
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get user role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (userError || !userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Verify user is a brand
    if (userData.role !== 'brand') {
      return NextResponse.json({ error: "Only brands can access decision rooms" }, { status: 403 });
    }
    
    // Get user's decision rooms (RLS will enforce user_id match)
    const { data: rooms, error: fetchError } = await supabase
      .from('decision_rooms')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (fetchError) {
      console.error('[Decision Room] Failed to fetch:', fetchError);
      return NextResponse.json({ error: "Failed to fetch decision rooms" }, { status: 500 });
    }
    
    return NextResponse.json({ rooms: rooms || [] });
  } catch (err) {
    console.error('[Decision Room] Error:', err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
