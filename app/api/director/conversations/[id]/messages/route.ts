import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

// POST /api/director/conversations/[id]/messages
// Adds a message to the conversation (idempotent using deduplication)
export async function POST(
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
    const { role, content, input_source, idempotency_key } = body;
    
    // Validate inputs
    if (!role || !['user', 'assistant'].includes(role)) {
      return NextResponse.json({ error: "role must be 'user' or 'assistant'" }, { status: 400 });
    }
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }
    if (input_source && !['voice', 'text'].includes(input_source)) {
      return NextResponse.json({ error: "input_source must be 'voice' or 'text'" }, { status: 400 });
    }
    
    // Verify conversation exists and user owns it (RLS check)
    const { data: conversation, error: convError } = await supabase
      .from('director_conversations')
      .select('id')
      .eq('id', conversationId)
      .single();
    
    if (convError) {
      if (convError.code === 'PGRST116') {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }
      console.error('[Director Messages] Conversation check error:', convError);
      return NextResponse.json({ error: "Failed to verify conversation" }, { status: 500 });
    }
    
    // Idempotency check: if idempotency_key provided, check for existing message
    if (idempotency_key) {
      // Check if identical message exists within last 5 seconds
      const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
      const { data: existing } = await supabase
        .from('director_messages')
        .select('id, role, content, input_source, status, created_at')
        .eq('conversation_id', conversationId)
        .eq('role', role)
        .eq('content', content.trim())
        .gte('created_at', fiveSecondsAgo)
        .limit(1)
        .single();
      
      if (existing) {
        // Idempotent: return existing message
        return NextResponse.json({ message: existing, idempotent: true }, { status: 200 });
      }
    }
    
    // Insert message (RLS ensures user owns conversation)
    const { data: message, error: msgError } = await supabase
      .from('director_messages')
      .insert({
        conversation_id: conversationId,
        role,
        content: content.trim(),
        input_source: input_source || null,
        status: 'delivered'
      })
      .select('id, role, content, input_source, status, created_at')
      .single();
    
    if (msgError) {
      console.error('[Director Messages] Insert error:', msgError);
      return NextResponse.json({ error: "Failed to save message" }, { status: 500 });
    }
    
    return NextResponse.json({ message, idempotent: false }, { status: 201 });
  } catch (err) {
    console.error('[Director Messages] POST error:', err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
