"use client";
import { useState, useEffect, useCallback } from "react";
import { Brief, BriefStatus } from "@/types";
import { storage } from "@/lib/storage";
import { seedBriefs } from "@/lib/seed/briefs";
import { createClient } from "@/lib/supabase";

const KEY = "cinegen_briefs";

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
};

export function useBriefs() {
  const [briefs, setBriefs] = useState<Brief[]>(seedBriefs);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBriefs = useCallback(async () => {
    // Fallback to localStorage if Supabase not configured
    if (!isSupabaseConfigured()) {
      const stored = storage.read<Brief[]>(KEY) ?? [];
      setBriefs([...seedBriefs, ...stored]);
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      
      // Get current user to apply RLS filtering
      const { data: { user } } = await supabase.auth.getUser();
      
      let query = supabase
        .from("briefs")
        .select("*, brand:brand_profiles(id, company_name)")
        .order("created_at", { ascending: false });

      // If authenticated, get user's briefs and open briefs
      // If not authenticated, only get open briefs
      if (!user) {
        query = query.eq("status", "Open");
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data && data.length > 0) {
        // Transform database data to Brief format
        const transformedBriefs: Brief[] = data.map((brief: any) => ({
          id: brief.id,
          brandId: brief.brand_id,
          brandName: brief.brand?.company_name || "Unknown Brand",
          campaignTitle: brief.campaign_title,
          objective: brief.objective,
          contentType: brief.content_type,
          style: brief.style,
          aspectRatios: brief.aspect_ratios || [],
          durationSeconds: brief.duration_seconds,
          resolution: brief.resolution,
          quantity: brief.quantity,
          toolsPreferred: brief.tools_preferred || [],
          referenceLinks: brief.reference_links || [],
          budgetMin: brief.budget_min,
          budgetMax: brief.budget_max,
          deadline: brief.deadline,
          commercialUse: brief.commercial_use || {},
          negativeKeywords: brief.negative_keywords || [],
          status: brief.status,
          generatedByAI: brief.generated_by_ai || false,
          rawIdea: brief.raw_idea,
          createdAt: brief.created_at,
          updatedAt: brief.updated_at,
        }));
        setBriefs(transformedBriefs);
      } else {
        // Use seed data if no database data
        setBriefs(seedBriefs);
      }
    } catch (err) {
      console.warn("Falling back to localStorage:", err);
      setError("Using demo data");
      const stored = storage.read<Brief[]>(KEY) ?? [];
      setBriefs([...seedBriefs, ...stored]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBriefs();

    // Subscribe to real-time updates if Supabase is configured
    if (!isSupabaseConfigured()) return;

    const supabase = createClient();
    const channel = supabase
      .channel("briefs_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "briefs",
        },
        () => {
          fetchBriefs();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [fetchBriefs]);

  const saveBrief = useCallback(
    async (brief: Brief) => {
      if (!isSupabaseConfigured()) {
        // Fallback to localStorage
        const stored = storage.read<Brief[]>(KEY) ?? [];
        const exists = stored.findIndex((b) => b.id === brief.id);
        const updated =
          exists >= 0
            ? stored.map((b) => (b.id === brief.id ? brief : b))
            : [...stored, brief];
        storage.write(KEY, updated);
        setBriefs([...seedBriefs, ...updated]);
        return;
      }

      try {
        const supabase = createClient();
        
        // Check if brief exists
        const { data: existing } = await supabase
          .from("briefs")
          .select("id")
          .eq("id", brief.id)
          .single();

        const briefData = {
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

        if (existing) {
          // Update existing brief
          const { error } = await supabase
            .from("briefs")
            .update(briefData)
            .eq("id", brief.id);
          if (error) throw error;
        } else {
          // Insert new brief
          const { error } = await supabase
            .from("briefs")
            .insert({ ...briefData, id: brief.id, brand_id: brief.brandId });
          if (error) throw error;
        }

        await fetchBriefs();
      } catch (err) {
        console.error("Error saving brief:", err);
        // Fallback to localStorage on error
        const stored = storage.read<Brief[]>(KEY) ?? [];
        const exists = stored.findIndex((b) => b.id === brief.id);
        const updated =
          exists >= 0
            ? stored.map((b) => (b.id === brief.id ? brief : b))
            : [...stored, brief];
        storage.write(KEY, updated);
        setBriefs([...seedBriefs, ...updated]);
      }
    },
    [fetchBriefs]
  );

  const deleteBrief = useCallback(
    async (id: string) => {
      if (!isSupabaseConfigured()) {
        const stored = storage.read<Brief[]>(KEY) ?? [];
        const updated = stored.filter((b) => b.id !== id);
        storage.write(KEY, updated);
        setBriefs([...seedBriefs, ...updated]);
        return;
      }

      try {
        const supabase = createClient();
        const { error } = await supabase.from("briefs").delete().eq("id", id);
        if (error) throw error;
        await fetchBriefs();
      } catch (err) {
        console.error("Error deleting brief:", err);
        throw err;
      }
    },
    [fetchBriefs]
  );

  const updateBriefStatus = useCallback(
    async (id: string, status: BriefStatus) => {
      if (!isSupabaseConfigured()) {
        const stored = storage.read<Brief[]>(KEY) ?? [];
        const updated = stored.map((b) =>
          b.id === id ? { ...b, status } : b
        );
        storage.write(KEY, updated);
        setBriefs([...seedBriefs, ...updated]);
        return;
      }

      try {
        const supabase = createClient();
        const { error } = await supabase
          .from("briefs")
          .update({ status })
          .eq("id", id);
        if (error) throw error;
        await fetchBriefs();
      } catch (err) {
        console.error("Error updating brief status:", err);
        throw err;
      }
    },
    [fetchBriefs]
  );

  const getBrief = useCallback(
    (id: string) => briefs.find((b) => b.id === id),
    [briefs]
  );

  return {
    briefs,
    loading,
    error,
    saveBrief,
    deleteBrief,
    updateBriefStatus,
    getBrief,
  };
}
