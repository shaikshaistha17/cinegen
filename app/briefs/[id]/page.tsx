"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import { CreatorMatches } from "@/components/briefs/CreatorMatches";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, DollarSign, Package, Clock, Shield } from "lucide-react";
import Link from "next/link";
import type { Brief } from "@/types";

export default function BriefDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { session } = useSession();
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    fetchBrief();
  }, [params.id]);

  const fetchBrief = async () => {
    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('briefs')
        .select('*')
        .eq('id', params.id)
        .single();

      if (fetchError) throw fetchError;

      // Transform snake_case to camelCase
      const transformedBrief: Brief = {
        id: data.id,
        brandId: data.brand_id,
        brandName: data.brand_name || 'Brand',
        campaignTitle: data.campaign_title,
        objective: data.objective,
        contentType: data.content_type,
        style: data.style,
        aspectRatios: data.aspect_ratios || [],
        durationSeconds: data.duration_seconds,
        resolution: data.resolution,
        quantity: data.quantity || 1,
        toolsPreferred: data.tools_preferred || [],
        referenceLinks: data.reference_links || [],
        budgetMin: data.budget_min || 0,
        budgetMax: data.budget_max || 0,
        deadline: data.deadline,
        commercialUse: data.commercial_use || {},
        negativeKeywords: data.negative_keywords || [],
        status: data.status,
        generatedByAI: data.generated_by_ai || false,
        rawIdea: data.raw_idea,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setBrief(transformedBrief);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-white/10 rounded w-1/3" />
          <div className="h-64 bg-white/10 rounded" />
          <div className="h-48 bg-white/10 rounded" />
        </div>
      </div>
    );
  }

  if (error || !brief) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Brief Not Found</h2>
        <p className="text-muted-foreground mb-6">{error || 'This brief does not exist.'}</p>
        <Link href="/briefs" className="text-violet-400 hover:text-violet-300">
          ← Back to Briefs
        </Link>
      </div>
    );
  }

  const isBrandOwner = session?.role === 'brand' && session?.brandId === brief.brandId;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        {brief.generatedByAI && (
          <span className="text-xs px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-full">
            ✨ AI Generated
          </span>
        )}
      </div>

      {/* Brief Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl border border-white/10 p-8"
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex-1">
            <h1 className="text-3xl font-display font-bold mb-2">{brief.campaignTitle}</h1>
            <p className="text-muted-foreground">{brief.brandName}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            brief.status === 'Open' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
            brief.status === 'Draft' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
            'bg-blue-500/10 text-blue-400 border border-blue-500/20'
          }`}>
            {brief.status}
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Objective</h3>
              <p className="text-sm">{brief.objective}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Visual Style</h3>
              <p className="text-sm">{brief.style}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Content Type</h3>
              <p className="text-sm">{brief.contentType}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-sm font-semibold">Budget</p>
                <p className="text-sm text-muted-foreground">
                  ${brief.budgetMin.toLocaleString()} - ${brief.budgetMax.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-sm font-semibold">Deadline</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(brief.deadline).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-sm font-semibold">Quantity</p>
                <p className="text-sm text-muted-foreground">{brief.quantity} deliverable(s)</p>
              </div>
            </div>
          </div>
        </div>

        {brief.toolsPreferred.length > 0 && (
          <div className="pt-4 border-t border-white/10">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Preferred Tools</h3>
            <div className="flex flex-wrap gap-2">
              {brief.toolsPreferred.map((tool) => (
                <span key={tool} className="text-xs px-2 py-1 bg-white/5 border border-white/10 rounded-full">
                  {tool}
                </span>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Creator Matches - Only show to brand owners */}
      {isBrandOwner && (
        <CreatorMatches briefId={brief.id} />
      )}

      {/* For creators or non-owners, show a message */}
      {!isBrandOwner && session?.role === 'creator' && (
        <div className="glass-card rounded-2xl border border-white/10 p-8 text-center">
          <h3 className="text-xl font-semibold mb-2">Interested in this brief?</h3>
          <p className="text-muted-foreground mb-4">Submit a proposal to get matched with the brand.</p>
          <Link
            href={`/briefs?apply=${brief.id}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-colors text-sm font-medium"
          >
            Submit Proposal
          </Link>
        </div>
      )}
    </div>
  );
}
