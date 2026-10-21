import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { agreementId: string } }
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

    const agreementId = params.agreementId;

    // Fetch agreement with all related data
    const { data: agreement, error: agreementError } = await supabase
      .from('agreements')
      .select(`
        *,
        creator:creator_profiles!inner(id, handle, user:users!inner(id, name)),
        brand:brand_profiles!inner(id, company_name, user:users!inner(id, name))
      `)
      .eq('id', agreementId)
      .single();

    if (agreementError || !agreement) {
      return NextResponse.json(
        { error: 'Agreement not found' },
        { status: 404 }
      );
    }

    // Verify user is participant
    const creatorUserId = (agreement as any).creator.user.id;
    const brandUserId = (agreement as any).brand.user.id;
    const isParticipant = user.id === creatorUserId || user.id === brandUserId;

    if (!isParticipant) {
      return NextResponse.json(
        { error: 'Forbidden - You are not a participant in this agreement' },
        { status: 403 }
      );
    }

    // Fetch original brief
    const { data: brief, error: briefError } = await supabase
      .from('briefs')
      .select('*')
      .eq('id', agreement.brief_id)
      .single();

    if (briefError) throw briefError;

    // Fetch original proposal
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .select(`
        *,
        creator:creator_profiles!inner(id, handle, user:users!inner(name))
      `)
      .eq('id', agreement.proposal_id)
      .single();

    if (proposalError) throw proposalError;

    // Fetch all deliveries
    const { data: deliveries, error: deliveriesError } = await supabase
      .from('deliveries')
      .select('*')
      .eq('agreement_id', agreementId)
      .order('version', { ascending: true });

    if (deliveriesError) throw deliveriesError;

    // Fetch all project messages with sender info
    const { data: messages, error: messagesError } = await supabase
      .from('project_messages')
      .select(`
        *,
        sender:users!inner(id, name, role)
      `)
      .eq('agreement_id', agreementId)
      .order('created_at', { ascending: true });

    if (messagesError) throw messagesError;

    // Fetch all scope changes
    const { data: scopeChanges, error: scopeChangesError } = await supabase
      .from('scope_changes')
      .select('*')
      .eq('agreement_id', agreementId)
      .order('created_at', { ascending: true });

    if (scopeChangesError) throw scopeChangesError;

    // Fetch review if exists
    const { data: review } = await supabase
      .from('reviews')
      .select('*')
      .eq('agreement_id', agreementId)
      .maybeSingle();

    // Build history timeline
    const history: any[] = [];

    // Add brief created event
    if (brief) {
      history.push({
        type: 'brief_created',
        timestamp: brief.created_at,
        data: {
          campaignTitle: brief.campaign_title,
          objective: brief.objective,
          contentType: brief.content_type,
          aspectRatios: brief.aspect_ratios,
          budgetMin: brief.budget_min,
          budgetMax: brief.budget_max,
          deadline: brief.deadline,
          commercialUse: brief.commercial_use,
        },
      });
    }

    // Add proposal events
    if (proposal) {
      history.push({
        type: 'proposal_submitted',
        timestamp: proposal.created_at,
        data: {
          message: proposal.message,
          price: proposal.price,
          timelineDays: proposal.timeline_days,
          creatorName: (proposal as any).creator.user.name,
          creatorHandle: (proposal as any).creator.handle,
        },
      });

      if (proposal.status === 'Accepted' && proposal.updated_at !== proposal.created_at) {
        history.push({
          type: 'proposal_accepted',
          timestamp: proposal.updated_at,
          data: {
            proposalId: proposal.id,
          },
        });
      }
    }

    // Add agreement created event
    history.push({
      type: 'agreement_created',
      timestamp: agreement.created_at,
      data: {
        version: agreement.version,
        price: agreement.price,
        milestones: agreement.milestones,
        deliverables: agreement.deliverables,
      },
    });

    // Add creator acceptance event
    if (agreement.creator_accepted_at) {
      history.push({
        type: 'creator_accepted',
        timestamp: agreement.creator_accepted_at,
        data: {
          creatorName: (agreement as any).creator.user.name,
        },
      });
    }

    // Add brand acceptance event
    if (agreement.brand_accepted_at) {
      history.push({
        type: 'brand_accepted',
        timestamp: agreement.brand_accepted_at,
        data: {
          brandName: (agreement as any).brand.company_name,
        },
      });
    }

    // Add delivery events
    if (deliveries) {
      deliveries.forEach((delivery: any) => {
        history.push({
          type: 'delivery_uploaded',
          timestamp: delivery.created_at,
          data: {
            version: delivery.version,
            fileName: delivery.file_name,
            inspectionStatus: delivery.inspection_status,
            inspectionResults: delivery.inspection_results,
          },
        });

        if (delivery.brand_approved_at) {
          history.push({
            type: 'final_approval',
            timestamp: delivery.brand_approved_at,
            data: {
              version: delivery.version,
              approvalNotes: delivery.approval_notes,
            },
          });
        }
      });
    }

    // Add message events
    if (messages) {
      messages.forEach((message: any) => {
        history.push({
          type: 'message',
          timestamp: message.created_at,
          data: {
            messageType: message.message_type,
            content: message.content,
            senderName: message.sender.name,
            senderRole: message.sender.role,
            deliveryVersion: message.delivery_version,
            videoTimestampSeconds: message.video_timestamp_seconds,
          },
        });
      });
    }

    // Add scope change events
    if (scopeChanges) {
      scopeChanges.forEach((change: any) => {
        history.push({
          type: 'scope_change',
          timestamp: change.created_at,
          data: {
            previousVersion: change.previous_version,
            newVersion: change.new_version,
            changesSummary: change.changes_summary,
            priceDelta: change.price_delta,
            deadlineDeltaDays: change.deadline_delta_days,
          },
        });

        if (change.creator_accepted_at) {
          history.push({
            type: 'scope_change_creator_accepted',
            timestamp: change.creator_accepted_at,
            data: { changeId: change.id },
          });
        }

        if (change.brand_accepted_at) {
          history.push({
            type: 'scope_change_brand_accepted',
            timestamp: change.brand_accepted_at,
            data: { changeId: change.id },
          });
        }

        if (change.applied_at) {
          history.push({
            type: 'scope_change_applied',
            timestamp: change.applied_at,
            data: { changeId: change.id },
          });
        }
      });
    }

    // Sort history by timestamp
    history.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Build response
    const passport = {
      agreement,
      brief,
      proposal,
      deliveries: deliveries || [],
      messages: messages || [],
      scopeChanges: scopeChanges || [],
      history,
      review: review || null,
    };

    return NextResponse.json(passport);
  } catch (error: any) {
    console.error('Error fetching production passport:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch production passport' },
      { status: 500 }
    );
  }
}
