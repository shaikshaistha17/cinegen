"use client";
import { useState, useEffect, useCallback } from "react";
import { Proposal, ProposalStatus } from "@/types";
import { storage } from "@/lib/storage";
import { seedProposals } from "@/lib/seed/proposals";
import { createClient } from "@/lib/supabase";

const KEY = "cinegen_proposals";

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
};

export function useProposals() {
  const [proposals, setProposals] = useState<Proposal[]>(seedProposals);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProposals = useCallback(async () => {
    // Fallback to localStorage if Supabase not configured
    if (!isSupabaseConfigured()) {
      const stored = storage.read<Proposal[]>(KEY) ?? [];
      setProposals([...seedProposals, ...stored]);
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      
      // Get current user to apply RLS filtering
      const { data: { user } } = await supabase.auth.getUser();

      let query = supabase
        .from("proposals")
        .select("*")
        .order("created_at", { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      if (data && data.length > 0) {
        // Transform database data to Proposal format
        const transformedProposals: Proposal[] = data.map((proposal: any) => ({
          id: proposal.id,
          briefId: proposal.brief_id,
          creatorId: proposal.creator_id,
          message: proposal.message,
          price: proposal.price,
          timelineDays: proposal.timeline_days,
          status: proposal.status,
          createdAt: proposal.created_at,
        }));
        setProposals(transformedProposals);
      } else {
        // Use seed data if no database data
        setProposals(seedProposals);
      }
    } catch (err) {
      console.warn("Falling back to localStorage:", err);
      setError("Using demo data");
      const stored = storage.read<Proposal[]>(KEY) ?? [];
      setProposals([...seedProposals, ...stored]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProposals();

    // Subscribe to real-time updates if Supabase is configured
    if (!isSupabaseConfigured()) return;

    const supabase = createClient();
    const channel = supabase
      .channel("proposals_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "proposals",
        },
        () => {
          fetchProposals();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [fetchProposals]);

  const submitProposal = useCallback(
    async (briefId: string, data: { message: string; price: number; timelineDays: number; creatorId: string }) => {
      if (!isSupabaseConfigured()) {
        // Fallback to localStorage
        const newProposal: Proposal = {
          id: `prop_${Date.now()}`,
          briefId,
          creatorId: data.creatorId,
          message: data.message,
          price: data.price,
          timelineDays: data.timelineDays,
          status: "Pending",
          createdAt: new Date().toISOString(),
        };
        const stored = storage.read<Proposal[]>(KEY) ?? [];
        const updated = [...stored, newProposal];
        storage.write(KEY, updated);
        setProposals([...seedProposals, ...updated]);
        return newProposal;
      }

      try {
        const supabase = createClient();
        const { data: proposal, error } = await supabase
          .from("proposals")
          .insert({
            brief_id: briefId,
            creator_id: data.creatorId,
            message: data.message,
            price: data.price,
            timeline_days: data.timelineDays,
            status: "Pending",
          })
          .select()
          .single();

        if (error) throw error;
        await fetchProposals();
        return proposal;
      } catch (err) {
        console.error("Error submitting proposal:", err);
        // Fallback to localStorage on error
        const newProposal: Proposal = {
          id: `prop_${Date.now()}`,
          briefId,
          creatorId: data.creatorId,
          message: data.message,
          price: data.price,
          timelineDays: data.timelineDays,
          status: "Pending",
          createdAt: new Date().toISOString(),
        };
        const stored = storage.read<Proposal[]>(KEY) ?? [];
        const updated = [...stored, newProposal];
        storage.write(KEY, updated);
        setProposals([...seedProposals, ...updated]);
        return newProposal;
      }
    },
    [fetchProposals]
  );

  const updateProposalStatus = useCallback(
    async (proposalId: string, status: ProposalStatus) => {
      if (!isSupabaseConfigured()) {
        const all = storage.read<Proposal[]>(KEY) ?? [];
        const seed = seedProposals.find((p) => p.id === proposalId);
        if (seed) {
          const override = { ...seed, status };
          const updated = [...all.filter((p) => p.id !== proposalId), override];
          storage.write(KEY, updated);
          setProposals([...seedProposals, ...updated]);
        } else {
          const updated = all.map((p) =>
            p.id === proposalId ? { ...p, status } : p
          );
          storage.write(KEY, updated);
          setProposals([...seedProposals, ...updated]);
        }
        return;
      }

      try {
        const supabase = createClient();
        const { error } = await supabase
          .from("proposals")
          .update({ status })
          .eq("id", proposalId);
        if (error) throw error;
        await fetchProposals();
      } catch (err) {
        console.error("Error updating proposal status:", err);
        throw err;
      }
    },
    [fetchProposals]
  );

  const getProposalsForBrief = useCallback(
    (briefId: string) => proposals.filter((p) => p.briefId === briefId),
    [proposals]
  );

  const getProposalsForCreator = useCallback(
    (creatorId: string) => proposals.filter((p) => p.creatorId === creatorId),
    [proposals]
  );

  return {
    proposals,
    loading,
    error,
    submitProposal,
    updateProposalStatus,
    getProposalsForBrief,
    getProposalsForCreator,
  };
}
