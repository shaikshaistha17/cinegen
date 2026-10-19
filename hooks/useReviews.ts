"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase";

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
};

export interface Review {
  id: string;
  briefId: string;
  creatorId: string;
  brandId: string;
  rating: number;
  comment: string;
  createdAt: string;
  brandName?: string;
}

export function useReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const getReviewsForCreator = useCallback(async (creatorId: string) => {
    if (!isSupabaseConfigured() || !creatorId) {
      setLoading(false);
      return [];
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("reviews")
        .select("*, brand:brand_profiles(company_name)")
        .eq("creator_id", creatorId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const transformedReviews: Review[] =
        data?.map((review: any) => ({
          id: review.id,
          briefId: review.brief_id,
          creatorId: review.creator_id,
          brandId: review.brand_id,
          rating: review.rating,
          comment: review.comment || "",
          createdAt: review.created_at,
          brandName: review.brand?.company_name,
        })) || [];

      setReviews(transformedReviews);
      setLoading(false);
      return transformedReviews;
    } catch (err) {
      console.error("Error fetching reviews:", err);
      setLoading(false);
      return [];
    }
  }, []);

  const submitReview = useCallback(
    async (
      briefId: string,
      creatorId: string,
      rating: number,
      comment: string
    ) => {
      if (!isSupabaseConfigured()) {
        throw new Error("Supabase not configured");
      }

      if (rating < 1 || rating > 5) {
        throw new Error("Rating must be between 1 and 5");
      }

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        // Get brand profile
        const { data: brandProfile, error: brandError } = await supabase
          .from("brand_profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (brandError) throw brandError;

        // Check if brand already reviewed this creator for this brief
        const { data: existing, error: existingError } = await supabase
          .from("reviews")
          .select("id")
          .eq("brief_id", briefId)
          .eq("creator_id", creatorId)
          .eq("brand_id", brandProfile.id)
          .single();

        if (existing) {
          throw new Error("You have already reviewed this creator for this brief");
        }

        // Submit review
        const { data, error } = await supabase
          .from("reviews")
          .insert({
            brief_id: briefId,
            creator_id: creatorId,
            brand_id: brandProfile.id,
            rating,
            comment,
          })
          .select()
          .single();

        if (error) throw error;

        // Update creator's average rating
        await calculateAverageRating(creatorId);

        return data;
      } catch (err) {
        console.error("Error submitting review:", err);
        throw err;
      }
    },
    []
  );

  const calculateAverageRating = useCallback(async (creatorId: string) => {
    if (!isSupabaseConfigured()) {
      return 0;
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("reviews")
        .select("rating")
        .eq("creator_id", creatorId);

      if (error) throw error;

      if (!data || data.length === 0) return 0;

      const sum = data.reduce((acc: number, review: any) => acc + review.rating, 0);
      const average = sum / data.length;

      // Update creator profile stats
      const { error: updateError } = await supabase.rpc("update_creator_rating", {
        p_creator_id: creatorId,
        p_avg_rating: average,
      });

      if (updateError) {
        // Fallback: update directly
        const { data: profile } = await supabase
          .from("creator_profiles")
          .select("stats")
          .eq("id", creatorId)
          .single();

        if (profile) {
          const updatedStats = {
            ...profile.stats,
            avgRating: average,
          };
          await supabase
            .from("creator_profiles")
            .update({ stats: updatedStats })
            .eq("id", creatorId);
        }
      }

      return average;
    } catch (err) {
      console.error("Error calculating average rating:", err);
      return 0;
    }
  }, []);

  return {
    reviews,
    loading,
    getReviewsForCreator,
    submitReview,
    calculateAverageRating,
  };
}
