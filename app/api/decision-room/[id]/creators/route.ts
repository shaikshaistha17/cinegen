import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

// GET: Fetch matched creators with portfolio evidence
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const roomId = params.id;
    
    // Get decision room (RLS will enforce user ownership)
    const { data: room, error: fetchError } = await supabase
      .from('decision_rooms')
      .select('*')
      .eq('id', roomId)
      .single();
    
    if (fetchError || !room) {
      return NextResponse.json({ error: "Decision room not found" }, { status: 404 });
    }
    
    const requirements = room.requirements || {};
    const selectedDirection = room.selected_direction || {};
    
    // Extract matching criteria from requirements and direction
    const requiredSkills = selectedDirection.required_skills || [];
    const requiredTools = requirements.tools || [];
    const contentType = requirements.contentType || '';
    const aspectRatios = requirements.aspectRatios || [];
    const budget = requirements.budget || 0;
    
    // Build query for creator profiles
    const query = supabase
      .from('creator_profiles')
      .select(`
        id,
        name,
        handle,
        avatar_url,
        headline,
        hourly_rate,
        specializations,
        verified_tools,
        verification_status,
        portfolio
      `);
    
    // Simple filtering - get all creators and filter in-memory for MVP
    const { data: creators, error: creatorsError } = await query;
    
    if (creatorsError) {
      console.error('[Creators] Failed to fetch:', creatorsError);
      return NextResponse.json({ error: "Failed to fetch creators" }, { status: 500 });
    }
    
    // Match creators based on requirements
    const matchedCreators = (creators || []).map(creator => {
      const matches: Array<{
        requirement: string;
        evidence: Array<{
          type: 'portfolio' | 'tool' | 'specialization';
          title?: string;
          description?: string;
          verified: boolean;
          portfolio_item_id?: string;
        }>;
        status: 'matched' | 'partial' | 'missing';
      }> = [];
      
      // Check content type specialization
      if (contentType) {
        const specializationMatch = creator.specializations?.includes(contentType);
        matches.push({
          requirement: `Content Type: ${contentType}`,
          evidence: specializationMatch ? [{
            type: 'specialization',
            title: contentType,
            verified: false
          }] : [],
          status: specializationMatch ? 'matched' : 'missing'
        });
      }
      
      // Check tools
      if (requiredTools.length > 0) {
        const creatorTools = creator.verified_tools?.map((t: any) => t.name) || [];
        const matchedTools = requiredTools.filter((tool: string) => 
          creatorTools.includes(tool)
        );
        
        matches.push({
          requirement: `Tools: ${requiredTools.join(', ')}`,
          evidence: matchedTools.map((tool: string) => {
            const toolData = creator.verified_tools?.find((t: any) => t.name === tool);
            return {
              type: 'tool' as const,
              title: tool,
              description: toolData?.proficiency || 'Unknown',
              verified: toolData?.verified || false
            };
          }),
          status: matchedTools.length === requiredTools.length ? 'matched' 
            : matchedTools.length > 0 ? 'partial' 
            : 'missing'
        });
      }
      
      // Check portfolio items for skill evidence
      if (requiredSkills.length > 0) {
        const portfolioItems = creator.portfolio || [];
        const skillEvidence: any[] = [];
        
        requiredSkills.forEach((skill: string) => {
          const matchingItems = portfolioItems.filter((item: any) => {
            const skillsMatch = item.style_tags?.some((tag: string) => 
              tag.toLowerCase().includes(skill.toLowerCase())
            );
            const toolsMatch = item.tools_used?.some((tool: string) => 
              skill.toLowerCase().includes(tool.toLowerCase())
            );
            return skillsMatch || toolsMatch;
          });
          
          if (matchingItems.length > 0) {
            skillEvidence.push({
              type: 'portfolio',
              title: matchingItems[0].title,
              description: `Demonstrates ${skill}`,
              verified: false,
              portfolio_item_id: matchingItems[0].id
            });
          }
        });
        
        matches.push({
          requirement: `Skills: ${requiredSkills.join(', ')}`,
          evidence: skillEvidence,
          status: skillEvidence.length === requiredSkills.length ? 'matched'
            : skillEvidence.length > 0 ? 'partial'
            : 'missing'
        });
      }
      
      // Check budget fit
      if (budget > 0 && creator.hourly_rate) {
        const estimatedHours = 20; // Rough estimate
        const estimatedCost = creator.hourly_rate * estimatedHours;
        const withinBudget = estimatedCost <= budget * 1.2; // 20% tolerance
        
        matches.push({
          requirement: `Budget: ₹${budget}`,
          evidence: [{
            type: 'tool',
            title: `Hourly rate: ₹${creator.hourly_rate}`,
            description: withinBudget ? 'Within budget estimate' : 'May exceed budget',
            verified: true
          }],
          status: withinBudget ? 'matched' : 'partial'
        });
      }
      
      // Calculate match score
      const totalRequirements = matches.length;
      const matchedCount = matches.filter(m => m.status === 'matched').length;
      const partialCount = matches.filter(m => m.status === 'partial').length;
      const score = totalRequirements > 0 
        ? (matchedCount + partialCount * 0.5) / totalRequirements 
        : 0;
      
      return {
        creator: {
          id: creator.id,
          name: creator.name,
          handle: creator.handle,
          avatar_url: creator.avatar_url,
          headline: creator.headline,
          hourly_rate: creator.hourly_rate,
          verification_status: creator.verification_status || 'Unverified'
        },
        matches,
        score
      };
    });
    
    // Sort by score descending
    matchedCreators.sort((a, b) => b.score - a.score);
    
    // Return top 10 matches
    const topMatches = matchedCreators.slice(0, 10);
    
    return NextResponse.json({ creators: topMatches });
  } catch (err) {
    console.error('[Creators] Error:', err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
