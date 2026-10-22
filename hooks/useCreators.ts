"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { CreatorProfile, ToolProficiency } from "@/types";
import { seedCreators } from "@/lib/seed/creators";
import { createClient } from "@/lib/supabase";

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
};

export function useCreators() {
  const [creators, setCreators] = useState<CreatorProfile[]>(seedCreators);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fallback to seed data if Supabase not configured
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    const fetchCreators = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("creator_profiles")
          .select("*, user:users(email, name)")
          .order("joined_at", { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          // Transform database data to CreatorProfile format
          const transformedCreators: CreatorProfile[] = data.map((profile: any) => ({
            id: profile.id,
            name: profile.user?.name || "",
            handle: profile.handle,
            email: profile.user?.email || "",
            avatarUrl: profile.avatar_url || "",
            coverUrl: profile.cover_url || "",
            headline: profile.headline,
            bio: profile.bio,
            location: profile.location || "",
            hourlyRate: profile.hourly_rate_inr,
            availability: profile.availability,
            specializations: profile.specializations || [],
            skills: profile.skills || [],
            verifiedTools: (profile.verified_tools as ToolProficiency[]) || [],
            languages: profile.languages || [],
            stats: profile.stats || {
              projectsCompleted: 0,
              avgRating: 0,
              repeatClientRate: 0,
              responseTime: "",
            },
            verification: profile.verification || {
              toolsVerified: false,
              workflowVerified: false,
              pastWorkVerified: false,
              badge: "Unverified",
            },
            portfolio: profile.portfolio || [],
            joinedAt: profile.joined_at,
          }));
          setCreators(transformedCreators);
        }
      } catch (err) {
        console.warn("Falling back to seed data:", err);
        setError("Using demo data");
        // Keep seed data on error
      } finally {
        setLoading(false);
      }
    };

    fetchCreators();

    // Subscribe to real-time updates
    const supabase = createClient();
    const channel = supabase
      .channel("creator_profiles_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "creator_profiles",
        },
        () => {
          fetchCreators();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return { creators, loading, error };
}

export function useCreator(id: string) {
  const { creators, loading, error } = useCreators();
  const creator = useMemo(
    () => creators.find((c) => c.id === id),
    [creators, id]
  );
  return { creator, loading, error };
}

export function useCreatorProfile() {
  const createCreatorProfile = async (data: Partial<CreatorProfile>) => {
    if (!isSupabaseConfigured()) {
      throw new Error("Supabase not configured");
    }

    const supabase = createClient();
    const { data: profile, error } = await supabase
      .from("creator_profiles")
      .insert({
        handle: data.handle,
        avatar_url: data.avatarUrl,
        cover_url: data.coverUrl,
        headline: data.headline,
        bio: data.bio,
        location: data.location,
        hourly_rate_inr: data.hourlyRate,
        availability: data.availability,
        specializations: data.specializations,
        skills: data.skills,
        verified_tools: data.verifiedTools,
        languages: data.languages,
      })
      .select()
      .single();

    if (error) throw error;
    return profile;
  };

  const updateCreatorProfile = async (
    id: string,
    data: Partial<CreatorProfile>
  ) => {
    if (!isSupabaseConfigured()) {
      throw new Error("Supabase not configured");
    }

    const supabase = createClient();
    const updateData: any = {};

    if (data.handle) updateData.handle = data.handle;
    if (data.avatarUrl !== undefined) updateData.avatar_url = data.avatarUrl;
    if (data.coverUrl !== undefined) updateData.cover_url = data.coverUrl;
    if (data.headline) updateData.headline = data.headline;
    if (data.bio) updateData.bio = data.bio;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.hourlyRate) updateData.hourly_rate_inr = data.hourlyRate;
    if (data.availability) updateData.availability = data.availability;
    if (data.specializations) updateData.specializations = data.specializations;
    if (data.skills) updateData.skills = data.skills;
    if (data.verifiedTools) updateData.verified_tools = data.verifiedTools;
    if (data.languages) updateData.languages = data.languages;
    if (data.stats) updateData.stats = data.stats;
    if (data.verification) updateData.verification = data.verification;
    if (data.portfolio) updateData.portfolio = data.portfolio;

    const { data: profile, error } = await supabase
      .from("creator_profiles")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return profile;
  };

  const uploadAvatar = async (file: File, creatorId: string) => {
    if (!isSupabaseConfigured()) {
      throw new Error("Supabase not configured");
    }

    const supabase = createClient();
    const fileName = `${creatorId}/avatar-${Date.now()}.${file.name.split(".").pop()}`;

    const { data, error } = await supabase.storage
      .from("avatars")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) throw error;

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(fileName);

    return publicUrl;
  };

  const uploadCover = async (file: File, creatorId: string) => {
    if (!isSupabaseConfigured()) {
      throw new Error("Supabase not configured");
    }

    const supabase = createClient();
    const fileName = `${creatorId}/cover-${Date.now()}.${file.name.split(".").pop()}`;

    const { data, error } = await supabase.storage
      .from("avatars")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) throw error;

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(fileName);

    return publicUrl;
  };

  return {
    createCreatorProfile,
    updateCreatorProfile,
    uploadAvatar,
    uploadCover,
  };
}
