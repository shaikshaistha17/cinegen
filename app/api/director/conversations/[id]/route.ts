import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

// GET /api/director/conversations/[id]
// Returns conversation with all messages
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
    
    const conversationId = params.id;
    
    // Fetch conversation (RLS ensures user owns it)
    const { data: conversation, error: convError } = await supabase
      .from('director_conversations')
      .select('id, title, is_active, created_at, updated_at, last_message_at')
      .eq('id', conversationId)
      .single();
    
    if (convError) {
      if (convError.code === 'PGRST116') {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }
      console.error('[Director Conversation] Fetch error:', convError);
      return NextResponse.json({ error: "Failed to fetch conversation" }, { status: 500 });
    }
    
    // Fetch messages (RLS ensures user owns conversation)
    const { data: messages, error: msgError } = await supabase
      .from('director_messages')
      .select('id, role, content, input_source, status, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    
    if (msgError) {
      console.error('[Director Messages] Fetch error:', msgError);
      return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
    }
    
    return NextResponse.json({ 
      conversation,
      messages: messages || []
    });
  } catch (err) {
    console.error('[Director Conversation] GET error:', err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/director/conversations/[id]
// Update conversation metadata (title, is_active)
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
    
    const conversationId = params.id;
    const body = await req.json();
    const { title, is_active } = body;
    
    // Build update object with only provided fields
    const updates: any = {};
    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        return NextResponse.json({ error: "title must be non-empty string" }, { status: 400 });
      }
      updates.title = title.trim().substring(0, 255);
    }
    if (is_active !== undefined) {
      if (typeof is_active !== 'boolean') {
        return NextResponse.json({ error: "is_active must be boolean" }, { status: 400 });
      }
      updates.is_active = is_active;
    }
    
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }
    
    // Update conversation (RLS ensures user owns it)
    const { data: conversation, error } = await supabase
      .from('director_conversations')
      .update(updates)
      .eq('id', conversationId)
      .select('id, title, is_active, created_at, updated_at, last_message_at')
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }
      console.error('[Director Conversation] Update error:', error);
      return NextResponse.json({ error: "Failed to update conversation" }, { status: 500 });
    }
    
    return NextResponse.json({ conversation });
  } catch (err) {
    console.error('[Director Conversation] PATCH error:', err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/director/conversations/[id]
// Soft-delete conversation (set is_active = false)
export async function DELETE(
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
    
    const conversationId = params.id;
    
    // Soft delete: set is_active = false (RLS ensures user owns it)
    const { error } = await supabase
      .from('director_conversations')
      .update({ is_active: false })
      .eq('id', conversationId);
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }
      console.error('[Director Conversation] Delete error:', error);
      return NextResponse.json({ error: "Failed to delete conversation" }, { status: 500 });
    }
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('[Director Conversation] DELETE error:', err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
