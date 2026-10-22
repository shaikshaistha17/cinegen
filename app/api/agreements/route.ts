import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { proposalId } = body;

    if (!proposalId) {
      return NextResponse.json(
        { error: 'Missing required field: proposalId' },
        { status: 400 }
      );
    }

    // Fetch proposal with brief data
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .select(`
        *,
        brief:briefs!inner(
          *,
          brand:brand_profiles!inner(id, user_id, company_name)
        ),
        creator:creator_profiles!inner(id, user_id, handle)
      `)
      .eq('id', proposalId)
      .single();

    if (proposalError || !proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    // Verify proposal is accepted
    if (proposal.status !== 'Accepted') {
      return NextResponse.json(
        { error: 'Agreement can only be created from accepted proposals' },
        { status: 400 }
      );
    }

    // Verify user is participant (brand or creator)
    const brandUserId = (proposal.brief as any).brand.user_id;
    const creatorUserId = (proposal.creator as any).user_id;

    if (user.id !== brandUserId && user.id !== creatorUserId) {
      return NextResponse.json(
        { error: 'Forbidden - You are not a participant in this proposal' },
        { status: 403 }
      );
    }

    // Check if agreement already exists
    const { data: existingAgreement } = await supabase
      .from('agreements')
      .select('id')
      .eq('proposal_id', proposalId)
      .single();

    if (existingAgreement) {
      return NextResponse.json(
        { error: 'Agreement already exists for this proposal' },
        { status: 400 }
      );
    }

    // Extract deliverables from brief
    const brief = proposal.brief as any;
    const deliverables = {
      contentType: brief.content_type,
      aspectRatios: brief.aspect_ratios,
      durationSeconds: brief.duration_seconds,
      resolution: brief.resolution,
      quantity: brief.quantity,
    };

    // Extract milestones from proposal
    const milestones = {
      timelineDays: proposal.timeline_days,
    };

    // Extract usage requirements from brief
    const usageRequirements = brief.commercial_use;

    // Create agreement
    const { data: agreement, error: agreementError } = await supabase
      .from('agreements')
      .insert({
        brief_id: proposal.brief_id,
        proposal_id: proposalId,
        creator_id: proposal.creator_id,
        brand_id: brief.brand_id,
        version: 1,
        deliverables,
        price: proposal.price,
        currency: 'INR',
        milestones,
        included_revisions: 2,
        usage_requirements: usageRequirements,
        creator_accepted_at: null,
        brand_accepted_at: null,
      })
      .select()
      .single();

    if (agreementError) {
      throw agreementError;
    }

    return NextResponse.json({ agreement }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating agreement:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create agreement' },
      { status: 500 }
    );
  }
}
