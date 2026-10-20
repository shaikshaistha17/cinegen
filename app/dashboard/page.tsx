"use client";
import Link from "next/link";
import { useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Plus, FileText, Users, CheckCircle, Briefcase, Star, TrendingUp, ArrowRight, Clock, Zap, Search } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { useBriefs } from "@/hooks/useBriefs";
import { useProposals } from "@/hooks/useProposals";
import { useCreators } from "@/hooks/useCreators";
import { useCountUp } from "@/hooks/useCountUp";
import { EngagementStage } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

const ConfettiExplosion = dynamic(() => import("react-confetti-explosion"), { ssr: false });

const STAGES: EngagementStage[] = ["Discovery", "Brief", "Proposals", "Hired", "Delivered"];

function EngagementStepper({ currentStage }: { currentStage: EngagementStage }) {
  const currentIdx = STAGES.indexOf(currentStage);
  return (
    <div className="flex items-center gap-0">
      {STAGES.map((stage, i) => (
        <div key={stage} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              i < currentIdx ? "bg-green-500 text-white" :
              i === currentIdx ? "bg-gradient-to-br from-violet-500 to-cyan-500 text-white ring-2 ring-violet-500/30" :
              "bg-white/5 text-muted-foreground border border-white/10"
            }`}>
              {i < currentIdx ? <CheckCircle className="w-4 h-4" /> : i + 1}
            </div>
            <span className="text-xs text-muted-foreground mt-1 hidden sm:block">{stage}</span>
          </div>
          {i < STAGES.length - 1 && (
            <div className={`h-px w-8 sm:w-12 mx-1 transition-all ${i < currentIdx ? "bg-green-500" : "bg-white/10"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function StatCard({ stat, index }: { stat: any; index: number }) {
  const numericValue = typeof stat.value === "number" ? stat.value : 0;
  const countUpValue = useCountUp(numericValue, 1500);
  const displayValue = stat.isCurrency ? formatCurrency(countUpValue) : 
                      typeof stat.value === "string" ? stat.value : countUpValue;
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20, scale: 0.9 }} 
      animate={{ opacity: 1, y: 0, scale: 1 }} 
      transition={{ delay: index * 0.1, duration: 0.4 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="glass-card rounded-xl border border-white/5 p-4 relative overflow-hidden group">
      {/* Gradient background on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative">
        <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.1 + 0.2 }}
          className="text-2xl font-display font-bold">
          {displayValue}
        </motion.div>
        <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
      </div>
    </motion.div>
  );
}

function BrandDashboard() {
  const { session } = useSession();
  const { briefs } = useBriefs();
  const { proposals } = useProposals();
  const { creators } = useCreators();
  const [delivered, setDelivered] = useState<string[]>([]);
  const [showConfetti, setShowConfetti] = useState<string | null>(null);

  const myBriefs = briefs.filter((b) => b.brandId === "brand-001");
  const totalProposals = proposals.filter((p) => myBriefs.some((b) => b.id === p.briefId));
  const acceptedProposals = totalProposals.filter((p) => p.status === "Accepted" || p.status === "Shortlisted");
  const displayEngagements = acceptedProposals.length > 0 ? acceptedProposals : proposals.slice(0, 2);

  const activeBriefsCount = myBriefs.filter((b) => b.status === "Open").length;
  const proposalsReceivedCount = totalProposals.length;
  const creatorsHiredCount = acceptedProposals.length;
  const totalBudget = myBriefs.reduce((s, b) => s + b.budgetMax, 0);

  const stats = [
    { label: "Active Briefs", value: activeBriefsCount, icon: FileText, color: "text-violet-400" },
    { label: "Proposals Received", value: proposalsReceivedCount, icon: Users, color: "text-cyan-400" },
    { label: "Creators Hired", value: creatorsHiredCount, icon: CheckCircle, color: "text-green-400" },
    { label: "Total Budget", value: formatCurrency(totalBudget), icon: TrendingUp, color: "text-amber-400", isCurrency: true },
  ];

  const handleMarkDelivered = (proposalId: string, creatorName: string) => {
    setDelivered((prev) => [...prev, proposalId]);
    setShowConfetti(proposalId);
    setTimeout(() => setShowConfetti(null), 3000);
    toast.success(`${creatorName} marked delivery complete!`);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display font-bold text-3xl mb-1">Brand Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {session?.name}</p>
      </div>

      {/* Primary action with enhanced gradient + glow */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600/30 via-indigo-600/20 to-cyan-600/20 border border-violet-500/30 p-6 btn-glow">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 to-transparent pointer-events-none" />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display font-bold text-xl mb-1">Ready to find your next AI creator?</h2>
            <p className="text-sm text-muted-foreground">Post a brief and get matched with top creators in minutes.</p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link href="/briefs/new"
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-xl text-sm font-semibold hover:from-violet-500 hover:to-violet-400 transition-all shadow-lg shadow-violet-500/25 whitespace-nowrap btn-glow">
                <Plus className="w-4 h-4" /> Post a Brief
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link href="/estimator"
                className="flex items-center gap-2 px-5 py-2.5 glass border border-white/10 text-sm font-medium rounded-xl hover:bg-white/5 transition-all whitespace-nowrap">
                💰 Estimate Budget
              </Link>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Account Settings Link */}
      <div className="flex justify-end">
        <Link 
          href="/settings/password"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          🔒 Change Password
        </Link>
      </div>

      {/* Stats with count-up animations and gradient backgrounds */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard stat={stats[0]} index={0} />
        <StatCard stat={stats[1]} index={1} />
        <StatCard stat={stats[2]} index={2} />
        <StatCard stat={stats[3]} index={3} />
      </div>

      {/* Engagements */}
      <div>
        <h2 className="font-display font-semibold text-xl mb-4">Active Engagements</h2>
        <div className="space-y-4">
          {displayEngagements.map((proposal, i) => {
            const brief = briefs.find((b) => b.id === proposal.briefId) || myBriefs[0];
            const creator = creators.find((c) => c.id === proposal.creatorId);
            if (!brief || !creator) return null;
            const isDelivered = delivered.includes(proposal.id);
            const stage = isDelivered ? "Delivered" :
                          proposal.status === "Accepted" ? "Hired" :
                          proposal.status === "Shortlisted" ? "Proposals" : "Proposals";
            return (
              <motion.div key={proposal.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="glass rounded-2xl border border-white/5 p-5">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <img src={creator.avatarUrl} alt={creator.name} className="w-11 h-11 rounded-xl object-cover border border-white/10" />
                    <div>
                      <div className="font-semibold text-sm">{creator.name}</div>
                      <div className="text-xs text-muted-foreground">{brief.campaignTitle}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-bold text-green-400">{formatCurrency(proposal.price)}</div>
                      <div className={`text-xs px-2 py-0.5 rounded-full mt-1 ${
                        isDelivered ? "bg-green-500/20 text-green-300" :
                        proposal.status === "Accepted" ? "bg-green-500/10 text-green-400" :
                        proposal.status === "Shortlisted" ? "bg-blue-500/10 text-blue-400" :
                        "bg-amber-500/10 text-amber-400"
                      }`}>{isDelivered ? "✅ Delivered" : proposal.status}</div>
                    </div>
                    {proposal.status === "Accepted" && !isDelivered && (
                      <div className="relative">
                        <button
                          onClick={() => handleMarkDelivered(proposal.id, creator.name)}
                          className="px-3 py-1.5 bg-green-500/20 border border-green-500/30 text-green-300 rounded-lg text-xs font-medium hover:bg-green-500/30 hover:scale-105 transition-all whitespace-nowrap">
                          ✓ Mark Delivered
                        </button>
                        {showConfetti === proposal.id && (
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-50">
                            <ConfettiExplosion
                              force={0.6}
                              duration={2500}
                              particleCount={50}
                              width={600}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <EngagementStepper currentStage={stage as any} />
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Recent Briefs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-xl">Recent Briefs</h2>
          <Link href="/briefs" className="text-sm text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1">
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="space-y-3">
          {myBriefs.slice(0, 3).map((brief, i) => (
            <div key={brief.id} className="glass rounded-xl border border-white/5 p-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    brief.status === "Open" ? "bg-green-500/10 text-green-400" :
                    brief.status === "Draft" ? "bg-amber-500/10 text-amber-400" :
                    "bg-blue-500/10 text-blue-400"
                  }`}>{brief.status}</span>
                </div>
                <p className="font-medium text-sm truncate">{brief.campaignTitle}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-xs font-semibold">{formatCurrency(brief.budgetMax)}</div>
                <div className="text-xs text-muted-foreground">{proposals.filter((p) => p.briefId === brief.id).length} proposals</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <Link href="/briefs/new" className="w-full flex items-center justify-center gap-2 py-3 glass border border-violet-500/20 text-violet-400 rounded-xl text-sm font-medium hover:bg-violet-500/10 transition-all">
            <Plus className="w-4 h-4" /> Create New Brief
          </Link>
        </div>
      </div>
    </div>
  );
}

function CreatorDashboard() {
  const { session } = useSession();
  const { briefs } = useBriefs();
  const { proposals, getProposalsForCreator } = useProposals();

  const myId = session?.creatorId ?? "creator-001";
  const myProposals = getProposalsForCreator(myId);
  const openBriefs = briefs.filter((b) => b.status === "Open");
  const acceptedProposals = myProposals.filter((p) => p.status === "Accepted");

  const stats = [
    { label: "Proposals Sent", value: myProposals.length, icon: Send, color: "text-violet-400" },
    { label: "Accepted", value: acceptedProposals.length, icon: CheckCircle, color: "text-green-400" },
    { label: "Open Briefs", value: openBriefs.length, icon: FileText, color: "text-cyan-400" },
    { label: "Response Rate", value: "98%", icon: TrendingUp, color: "text-amber-400" },
  ];

  const PROPOSAL_STATUS_STYLES: Record<string, string> = {
    Pending: "bg-amber-500/10 text-amber-300",
    Shortlisted: "bg-blue-500/10 text-blue-300",
    Accepted: "bg-green-500/10 text-green-300",
    Rejected: "bg-red-500/10 text-red-400",
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl mb-1">Creator Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {session?.name}</p>
        </div>
        <Link 
          href="/settings/password"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          🔒 Change Password
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="glass rounded-xl border border-white/5 p-4">
            <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
            <div className="text-2xl font-display font-bold">{stat.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* My Proposals */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-xl">My Proposals</h2>
          <Link href="/briefs" className="text-sm text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1">
            Browse briefs <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {myProposals.length > 0 ? (
          <div className="space-y-3">
            {myProposals.map((proposal, i) => {
              const brief = briefs.find((b) => b.id === proposal.briefId);
              if (!brief) return null;
              return (
                <motion.div key={proposal.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="glass rounded-xl border border-white/5 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{brief.campaignTitle}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{proposal.message}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${PROPOSAL_STATUS_STYLES[proposal.status]}`}>{proposal.status}</span>
                      <div className="text-xs font-semibold mt-1">{formatCurrency(proposal.price)}</div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="glass rounded-2xl border border-dashed border-white/10 p-8 text-center">
            <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm mb-4">No proposals yet. Browse open briefs and submit your first proposal.</p>
            <Link href="/briefs" className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/20 border border-violet-500/30 text-violet-300 rounded-xl text-sm font-medium hover:bg-violet-500/30 transition-all">
              Browse Open Briefs
            </Link>
          </div>
        )}
      </div>

      {/* Matching Briefs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-xl">🔔 New Briefs Matching Your Profile</h2>
          <span className="text-xs px-2 py-1 bg-violet-500/20 text-violet-300 rounded-full border border-violet-500/30 animate-pulse">
            {openBriefs.length} new
          </span>
        </div>
        <div className="space-y-3">
          {openBriefs.slice(0, 3).map((brief, i) => (
            <motion.div key={brief.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="glass rounded-xl border border-white/5 hover:border-violet-500/20 transition-all p-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{brief.campaignTitle}</p>
                <p className="text-xs text-muted-foreground">{brief.brandName} · {brief.contentType}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-sm font-semibold text-green-400">{formatCurrency(brief.budgetMin)}–{formatCurrency(brief.budgetMax)}</span>
                <Link href="/briefs" className="text-xs px-3 py-1.5 bg-violet-500/20 border border-violet-500/30 text-violet-300 rounded-lg hover:bg-violet-500/30 transition-all">
                  Apply
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Manage My Services */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-600/30 via-indigo-600/20 to-violet-600/20 border border-cyan-500/30 p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/10 to-transparent pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center shadow-lg">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-display font-bold text-xl">Manage My Services</h3>
              <p className="text-sm text-muted-foreground">Post and manage your service offerings</p>
            </div>
          </div>
          <Link
            href="/dashboard/creator/services"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white rounded-xl text-sm font-semibold hover:from-cyan-500 hover:to-cyan-400 transition-all shadow-lg shadow-cyan-500/25"
          >
            <Briefcase className="w-4 h-4" /> View My Services
          </Link>
        </div>
      </div>
    </div>
  );
}

function Send(props: any) {
  return <Zap {...props} />;
}

export default function DashboardPage() {
  const { session } = useSession();

  if (!session) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="font-display text-2xl mb-3">Sign in to view your dashboard</h2>
        <Link href="/login" className="text-violet-400 hover:text-violet-300 transition-colors">Go to login →</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {session.role === "brand" ? <BrandDashboard /> : <CreatorDashboard />}
    </div>
  );
}
