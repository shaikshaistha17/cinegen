import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

// POST: Approve delivery
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
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (userError || !userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Verify user is a brand
    if (userData.role !== 'brand') {
      return NextResponse.json({ error: "Only brands can approve deliveries" }, { status: 403 });
    }
    
    const deliveryId = params.id;
    const body = await req.json();
    const { approval_notes, waive_failed_checks } = body;
    
    // Get delivery
    const { data: delivery, error: deliveryError } = await supabase
      .from('deliveries')
      .select('*, agreements!inner(id, brand_id, status)')
      .eq('id', deliveryId)
      .single();
    
    if (deliveryError || !delivery) {
      return NextResponse.json({ error: "Delivery not found" }, { status: 404 });
    }
    
    // Verify user is the brand who owns this agreement
    if (delivery.agreements.brand_id !== user.id) {
      return NextResponse.json({ error: "Not authorized for this delivery" }, { status: 403 });
    }
    
    // Check if delivery already approved
    if (delivery.brand_approved_at) {
      return NextResponse.json({ error: "Delivery already approved" }, { status: 400 });
    }
    
    // Check inspection status
    if (delivery.inspection_status === 'fail' && !waive_failed_checks) {
      return NextResponse.json({ 
        error: "Delivery failed inspection checks. Set waive_failed_checks=true to approve anyway.",
        inspection_results: delivery.inspection_results
      }, { status: 400 });
    }
    
    // Update delivery with approval
    const { data: updatedDelivery, error: updateError } = await supabase
      .from('deliveries')
      .update({
        brand_approved_at: new Date().toISOString(),
        approval_notes: approval_notes || null
      })
      .eq('id', deliveryId)
      .select()
      .single();
    
    if (updateError) {
      console.error('[Approve Delivery] Failed to update:', updateError);
      return NextResponse.json({ error: "Failed to approve delivery" }, { status: 500 });
    }
    
    // Update agreement status to completed
    const { error: agreementError } = await supabase
      .from('agreements')
      .update({ status: 'completed' })
      .eq('id', delivery.agreement_id);
    
    if (agreementError) {
      console.error('[Approve Delivery] Failed to update agreement:', agreementError);
      // Continue - delivery is approved even if agreement update fails
    }
    
    return NextResponse.json({ 
      message: "Delivery approved",
      delivery: updatedDelivery
    });
  } catch (err) {
    console.error('[Approve Delivery] Error:', err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
