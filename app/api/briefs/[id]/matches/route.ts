import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { matchCreators } from "@/lib/ai/creatorMatcher";
import { checkRateLimit } from "@/lib/ai/rateLimit";
import { Brief, CreatorProfile, PortfolioItem, ToolProficiency } from "@/types";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Parse session cookie to get userId and role
    let session: any = null;
    try {
      const sessionCookie = req.cookies.get('cinegen_session')?.value;
      if (!sessionCookie) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      }
      session = JSON.parse(sessionCookie);
      if (!session.userId) {
        return NextResponse.json({ error: "Invalid session" }, { status: 401 });
      }
    } catch (e) {
      return NextResponse.json({ error: "Invalid session format" }, { status: 401 });
    }

    // 2. Rate limit check
    const rateCheck = checkRateLimit(session.userId, 'brief-matches', 10, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later.", retryAfterMs: rateCheck.retryAfterMs },
        { status: 429 }
      );
    }

    // 3. Fetch brief from Supabase
    const supabase = createServiceClient();
    const { data: briefData, error: briefError } = await supabase
      .from('briefs')
      .select('*')
      .eq('id', params.id)
      .single();

    if (briefError || !briefData) {
      return NextResponse.json({ error: "Brief not found" }, { status: 404 });
    }

    // 4. Verify ownership
    const { data: brandProfile, error: brandError } = await supabase
      .from('brand_profiles')
      .select('id')
      .eq('user_id', session.userId)
      .single();

    if (brandError || !brandProfile) {
      return NextResponse.json({ error: "Brand profile not found" }, { status: 403 });
    }

    if (briefData.brand_id !== brandProfile.id) {
      return NextResponse.json({ error: "Unauthorized to view matches for this brief" }, { status: 403 });
    }

    // 5. Fetch creator profiles with portfolio items
    const { data: creatorData, error: creatorsError } = await supabase
      .from('creator_profiles')
      .select(`
        id,
        user_id,
        handle,
        bio,
        specializations,
        skills,
        verified_tools,
        availability,
        hourly_rate_usd,
        languages,
        avatar_url,
        cover_url,
        headline,
        portfolio,
        stats,
        verification
      `);

    if (creatorsError || !creatorData) {
      return NextResponse.json({ error: "Failed to fetch creators" }, { status: 500 });
    }

    // 6. Fetch user names and emails
    const userIds = creatorData.map(c => c.user_id);
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, name, email')
      .in('id', userIds);

    const userMap = new Map((userData || []).map(u => [u.id, u]));

    // 7. Transform to CreatorProfile format
    const creatorProfiles: CreatorProfile[] = creatorData.map(c => {
      const user = userMap.get(c.user_id);
      return {
        id: c.id,
        name: user?.name || c.handle,
        handle: c.handle,
        email: user?.email || '',
        avatarUrl: c.avatar_url || '',
        coverUrl: c.cover_url || '',
        headline: c.headline || '',
        bio: c.bio || '',
        location: '',
        hourlyRateUsd: c.hourly_rate_usd || 0,
        availability: c.availability || 'Available',
        specializations: c.specializations || [],
        skills: c.skills || [],
        verifiedTools: (c.verified_tools || []) as ToolProficiency[],
        languages: c.languages || [],
        stats: c.stats || { projectsCompleted: 0, avgRating: 0, repeatClientRate: 0, responseTime: '24h' },
        verification: c.verification || { toolsVerified: false, workflowVerified: false, pastWorkVerified: false, badge: 'Unverified' },
        portfolio: (c.portfolio || []) as PortfolioItem[],
        joinedAt: new Date().toISOString(),
      };
    });

    // 8. Transform brief to Brief type
    const brief: Brief = {
      id: briefData.id,
      brandId: briefData.brand_id,
      brandName: briefData.brand_name || 'Brand',
      campaignTitle: briefData.campaign_title,
      objective: briefData.objective,
      contentType: briefData.content_type,
      style: briefData.style,
      aspectRatios: briefData.aspect_ratios || [],
      durationSeconds: briefData.duration_seconds,
      resolution: briefData.resolution,
      quantity: briefData.quantity || 1,
      toolsPreferred: briefData.tools_preferred || [],
      referenceLinks: briefData.reference_links || [],
      budgetMin: briefData.budget_min || 0,
      budgetMax: briefData.budget_max || 0,
      deadline: briefData.deadline,
      commercialUse: briefData.commercial_use || {},
      negativeKeywords: briefData.negative_keywords || [],
      status: briefData.status,
      generatedByAI: briefData.generated_by_ai || false,
      rawIdea: briefData.raw_idea,
      createdAt: briefData.created_at,
      updatedAt: briefData.updated_at,
    };

    // 9. Run creator matching
    const matches = await matchCreators(brief, creatorProfiles);

    // 10. Return top 10 matches
    const top10 = matches.slice(0, 10);

    return NextResponse.json(top10);
  } catch (err) {
    console.error('Matches API error:', err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
