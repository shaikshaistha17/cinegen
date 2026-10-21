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

    const agreementId = params.id;

    // Fetch agreement with participant details
    const { data: agreement, error: agreementError } = await supabase
      .from('agreements')
      .select(`
        *,
        brief:briefs!inner(
          id,
          brand:brand_profiles!inner(id, user_id)
        ),
        creator:creator_profiles!inner(id, user_id)
      `)
      .eq('id', agreementId)
      .single();

    if (agreementError || !agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
    }

    // Verify user is participant
    const brandUserId = (agreement.brief as any).brand.user_id;
    const creatorUserId = (agreement.creator as any).user_id;

    const isCreator = user.id === creatorUserId;
    const isBrand = user.id === brandUserId;

    if (!isCreator && !isBrand) {
      return NextResponse.json(
        { error: 'Forbidden - You are not a participant in this agreement' },
        { status: 403 }
      );
    }

    // Determine which acceptance to update
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (isCreator && !agreement.creator_accepted_at) {
      updates.creator_accepted_at = new Date().toISOString();
    } else if (isBrand && !agreement.brand_accepted_at) {
      updates.brand_accepted_at = new Date().toISOString();
    } else {
      return NextResponse.json(
        { error: 'You have already accepted this agreement' },
        { status: 400 }
      );
    }

    // Update agreement
    const { data: updatedAgreement, error: updateError } = await supabase
      .from('agreements')
      .update(updates)
      .eq('id', agreementId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Check if both parties have now accepted
    const bothAccepted =
      updatedAgreement.creator_accepted_at && updatedAgreement.brand_accepted_at;

    // If both accepted, update brief status to "In Production"
    if (bothAccepted) {
      await supabase
        .from('briefs')
        .update({ status: 'In Production' })
        .eq('id', agreement.brief_id);
    }

    return NextResponse.json({
      agreement: updatedAgreement,
      bothAccepted,
    });
  } catch (error: any) {
    console.error('Error accepting agreement:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to accept agreement' },
      { status: 500 }
    );
  }
}
