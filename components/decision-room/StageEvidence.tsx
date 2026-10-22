"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Shield, CheckCircle2, AlertCircle, XCircle, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Image from "next/image";

interface CreatorMatch {
  creator: {
    id: string;
    name: string;
    handle: string;
    avatar_url: string;
    headline: string;
    hourly_rate: number;
    verification_status: string;
  };
  matches: Array<{
    requirement: string;
    evidence: Array<{
      type: 'portfolio' | 'tool' | 'specialization';
      title?: string;
      description?: string;
      verified: boolean;
      portfolio_item_id?: string;
    }>;
    status: 'matched' | 'partial' | 'missing';
  }>;
  score: number;
}

interface StageEvidenceProps {
  roomId: string;
  selectedCreatorId?: string | null;
  onSelectCreator: (creatorId: string) => Promise<void>;
}

export default function StageEvidence({ roomId, selectedCreatorId, onSelectCreator }: StageEvidenceProps) {
  const [creators, setCreators] = useState<CreatorMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCreator, setExpandedCreator] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);
  
  useEffect(() => {
    fetchCreators();
  }, [roomId]);
  
  const fetchCreators = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/decision-room/${roomId}/creators`);
      if (!res.ok) {
        throw new Error('Failed to fetch creators');
      }
      
      const data = await res.json();
      setCreators(data.creators || []);
    } catch (err) {
      console.error('Failed to fetch creators:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSelectCreator = async (creatorId: string) => {
    setSelecting(true);
    try {
      await onSelectCreator(creatorId);
    } finally {
      setSelecting(false);
    }
  };
  
  const toggleExpanded = (creatorId: string) => {
    setExpandedCreator(expandedCreator === creatorId ? null : creatorId);
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'matched':
        return <CheckCircle2 className="w-5 h-5 text-green-400" />;
      case 'partial':
        return <AlertCircle className="w-5 h-5 text-yellow-400" />;
      case 'missing':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return null;
    }
  };
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
        <p className="text-gray-400">Finding matched creators...</p>
      </div>
    );
  }
  
  if (creators.length === 0) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-gray-400">No creators matched your requirements yet.</p>
        <p className="text-sm text-gray-500">Complete the previous stages to improve matching.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">Matched Creators</h3>
        <p className="text-sm text-gray-400">Creators ranked by portfolio evidence and requirement match</p>
      </div>
      
      <div className="space-y-4">
        {creators.map((match) => {
          const isExpanded = expandedCreator === match.creator.id;
          const isSelected = selectedCreatorId === match.creator.id;
          
          return (
            <motion.div
              key={match.creator.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-6 bg-white/5 border rounded-xl space-y-4 ${
                isSelected ? 'border-violet-500 ring-2 ring-violet-500/50' : 'border-white/10'
              }`}
            >
              {/* Creator Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  {/* Avatar */}
                  <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-violet-500 to-cyan-500 flex-shrink-0">
                    {match.creator.avatar_url ? (
                      <Image
                        src={match.creator.avatar_url}
                        alt={match.creator.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
                        {match.creator.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-lg font-semibold text-white truncate">{match.creator.name}</h4>
                      {match.creator.verification_status !== 'Unverified' && (
                        <div title={match.creator.verification_status}>
                          <Shield className="w-4 h-4 text-cyan-400" />
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 mb-2">@{match.creator.handle}</p>
                    <p className="text-sm text-gray-300 line-clamp-2">{match.creator.headline}</p>
                    
                    {/* Match Score */}
                    <div className="mt-3 flex items-center gap-2">
                      <div className="text-sm text-gray-400">Match Score:</div>
                      <div className="flex-1 max-w-xs h-2 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${match.score * 100}%` }}
                          transition={{ duration: 0.5, delay: 0.2 }}
                          className="h-full bg-gradient-to-r from-violet-500 to-cyan-500"
                        />
                      </div>
                      <div className="text-sm font-semibold text-white">{Math.round(match.score * 100)}%</div>
                    </div>
                  </div>
                </div>
                
                {/* Rate */}
                <div className="text-right flex-shrink-0">
                  <div className="text-sm text-gray-400">Hourly Rate</div>
                  <div className="text-xl font-bold text-white">{formatCurrency(match.creator.hourly_rate)}</div>
                  <div className="text-xs text-gray-500 mt-1">Creator stated</div>
                </div>
              </div>
              
              {/* Requirement Matches Summary */}
              <div className="flex flex-wrap gap-2">
                {match.matches.map((req, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-full text-sm"
                  >
                    {getStatusIcon(req.status)}
                    <span className="text-gray-300">{req.requirement.split(':')[0]}</span>
                  </div>
                ))}
              </div>
              
              {/* Why This Creator - Expandable */}
              <button
                onClick={() => toggleExpanded(match.creator.id)}
                className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 transition-colors"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Hide Evidence
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Why this creator?
                  </>
                )}
              </button>
              
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 pt-4 border-t border-white/10"
                  >
                    {match.matches.map((req, idx) => (
                      <div key={idx} className="space-y-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(req.status)}
                          <strong className="text-white">{req.requirement}</strong>
                        </div>
                        
                        {req.evidence.length > 0 ? (
                          <div className="ml-7 space-y-2">
                            {req.evidence.map((ev, evIdx) => (
                              <div key={evIdx} className="p-3 bg-white/5 rounded-lg">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="text-sm font-medium text-gray-300">{ev.title}</div>
                                    {ev.description && (
                                      <div className="text-xs text-gray-400 mt-1">{ev.description}</div>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {ev.verified ? 'Admin verified' : 'Creator stated'}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="ml-7 text-sm text-gray-500 italic">No evidence found</div>
                        )}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Select Button */}
              <button
                onClick={() => handleSelectCreator(match.creator.id)}
                disabled={selecting || isSelected}
                className={`w-full px-6 py-3 rounded-lg font-semibold transition-all ${
                  isSelected
                    ? 'bg-violet-600 text-white'
                    : 'bg-white/10 text-white hover:bg-white/20'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {selecting ? (
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                ) : null}
                {isSelected ? 'Selected' : 'Select This Creator'}
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
