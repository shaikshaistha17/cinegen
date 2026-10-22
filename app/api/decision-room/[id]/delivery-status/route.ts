import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

// GET: Fetch delivery inspection status
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
    
    // Check if room has linked brief
    if (!room.linked_brief_id) {
      return NextResponse.json({ 
        status: 'no_brief',
        message: 'No brief linked to this decision room'
      });
    }
    
    // Get brief and check for agreement
    const { data: brief, error: briefError } = await supabase
      .from('briefs')
      .select('id, status')
      .eq('id', room.linked_brief_id)
      .single();
    
    if (briefError || !brief) {
      return NextResponse.json({ 
        status: 'brief_not_found',
        message: 'Linked brief not found'
      });
    }
    
    // Get agreement for this brief
    const { data: agreements, error: agreementError } = await supabase
      .from('agreements')
      .select('id, status, creator_id, deliverables, price')
      .eq('brief_id', brief.id)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (agreementError || !agreements || agreements.length === 0) {
      return NextResponse.json({ 
        status: 'no_agreement',
        message: 'No agreement found for this brief'
      });
    }
    
    const agreement = agreements[0];
    
    // Get latest delivery for this agreement
    const { data: deliveries, error: deliveryError } = await supabase
      .from('deliveries')
      .select('*')
      .eq('agreement_id', agreement.id)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (deliveryError) {
      console.error('[Delivery Status] Failed to fetch deliveries:', deliveryError);
      return NextResponse.json({ error: "Failed to fetch deliveries" }, { status: 500 });
    }
    
    if (!deliveries || deliveries.length === 0) {
      return NextResponse.json({
        status: 'no_delivery',
        message: 'No delivery submitted yet',
        agreement: {
          id: agreement.id,
          status: agreement.status,
          creator_id: agreement.creator_id
        }
      });
    }
    
    const delivery = deliveries[0];
    
    return NextResponse.json({
      status: 'delivery_found',
      agreement: {
        id: agreement.id,
        status: agreement.status,
        creator_id: agreement.creator_id,
        deliverables: agreement.deliverables
      },
      delivery: {
        id: delivery.id,
        version: delivery.version,
        file_name: delivery.file_name,
        file_size_bytes: delivery.file_size_bytes,
        inspection_status: delivery.inspection_status,
        inspection_results: delivery.inspection_results,
        inspected_at: delivery.inspected_at,
        brand_approved_at: delivery.brand_approved_at,
        created_at: delivery.created_at
      }
    });
  } catch (err) {
    console.error('[Delivery Status] Error:', err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
