import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const deliveryId = params.id;

    // Fetch delivery with agreement details
    const { data: delivery, error: deliveryError } = await supabase
      .from('deliveries')
      .select(`
        *,
        agreement:agreements!inner(
          id,
          brand_id,
          brief_id,
          deliverables,
          brand:brand_profiles!inner(user_id)
        )
      `)
      .eq('id', deliveryId)
      .single();

    if (deliveryError || !delivery) {
      return NextResponse.json(
        { error: 'Delivery not found' },
        { status: 404 }
      );
    }

    // Verify user is brand (only brand can approve)
    const brandUserId = (delivery as any).agreement.brand.user_id;
    const isBrand = user.id === brandUserId;

    if (!isBrand) {
      return NextResponse.json(
        { error: 'Forbidden - Only the brand can approve deliveries' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { approvalNotes, overrideReason } = body;

    // Check inspection status - block failed deliveries without override
    if (delivery.inspection_status === 'fail' && !overrideReason) {
      return NextResponse.json(
        { error: 'Cannot approve failed delivery without override reason' },
        { status: 400 }
      );
    }

    // Build approval notes
    const finalNotes = overrideReason
      ? `${approvalNotes || ''}\n\nOverride reason: ${overrideReason}`.trim()
      : approvalNotes || null;

    // Update delivery with approval
    const { data: updatedDelivery, error: updateError } = await supabase
      .from('deliveries')
      .update({
        brand_approved_at: new Date().toISOString(),
        approval_notes: finalNotes,
      })
      .eq('id', deliveryId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Check if this is the final deliverable
    const agreement = (delivery as any).agreement;
    const expectedQuantity = agreement.deliverables.quantity || 1;
    
    if (delivery.version >= expectedQuantity) {
      // Update brief status to 'Delivered'
      await supabase
        .from('briefs')
        .update({ status: 'Delivered' })
        .eq('id', agreement.brief_id);
    }

    return NextResponse.json({ delivery: updatedDelivery });
  } catch (error: any) {
    console.error('Error approving delivery:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to approve delivery' },
      { status: 500 }
    );
  }
}
