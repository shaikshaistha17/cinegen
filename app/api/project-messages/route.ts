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
    const {
      agreementId,
      messageType,
      content,
      deliveryVersion,
      videoTimestampSeconds,
      proposedChanges,
    } = body;

    // Validate required fields
    if (!agreementId || !messageType || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: agreementId, messageType, content' },
        { status: 400 }
      );
    }

    // Validate messageType
    if (!['comment', 'revision_request', 'scope_change_request'].includes(messageType)) {
      return NextResponse.json(
        { error: 'Invalid messageType. Must be: comment, revision_request, or scope_change_request' },
        { status: 400 }
      );
    }

    // Fetch agreement and verify user is participant
    const { data: agreement, error: agreementError } = await supabase
      .from('agreements')
      .select('id, creator_id, brand_id, version, creator:creator_profiles!inner(user_id), brand:brand_profiles!inner(user_id)')
      .eq('id', agreementId)
      .single();

    if (agreementError || !agreement) {
      return NextResponse.json(
        { error: 'Agreement not found' },
        { status: 404 }
      );
    }

    // Check if user is participant
    const creatorUserId = (agreement as any).creator.user_id;
    const brandUserId = (agreement as any).brand.user_id;
    const isParticipant = user.id === creatorUserId || user.id === brandUserId;

    if (!isParticipant) {
      return NextResponse.json(
        { error: 'Forbidden - You are not a participant in this agreement' },
        { status: 403 }
      );
    }

    // Validate deliveryVersion if provided
    if (deliveryVersion !== undefined && deliveryVersion !== null) {
      const { data: delivery, error: deliveryError } = await supabase
        .from('deliveries')
        .select('id')
        .eq('agreement_id', agreementId)
        .eq('version', deliveryVersion)
        .single();

      if (deliveryError || !delivery) {
        return NextResponse.json(
          { error: `Delivery version ${deliveryVersion} not found for this agreement` },
          { status: 400 }
        );
      }
    }

    // Validate proposedChanges for scope_change_request
    if (messageType === 'scope_change_request') {
      if (!proposedChanges) {
        return NextResponse.json(
          { error: 'proposedChanges required for scope_change_request' },
          { status: 400 }
        );
      }

      // Validate JSONB structure
      if (typeof proposedChanges !== 'object') {
        return NextResponse.json(
          { error: 'proposedChanges must be a valid object' },
          { status: 400 }
        );
      }
    }

    // Insert project message
    const { data: message, error: messageError } = await supabase
      .from('project_messages')
      .insert({
        agreement_id: agreementId,
        sender_id: user.id,
        message_type: messageType,
        content,
        delivery_version: deliveryVersion || null,
        video_timestamp_seconds: videoTimestampSeconds || null,
        proposed_changes: proposedChanges || null,
        change_accepted_by_creator: false,
        change_accepted_by_brand: false,
      })
      .select()
      .single();

    if (messageError) throw messageError;

    // If scope_change_request, also create scope_changes row
    if (messageType === 'scope_change_request' && message) {
      const priceDelta = proposedChanges.priceDelta || null;
      const deadlineDeltaDays = proposedChanges.deadlineDeltaDays || null;
      const changesSummary = proposedChanges.changes || content;

      const { error: scopeChangeError } = await supabase
        .from('scope_changes')
        .insert({
          agreement_id: agreementId,
          message_id: message.id,
          previous_version: agreement.version,
          new_version: agreement.version + 1,
          changes_summary: changesSummary,
          price_delta: priceDelta,
          deadline_delta_days: deadlineDeltaDays,
        });

      if (scopeChangeError) {
        console.error('Error creating scope change:', scopeChangeError);
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating project message:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create project message' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const agreementId = searchParams.get('agreementId');

    if (!agreementId) {
      return NextResponse.json(
        { error: 'agreementId query parameter required' },
        { status: 400 }
      );
    }

    // Fetch agreement and verify user is participant
    const { data: agreement, error: agreementError } = await supabase
      .from('agreements')
      .select('id, creator:creator_profiles!inner(user_id), brand:brand_profiles!inner(user_id)')
      .eq('id', agreementId)
      .single();

    if (agreementError || !agreement) {
      return NextResponse.json(
        { error: 'Agreement not found' },
        { status: 404 }
      );
    }

    // Check if user is participant
    const creatorUserId = (agreement as any).creator.user_id;
    const brandUserId = (agreement as any).brand.user_id;
    const isParticipant = user.id === creatorUserId || user.id === brandUserId;

    if (!isParticipant) {
      return NextResponse.json(
        { error: 'Forbidden - You are not a participant in this agreement' },
        { status: 403 }
      );
    }

    // Fetch messages with sender names
    const { data: messages, error: messagesError } = await supabase
      .from('project_messages')
      .select(`
        *,
        sender:users!inner(id, name, role)
      `)
      .eq('agreement_id', agreementId)
      .order('created_at', { ascending: true });

    if (messagesError) throw messagesError;

    // Transform to include sender details
    const transformedMessages = (messages || []).map((msg: any) => ({
      ...msg,
      senderName: msg.sender.name,
      senderRole: msg.sender.role,
    }));

    return NextResponse.json({ messages: transformedMessages });
  } catch (error: any) {
    console.error('Error fetching project messages:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch project messages' },
      { status: 500 }
    );
  }
}
