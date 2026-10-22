import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

// POST: Request revision on a delivery
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
    
    // Get user role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, name')
      .eq('id', user.id)
      .single();
    
    if (userError || !userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Verify user is a brand
    if (userData.role !== 'brand') {
      return NextResponse.json({ error: "Only brands can request revisions" }, { status: 403 });
    }
    
    const deliveryId = params.id;
    const body = await req.json();
    const { content, video_timestamp_seconds } = body;
    
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: "Revision content is required" }, { status: 400 });
    }
    
    // Get delivery
    const { data: delivery, error: deliveryError } = await supabase
      .from('deliveries')
      .select('*, agreements!inner(brand_id, creator_id)')
      .eq('id', deliveryId)
      .single();
    
    if (deliveryError || !delivery) {
      return NextResponse.json({ error: "Delivery not found" }, { status: 404 });
    }
    
    // Verify user is the brand who owns this agreement
    if (delivery.agreements.brand_id !== user.id) {
      return NextResponse.json({ error: "Not authorized for this delivery" }, { status: 403 });
    }
    
    // Create revision request message
    const { data: message, error: messageError } = await supabase
      .from('project_messages')
      .insert({
        agreement_id: delivery.agreement_id,
        sender_id: user.id,
        sender_name: userData.name,
        sender_role: 'brand',
        message_type: 'revision_request',
        content: content.trim(),
        delivery_version: delivery.version,
        video_timestamp_seconds: video_timestamp_seconds || null
      })
      .select()
      .single();
    
    if (messageError) {
      console.error('[Revision Request] Failed to create message:', messageError);
      return NextResponse.json({ error: "Failed to create revision request" }, { status: 500 });
    }
    
    return NextResponse.json({ 
      message: "Revision request sent",
      request: message
    });
  } catch (err) {
    console.error('[Revision Request] Error:', err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
