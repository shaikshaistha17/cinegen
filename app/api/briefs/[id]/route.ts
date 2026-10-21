import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const supabase = createClient();

    const { data, error } = await supabase
      .from('briefs')
      .select(`
        *,
        brand:brand_profiles!inner(
          id,
          company_name,
          website,
          industry,
          user:users!inner(name, email)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Brief not found' }, { status: 404 });
    }

    return NextResponse.json({ brief: data });
  } catch (error: any) {
    console.error('Error fetching brief:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch brief' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const supabase = createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership - brand can only update their own briefs
    const { data: existingBrief } = await supabase
      .from('briefs')
      .select('brand_id, brand:brand_profiles!inner(user_id)')
      .eq('id', id)
      .single();

    if (!existingBrief || (existingBrief.brand as any).user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden - You can only edit your own briefs' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Update brief with RLS enforcing ownership
    const { data, error } = await supabase
      .from('briefs')
      .update({
        campaign_title: body.campaignTitle,
        objective: body.objective,
        content_type: body.contentType,
        style: body.style,
        aspect_ratios: body.aspectRatios,
        duration_seconds: body.durationSeconds,
        resolution: body.resolution,
        quantity: body.quantity,
        tools_preferred: body.toolsPreferred,
        reference_links: body.referenceLinks,
        budget_min: body.budgetMin,
        budget_max: body.budgetMax,
        deadline: body.deadline,
        commercial_use: body.commercialUse,
        negative_keywords: body.negativeKeywords,
        status: body.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ brief: data });
  } catch (error: any) {
    console.error('Error updating brief:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update brief' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const supabase = createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const { data: existingBrief } = await supabase
      .from('briefs')
      .select('brand_id, brand:brand_profiles!inner(user_id)')
      .eq('id', id)
      .single();

    if (!existingBrief || (existingBrief.brand as any).user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden - You can only delete your own briefs' },
        { status: 403 }
      );
    }

    // Delete brief (will cascade delete proposals per DB schema)
    const { error } = await supabase.from('briefs').delete().eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting brief:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete brief' },
      { status: 500 }
    );
  }
}
