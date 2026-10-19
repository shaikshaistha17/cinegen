"use client";
import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
};

export type VerificationType = "tools" | "workflow" | "past_work";
export type VerificationStatus = "pending" | "approved" | "rejected";

export interface Verification {
  id: string;
  creatorId: string;
  verificationType: VerificationType;
  status: VerificationStatus;
  evidenceUrl?: string;
  adminNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export function useVerifications() {
  const [loading, setLoading] = useState(false);

  const getVerificationStatus = useCallback(async (creatorId: string) => {
    if (!isSupabaseConfigured() || !creatorId) {
      return null;
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("verifications")
        .select("*")
        .eq("creator_id", creatorId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const transformedVerifications: Verification[] =
        data?.map((v: any) => ({
          id: v.id,
          creatorId: v.creator_id,
          verificationType: v.verification_type,
          status: v.status,
          evidenceUrl: v.evidence_url,
          adminNotes: v.admin_notes,
          reviewedBy: v.reviewed_by,
          reviewedAt: v.reviewed_at,
          createdAt: v.created_at,
        })) || [];

      return transformedVerifications;
    } catch (err) {
      console.error("Error fetching verification status:", err);
      return null;
    }
  }, []);

  const requestVerification = useCallback(
    async (
      creatorId: string,
      type: VerificationType,
      evidenceUrl: string
    ) => {
      if (!isSupabaseConfigured()) {
        throw new Error("Supabase not configured");
      }

      try {
        setLoading(true);
        const supabase = createClient();

        // Check if there's already a pending request of this type
        const { data: existing, error: existingError } = await supabase
          .from("verifications")
          .select("id")
          .eq("creator_id", creatorId)
          .eq("verification_type", type)
          .eq("status", "pending")
          .single();

        if (existing) {
          throw new Error(`You already have a pending ${type} verification request`);
        }

        const { data, error } = await supabase
          .from("verifications")
          .insert({
            creator_id: creatorId,
            verification_type: type,
            evidence_url: evidenceUrl,
            status: "pending",
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      } catch (err) {
        console.error("Error requesting verification:", err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const getPendingVerifications = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      return [];
    }

    try {
      setLoading(true);
      const supabase = createClient();

      // Check if user is admin
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: userRecord, error: userError } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (userError) throw userError;
      if (userRecord.role !== "admin") {
        throw new Error("Unauthorized: Admin access required");
      }

      const { data, error } = await supabase
        .from("verifications")
        .select("*, creator:creator_profiles(handle, user:users(name, email))")
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (err) {
      console.error("Error fetching pending verifications:", err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const approveVerification = useCallback(
    async (id: string, adminNotes?: string) => {
      if (!isSupabaseConfigured()) {
        throw new Error("Supabase not configured");
      }

      try {
        setLoading(true);
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        // Update verification status
        const { data, error } = await supabase
          .from("verifications")
          .update({
            status: "approved",
            admin_notes: adminNotes,
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", id)
          .select()
          .single();

        if (error) throw error;

        // Update creator profile verification state
        const { data: verification } = await supabase
          .from("verifications")
          .select("creator_id, verification_type")
          .eq("id", id)
          .single();

        if (verification) {
          const { data: profile } = await supabase
            .from("creator_profiles")
            .select("verification")
            .eq("id", verification.creator_id)
            .single();

          if (profile) {
            const updatedVerification = {
              ...profile.verification,
              [`${verification.verification_type}Verified`]: true,
            };

            // Update badge based on verification level
            let badge = "Unverified";
            if (
              updatedVerification.toolsVerified &&
              updatedVerification.workflowVerified &&
              updatedVerification.pastWorkVerified
            ) {
              badge = "Studio";
            } else if (
              updatedVerification.toolsVerified &&
              updatedVerification.workflowVerified
            ) {
              badge = "Verified";
            } else if (updatedVerification.toolsVerified) {
              badge = "Rising";
            }

            updatedVerification.badge = badge;

            await supabase
              .from("creator_profiles")
              .update({ verification: updatedVerification })
              .eq("id", verification.creator_id);
          }
        }

        return data;
      } catch (err) {
        console.error("Error approving verification:", err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const rejectVerification = useCallback(
    async (id: string, reason: string) => {
      if (!isSupabaseConfigured()) {
        throw new Error("Supabase not configured");
      }

      try {
        setLoading(true);
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const { data, error } = await supabase
          .from("verifications")
          .update({
            status: "rejected",
            admin_notes: reason,
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } catch (err) {
        console.error("Error rejecting verification:", err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    loading,
    getVerificationStatus,
    requestVerification,
    getPendingVerifications,
    approveVerification,
    rejectVerification,
  };
}
