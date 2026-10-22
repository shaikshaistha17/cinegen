import { createServiceClient } from './supabase';
import { CreatorProfile, Brief } from '@/types';
import bcrypt from 'bcryptjs';

/**
 * Admin functions using service role client
 * These bypass RLS policies and should only be used in secure contexts
 */

const SALT_ROUNDS = 10;

/**
 * Seed creator profiles into the database
 * Creates user accounts and creator profiles for all creators
 */
export async function seedCreatorProfiles(creators: CreatorProfile[]) {
  const supabase = createServiceClient();
  const results = {
    success: [] as string[],
    errors: [] as { creator: string; error: string }[],
  };

  for (const creator of creators) {
    try {
      // Hash password for demo account
      const passwordHash = await bcrypt.hash('Demo@123', SALT_ROUNDS);

      // Insert user account
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          email: creator.email,
          password_hash: passwordHash,
          role: 'creator',
          name: creator.name,
        })
        .select('id')
        .single();

      if (userError) {
        throw new Error(`User creation failed: ${userError.message}`);
      }

      // Prepare creator profile data
      const profileData = {
        user_id: userData.id,
        handle: creator.handle,
        avatar_url: creator.avatarUrl,
        cover_url: creator.coverUrl,
        headline: creator.headline,
        bio: creator.bio,
        location: creator.location,
        hourly_rate_inr: creator.hourlyRate,
        availability: creator.availability,
        specializations: creator.specializations,
        skills: creator.skills,
        verified_tools: creator.verifiedTools,
        languages: creator.languages,
        stats: creator.stats,
        verification: creator.verification,
        portfolio: creator.portfolio,
        joined_at: creator.joinedAt,
      };

      // Insert creator profile
      const { error: profileError } = await supabase
        .from('creator_profiles')
        .insert(profileData);

      if (profileError) {
        throw new Error(`Profile creation failed: ${profileError.message}`);
      }

      results.success.push(creator.handle);
      console.log(`✓ Created creator: ${creator.handle}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      results.errors.push({
        creator: creator.handle,
        error: errorMessage,
      });
      console.error(`✗ Failed to create creator ${creator.handle}: ${errorMessage}`);
    }
  }

  return results;
}

/**
 * Seed initial briefs into the database
 * Note: Requires brand profiles to exist first
 */
export async function seedBriefs(briefs: Brief[]) {
  const supabase = createServiceClient();
  const results = {
    success: [] as string[],
    errors: [] as { brief: string; error: string }[],
  };

  // First, get or create the brand user and profile
  const brandEmail = 'arjun@nexusbrands.com';
  const brandName = 'Arjun Mehta';
  const companyName = 'Nexus Brands';

  try {
    // Check if brand user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', brandEmail)
      .single();

    let brandUserId: string;
    let brandProfileId: string;

    if (!existingUser) {
      // Create brand user
      const passwordHash = await bcrypt.hash('Demo@123', SALT_ROUNDS);
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          email: brandEmail,
          password_hash: passwordHash,
          role: 'brand',
          name: brandName,
        })
        .select('id')
        .single();

      if (userError) {
        throw new Error(`Brand user creation failed: ${userError.message}`);
      }

      brandUserId = newUser.id;

      // Create brand profile
      const { data: newProfile, error: profileError } = await supabase
        .from('brand_profiles')
        .insert({
          user_id: brandUserId,
          company_name: companyName,
          website: 'https://nexusbrands.com',
          industry: 'Marketing & Advertising',
        })
        .select('id')
        .single();

      if (profileError) {
        throw new Error(`Brand profile creation failed: ${profileError.message}`);
      }

      brandProfileId = newProfile.id;
      console.log(`✓ Created brand user and profile: ${brandName}`);
    } else {
      brandUserId = existingUser.id;

      // Get brand profile
      const { data: profile, error: profileError } = await supabase
        .from('brand_profiles')
        .select('id')
        .eq('user_id', brandUserId)
        .single();

      if (profileError || !profile) {
        throw new Error('Brand profile not found');
      }

      brandProfileId = profile.id;
    }

    // Now seed briefs
    for (const brief of briefs) {
      try {
        const briefData = {
          brand_id: brandProfileId,
          campaign_title: brief.campaignTitle,
          objective: brief.objective,
          content_type: brief.contentType,
          style: brief.style,
          aspect_ratios: brief.aspectRatios,
          duration_seconds: brief.durationSeconds,
          resolution: brief.resolution,
          quantity: brief.quantity,
          tools_preferred: brief.toolsPreferred,
          reference_links: brief.referenceLinks,
          budget_min: brief.budgetMin,
          budget_max: brief.budgetMax,
          deadline: brief.deadline,
          commercial_use: brief.commercialUse,
          negative_keywords: brief.negativeKeywords,
          status: brief.status,
          generated_by_ai: brief.generatedByAI,
          raw_idea: brief.rawIdea,
        };

        const { error: briefError } = await supabase
          .from('briefs')
          .insert(briefData);

        if (briefError) {
          throw new Error(`Brief creation failed: ${briefError.message}`);
        }

        results.success.push(brief.campaignTitle);
        console.log(`✓ Created brief: ${brief.campaignTitle}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push({
          brief: brief.campaignTitle,
          error: errorMessage,
        });
        console.error(`✗ Failed to create brief ${brief.campaignTitle}: ${errorMessage}`);
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`✗ Failed to set up brand account: ${errorMessage}`);
    throw error;
  }

  return results;
}

/**
 * Clear all data from tables (for testing/reset)
 * Use with caution!
 */
export async function clearAllData() {
  const supabase = createServiceClient();

  try {
    // Delete in correct order due to foreign key constraints
    await supabase.from('verifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('reviews').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('proposals').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('briefs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('creator_profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('brand_profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    console.log('✓ All data cleared successfully');
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`✗ Failed to clear data: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}
