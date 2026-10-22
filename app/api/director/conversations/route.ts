import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

// GET /api/director/conversations
// Returns all conversations for authenticated user, sorted by last_message_at DESC
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Fetch user's conversations (active only by default)
    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    
    let query = supabase
      .from('director_conversations')
      .select('id, title, is_active, created_at, updated_at, last_message_at')
      .eq('user_id', user.id)
      .order('last_message_at', { ascending: false });
    
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }
    
    const { data: conversations, error } = await query;
    
    if (error) {
      console.error('[Director Conversations] Fetch error:', error);
      return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
    }
    
    return NextResponse.json({ conversations: conversations || [] });
  } catch (err) {
    console.error('[Director Conversations] GET error:', err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/director/conversations
// Creates a new conversation for authenticated user
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await req.json();
    const { title } = body;
    
    // Validate title
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    
    // Create conversation
    const { data: conversation, error } = await supabase
      .from('director_conversations')
      .insert({
        user_id: user.id,
        title: title.trim().substring(0, 255), // Enforce max length
        is_active: true
      })
      .select('id, title, is_active, created_at, updated_at, last_message_at')
      .single();
    
    if (error) {
      console.error('[Director Conversations] Create error:', error);
      return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
    }
    
    return NextResponse.json({ conversation }, { status: 201 });
  } catch (err) {
    console.error('[Director Conversations] POST error:', err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
