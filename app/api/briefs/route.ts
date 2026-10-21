import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    
    // Get authenticated user to determine what they can see
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const status = searchParams.get('status');
    const brandId = searchParams.get('brandId');

    let query = supabase
      .from('briefs')
      .select(`
        *,
        brand:brand_profiles!inner(
          id,
          company_name,
          user:users!inner(name)
        )
      `);

    // If user is authenticated and a brand, show their drafts too
    if (user && brandId) {
      // Show all briefs for this brand (including drafts)
      query = query.eq('brand_id', brandId);
    } else {
      // Public view - only show Open briefs
      query = query.eq('status', 'Open');
    }

    if (status && !brandId) {
      query = query.eq('status', status);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ briefs: data || [] });
  } catch (error: any) {
    console.error('Error fetching briefs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch briefs' },
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

    // Get user's brand profile
    const { data: brandProfile } = await supabase
      .from('brand_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!brandProfile) {
      return NextResponse.json(
        { error: 'Brand profile not found. Please complete your profile setup.' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.campaignTitle || !body.objective || !body.contentType) {
      return NextResponse.json(
        { error: 'Missing required fields: campaignTitle, objective, contentType' },
        { status: 400 }
      );
    }

    // Create brief with RLS enforcing ownership
    const { data, error } = await supabase
      .from('briefs')
      .insert({
        brand_id: brandProfile.id,
        campaign_title: body.campaignTitle,
        objective: body.objective,
        content_type: body.contentType,
        style: body.style || '',
        aspect_ratios: body.aspectRatios || [],
        duration_seconds: body.durationSeconds,
        resolution: body.resolution,
        quantity: body.quantity || 1,
        tools_preferred: body.toolsPreferred || [],
        reference_links: body.referenceLinks || [],
        budget_min: body.budgetMin || 0,
        budget_max: body.budgetMax || 0,
        deadline: body.deadline,
        commercial_use: body.commercialUse || {},
        negative_keywords: body.negativeKeywords || [],
        status: body.status || 'Draft',
        generated_by_ai: body.generatedByAI || false,
        raw_idea: body.rawIdea,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ brief: data }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating brief:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create brief' },
      { status: 500 }
    );
  }
}
