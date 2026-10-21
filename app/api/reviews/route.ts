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
    const { agreementId, briefId, creatorId, rating, comment } = body;

    // Validate required fields
    if (!agreementId) {
      return NextResponse.json(
        { error: 'agreementId is required' },
        { status: 400 }
      );
    }

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Fetch agreement to validate
    const { data: agreement, error: agreementError } = await supabase
      .from('agreements')
      .select(`
        id,
        brief_id,
        creator_id,
        brand_id,
        brand:brand_profiles!inner(user_id)
      `)
      .eq('id', agreementId)
      .single();

    if (agreementError || !agreement) {
      return NextResponse.json(
        { error: 'Agreement not found' },
        { status: 404 }
      );
    }

    // Verify user is brand
    const brandUserId = (agreement as any).brand.user_id;
    if (user.id !== brandUserId) {
      return NextResponse.json(
        { error: 'Forbidden - Only the brand can submit reviews' },
        { status: 403 }
      );
    }

    // Check if agreement is complete (has at least one approved delivery)
    const { data: approvedDelivery } = await supabase
      .from('deliveries')
      .select('id')
      .eq('agreement_id', agreementId)
      .not('brand_approved_at', 'is', null)
      .limit(1)
      .single();

    if (!approvedDelivery) {
      return NextResponse.json(
        { error: 'Cannot review - No approved deliveries found for this agreement' },
        { status: 400 }
      );
    }

    // Check for existing review
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('agreement_id', agreementId)
      .maybeSingle();

    if (existingReview) {
      return NextResponse.json(
        { error: 'Review already submitted for this agreement' },
        { status: 400 }
      );
    }

    // Insert review
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .insert({
        agreement_id: agreementId,
        brief_id: agreement.brief_id,
        creator_id: agreement.creator_id,
        brand_id: agreement.brand_id,
        rating,
        comment: comment || null,
      })
      .select()
      .single();

    if (reviewError) throw reviewError;

    // Update creator stats
    const { data: creatorProfile } = await supabase
      .from('creator_profiles')
      .select('stats')
      .eq('id', agreement.creator_id)
      .single();

    if (creatorProfile) {
      const currentStats = creatorProfile.stats as any;
      const projectsCompleted = (currentStats.projectsCompleted || 0) + 1;
      
      // Fetch all reviews for this creator to recalculate average
      const { data: allReviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('creator_id', agreement.creator_id);

      let avgRating = 0;
      if (allReviews && allReviews.length > 0) {
        const totalRating = allReviews.reduce((sum: number, r: any) => sum + r.rating, 0);
        avgRating = Math.round((totalRating / allReviews.length) * 10) / 10;
      }

      // Update creator stats
      await supabase
        .from('creator_profiles')
        .update({
          stats: {
            ...currentStats,
            projectsCompleted,
            avgRating,
          },
        })
        .eq('id', agreement.creator_id);
    }

    return NextResponse.json({ review }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating review:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create review' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    
    const creatorId = searchParams.get('creatorId');
    const brandId = searchParams.get('brandId');

    let query = supabase
      .from('reviews')
      .select(`
        *,
        creator:creator_profiles!inner(handle, user:users!inner(name)),
        brand:brand_profiles!inner(company_name)
      `)
      .order('created_at', { ascending: false });

    if (creatorId) {
      query = query.eq('creator_id', creatorId);
    }
    
    if (brandId) {
      query = query.eq('brand_id', brandId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ reviews: data || [] });
  } catch (error: any) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}
