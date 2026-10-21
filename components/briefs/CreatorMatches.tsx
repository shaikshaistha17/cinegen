"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Star, 
  TrendingUp, 
  AlertCircle, 
  Loader2, 
  ChevronDown, 
  ChevronUp,
  UserPlus,
  ExternalLink,
  Sparkles,
  Shield
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { CreatorMatch, MatchFactor, PortfolioMatch } from "@/lib/ai/creatorMatcher";

interface CreatorMatchesProps {
  briefId: string;
}

export function CreatorMatches({ briefId }: CreatorMatchesProps) {
  const [matches, setMatches] = useState<CreatorMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCreators, setExpandedCreators] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchMatches();
  }, [briefId]);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/briefs/${briefId}/matches`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch matches');
      }

      const data = await res.json();
      setMatches(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (creatorId: string) => {
    setExpandedCreators(prev => {
      const next = new Set(prev);
      if (next.has(creatorId)) {
        next.delete(creatorId);
      } else {
        next.add(creatorId);
      }
      return next;
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Recommended Creators</h3>
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card rounded-2xl p-6 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-white/10" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-white/10 rounded w-1/3" />
                  <div className="h-3 bg-white/10 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="glass-card rounded-2xl p-6 border border-red-500/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-300 mb-1">Failed to Load Matches</h3>
            <p className="text-sm text-muted-foreground mb-3">{error}</p>
            <button
              onClick={fetchMatches}
              className="text-sm px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (matches.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
          <Star className="w-8 h-8 text-purple-400" />
        </div>
        <h3 className="font-semibold text-lg mb-2">No Matching Creators Found</h3>
        <p className="text-sm text-muted-foreground">
          Try adjusting your brief requirements to see recommendations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Recommended Creators</h3>
          <p className="text-sm text-muted-foreground">
            Top {matches.length} matches based on skills, tools, budget, and availability
          </p>
        </div>
        {!matches.some(m => m.aiLabeled) && (
          <span className="text-xs px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full flex items-center gap-1">
            <Shield className="w-3 h-3" />
            Deterministic Baseline
          </span>
        )}
      </div>

      <div className="grid gap-4">
        {matches.map((match, idx) => {
          const isExpanded = expandedCreators.has(match.creatorId);
          const scoreColor = match.score >= 70 ? 'text-green-400' : match.score >= 50 ? 'text-amber-400' : 'text-gray-400';
          const scoreGradient = match.score >= 70 ? 'from-green-500 to-emerald-500' : match.score >= 50 ? 'from-amber-500 to-orange-500' : 'from-gray-500 to-gray-600';

          return (
            <motion.div
              key={match.creatorId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="glass-card rounded-2xl border border-white/10 overflow-hidden hover:border-white/20 transition-colors"
            >
              <div className="p-6">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold">
                      {match.creatorId.slice(0, 2).toUpperCase()}
                    </div>
                    {match.aiLabeled && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                        <Sparkles className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Creator info and score */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-base truncate">Creator {match.creatorId.slice(0, 8)}</h4>
                        <p className="text-sm text-muted-foreground">@creator_{match.creatorId.slice(0, 6)}</p>
                      </div>
                      
                      {/* Score display */}
                      <div className="flex flex-col items-end gap-1">
                        <div className={`text-3xl font-bold ${scoreColor}`}>
                          {match.score}
                        </div>
                        <div className="text-xs text-muted-foreground">Match Score</div>
                      </div>
                    </div>

                    {/* Score bar */}
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden mb-4">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${match.score}%` }}
                        transition={{ duration: 0.8, delay: idx * 0.05 }}
                        className={`h-full bg-gradient-to-r ${scoreGradient}`}
                      />
                    </div>

                    {/* Factor breakdown (always visible) */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {match.factors.map((factor, i) => (
                        <div key={i} className="text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-muted-foreground">{factor.factor}</span>
                            <span className="font-semibold">{factor.points}/{factor.maxPoints} pts</span>
                          </div>
                          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${(factor.points / factor.maxPoints) * 100}%` }}
                              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {match.aiLabeled && match.aiNote && (
                        <span className="text-xs px-2 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-full flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          AI-Assisted
                        </span>
                      )}
                      {match.mismatches.length > 0 && (
                        <span className="text-xs px-2 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full">
                          {match.mismatches.length} Mismatch{match.mismatches.length > 1 ? 'es' : ''}
                        </span>
                      )}
                      {match.missingEvidence.length > 0 && (
                        <span className="text-xs px-2 py-1 bg-gray-500/10 border border-gray-500/20 text-gray-400 rounded-full">
                          {match.missingEvidence.length} Missing Info
                        </span>
                      )}
                    </div>

                    {/* Expand toggle */}
                    <button
                      onClick={() => toggleExpand(match.creatorId)}
                      className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          Hide Details
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          View Details
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-6 pt-6 border-t border-white/10 space-y-4 overflow-hidden"
                    >
                      {/* Detailed reasons */}
                      <div>
                        <h5 className="text-sm font-semibold mb-2">Score Breakdown</h5>
                        <div className="space-y-2">
                          {match.reasons.map((reason, i) => (
                            <div key={i} className="text-xs text-muted-foreground pl-3 border-l-2 border-blue-500/30">
                              {reason}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Matched portfolio items */}
                      {match.matchedPortfolioItems.length > 0 && (
                        <div>
                          <h5 className="text-sm font-semibold mb-2">Relevant Portfolio</h5>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {match.matchedPortfolioItems.map((item) => (
                              <a
                                key={item.id}
                                href={item.mediaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group relative aspect-video rounded-lg overflow-hidden bg-white/5 hover:bg-white/10 transition-colors"
                              >
                                <Image
                                  src={item.thumbnailUrl}
                                  alt={item.title}
                                  fill
                                  className="object-cover"
                                />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <ExternalLink className="w-5 h-5 text-white" />
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                                  <p className="text-xs font-medium truncate">{item.title}</p>
                                  <p className="text-[10px] text-gray-300 truncate">{item.relevance}</p>
                                </div>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Mismatches */}
                      {match.mismatches.length > 0 && (
                        <div>
                          <h5 className="text-sm font-semibold mb-2 text-amber-400">Potential Issues</h5>
                          <div className="space-y-1">
                            {match.mismatches.map((mismatch, i) => (
                              <div key={i} className="text-xs text-amber-300/80 pl-3 border-l-2 border-amber-500/30">
                                {mismatch}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Missing evidence */}
                      {match.missingEvidence.length > 0 && (
                        <div>
                          <h5 className="text-sm font-semibold mb-2 text-gray-400">Missing Information</h5>
                          <div className="space-y-1">
                            {match.missingEvidence.map((missing, i) => (
                              <div key={i} className="text-xs text-gray-400 pl-3 border-l-2 border-gray-500/30">
                                {missing}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* AI note */}
                      {match.aiNote && (
                        <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
                          <h5 className="text-sm font-semibold mb-1 text-purple-400 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            AI Assessment
                          </h5>
                          <p className="text-xs text-muted-foreground">{match.aiNote}</p>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex gap-3 pt-2">
                        <Link
                          href={`/creators/${match.creatorId}`}
                          className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors text-sm font-medium text-center"
                        >
                          View Profile
                        </Link>
                        <Link
                          href={`/briefs/${briefId}?invite=${match.creatorId}`}
                          className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-colors text-sm font-medium text-center flex items-center justify-center gap-2"
                        >
                          <UserPlus className="w-4 h-4" />
                          Invite to Brief
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
