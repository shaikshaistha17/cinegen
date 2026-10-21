import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    
    const briefId = searchParams.get('briefId');
    const creatorId = searchParams.get('creatorId');

    let query = supabase
      .from('proposals')
      .select(`
        *,
        brief:briefs!inner(
          id,
          campaign_title,
          status,
          brand_id,
          brand:brand_profiles!inner(company_name)
        ),
        creator:creator_profiles!inner(
          id,
          handle,
          headline,
          avatar_url,
          user:users!inner(name)
        )
      `);

    if (briefId) {
      query = query.eq('brief_id', briefId);
    }
    
    if (creatorId) {
      query = query.eq('creator_id', creatorId);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ proposals: data || [] });
  } catch (error: any) {
    console.error('Error fetching proposals:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch proposals' },
      { status: 500 }
    );
  }
}

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

    // Get user's creator profile
    const { data: creatorProfile } = await supabase
      .from('creator_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!creatorProfile) {
      return NextResponse.json(
        { error: 'Creator profile not found. Please complete your profile setup.' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.briefId || !body.message || !body.price || !body.timelineDays) {
      return NextResponse.json(
        { error: 'Missing required fields: briefId, message, price, timelineDays' },
        { status: 400 }
      );
    }

    // Check if brief is still open
    const { data: brief } = await supabase
      .from('briefs')
      .select('status')
      .eq('id', body.briefId)
      .single();

    if (!brief || brief.status !== 'Open') {
      return NextResponse.json(
        { error: 'This brief is no longer accepting proposals' },
        { status: 400 }
      );
    }

    // Check if creator already submitted proposal
    const { data: existing } = await supabase
      .from('proposals')
      .select('id')
      .eq('brief_id', body.briefId)
      .eq('creator_id', creatorProfile.id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'You have already submitted a proposal for this brief' },
        { status: 400 }
      );
    }

    // Create proposal with RLS enforcing ownership
    const { data, error } = await supabase
      .from('proposals')
      .insert({
        brief_id: body.briefId,
        creator_id: creatorProfile.id,
        message: body.message,
        price: body.price,
        timeline_days: body.timelineDays,
        status: 'Pending',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ proposal: data }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating proposal:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create proposal' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
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
    const { proposalId, status, action } = body;

    if (!proposalId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: proposalId, status' },
        { status: 400 }
      );
    }

    // Get proposal with ownership info
    const { data: proposal } = await supabase
      .from('proposals')
      .select(`
        *,
        brief:briefs!inner(
          brand_id,
          brand:brand_profiles!inner(user_id)
        ),
        creator:creator_profiles!inner(user_id)
      `)
      .eq('id', proposalId)
      .single();

    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    // Verify permission
    const brandUserId = (proposal.brief as any).brand.user_id;
    const creatorUserId = (proposal.creator as any).user_id;

    const isBrand = brandUserId === user.id;
    const isCreator = creatorUserId === user.id;

    if (!isBrand && !isCreator) {
      return NextResponse.json(
        { error: 'Forbidden - You do not have permission to modify this proposal' },
        { status: 403 }
      );
    }

    // Only brand can accept/reject
    if ((status === 'Accepted' || status === 'Rejected' || status === 'Shortlisted') && !isBrand) {
      return NextResponse.json(
        { error: 'Forbidden - Only the brand can accept, reject, or shortlist proposals' },
        { status: 403 }
      );
    }

    // Only creator can update if status is Pending
    if (isCreator && proposal.status !== 'Pending') {
      return NextResponse.json(
        { error: 'You can only edit proposals that are still pending' },
        { status: 403 }
      );
    }

    // Handle acceptance with atomic engagement creation
    if (status === 'Accepted' && action === 'select') {
      // Use transaction to prevent duplicate selections
      // First, check if brief already has an accepted proposal
      const { data: existingAccepted } = await supabase
        .from('proposals')
        .select('id')
        .eq('brief_id', proposal.brief_id)
        .eq('status', 'Accepted')
        .neq('id', proposalId);

      if (existingAccepted && existingAccepted.length > 0) {
        return NextResponse.json(
          { error: 'This brief already has an accepted proposal' },
          { status: 400 }
        );
      }

      // Update proposal status
      const { error: updateError } = await supabase
        .from('proposals')
        .update({
          status: 'Accepted',
          updated_at: new Date().toISOString(),
        })
        .eq('id', proposalId);

      if (updateError) throw updateError;

      // Update brief status to Hired
      await supabase
        .from('briefs')
        .update({ status: 'Hired' })
        .eq('id', proposal.brief_id);

      return NextResponse.json({
        success: true,
        message: 'Proposal accepted and engagement created',
      });
    }

    // Regular status update
    const { error } = await supabase
      .from('proposals')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', proposalId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating proposal:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update proposal' },
      { status: 500 }
    );
  }
}
