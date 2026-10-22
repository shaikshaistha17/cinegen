"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useCreators } from "@/hooks/useCreators";
import { formatCurrency } from "@/lib/utils";
import { Trophy, Star, TrendingUp, Zap, CheckCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

type Period = "all" | "monthly" | "weekly";

const BADGE_STYLES: Record<string, string> = {
  Studio: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  Verified: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  Rising: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  Unverified: "bg-white/10 text-muted-foreground border-white/10",
};

const RANK_STYLES = [
  "from-yellow-400 to-amber-500",
  "from-slate-300 to-slate-400",
  "from-amber-600 to-amber-700",
];

export default function LeaderboardPage() {
  const { creators } = useCreators();
  const [period, setPeriod] = useState<Period>("all");
  const [metric, setMetric] = useState<"projects" | "rating" | "repeat">("projects");

  const sorted = [...creators].sort((a, b) => {
    if (metric === "projects") return b.stats.projectsCompleted - a.stats.projectsCompleted;
    if (metric === "rating") return b.stats.avgRating - a.stats.avgRating;
    return b.stats.repeatClientRate - a.stats.repeatClientRate;
  });

  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/creators" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to creators
      </Link>

      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm font-medium mb-4">
          <Trophy className="w-4 h-4" /> Creator Leaderboard
        </div>
        <h1 className="font-display font-bold text-4xl mb-2">Top AI Creators</h1>
        <p className="text-muted-foreground">Ranked by performance across the CineGen marketplace</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="flex gap-2 p-1 bg-white/5 rounded-xl">
          {(["all", "monthly", "weekly"] as Period[]).map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${period === p ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {p === "all" ? "All Time" : p === "monthly" ? "This Month" : "This Week"}
            </button>
          ))}
        </div>
        <div className="flex gap-2 p-1 bg-white/5 rounded-xl">
          {([
            { key: "projects", label: "Projects", icon: Zap },
            { key: "rating", label: "Rating", icon: Star },
            { key: "repeat", label: "Repeat", icon: TrendingUp },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setMetric(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${metric === key ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" : "text-muted-foreground hover:text-foreground"}`}>
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Top 3 podium */}
      <div className="grid grid-cols-3 gap-4 mb-8 items-end">
        {[top3[1], top3[0], top3[2]].map((creator, i) => {
          if (!creator) return <div key={i} />;
          const rank = i === 1 ? 1 : i === 0 ? 2 : 3;
          const heights = ["h-32", "h-40", "h-28"];
          const val = metric === "projects" ? `${creator.stats.projectsCompleted} projects`
            : metric === "rating" ? `${creator.stats.avgRating}★`
            : `${creator.stats.repeatClientRate}% repeat`;
          return (
            <motion.div key={creator.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="flex flex-col items-center">
              <Link href={`/creators/${creator.id}`} className="group">
                <div className="relative mb-3">
                  <img src={creator.avatarUrl} alt={creator.name}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-white/10 group-hover:border-violet-500/50 transition-all mx-auto" />
                  <div className={`absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-br ${RANK_STYLES[rank - 1]} flex items-center justify-center text-xs font-bold text-white shadow-lg`}>
                    {rank}
                  </div>
                </div>
                <div className="text-center mb-2">
                  <div className="font-semibold text-sm group-hover:text-violet-300 transition-colors">{creator.name}</div>
                  <div className="text-xs text-muted-foreground">{creator.handle}</div>
                  <div className={`text-sm font-bold mt-1 ${rank === 1 ? "text-amber-400" : rank === 2 ? "text-slate-300" : "text-amber-600"}`}>{val}</div>
                </div>
              </Link>
              <div className={`w-full ${heights[i]} bg-gradient-to-t ${rank === 1 ? "from-amber-500/30 to-amber-500/5 border-amber-500/30" : rank === 2 ? "from-slate-400/20 to-slate-400/5 border-slate-400/20" : "from-amber-700/20 to-amber-700/5 border-amber-700/20"} border rounded-t-xl`} />
            </motion.div>
          );
        })}
      </div>

      {/* Rest of leaderboard */}
      <div className="space-y-2">
        {rest.map((creator, i) => {
          const rank = i + 4;
          const val = metric === "projects" ? creator.stats.projectsCompleted
            : metric === "rating" ? creator.stats.avgRating
            : creator.stats.repeatClientRate;
          const unit = metric === "projects" ? " projects" : metric === "rating" ? "★" : "%";
          return (
            <motion.div key={creator.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
              <Link href={`/creators/${creator.id}`}
                className="flex items-center gap-4 p-4 glass rounded-xl border border-white/5 hover:border-violet-500/20 transition-all group">
                <span className="text-lg font-display font-bold text-muted-foreground w-8 text-center">{rank}</span>
                <img src={creator.avatarUrl} alt={creator.name} className="w-10 h-10 rounded-xl object-cover" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm group-hover:text-violet-300 transition-colors">{creator.name}</div>
                  <div className="text-xs text-muted-foreground">{creator.headline}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${BADGE_STYLES[creator.verification.badge]}`}>
                  {creator.verification.badge}
                </span>
                <div className="text-right">
                  <div className="font-bold text-sm">{val}{unit}</div>
                  <div className="text-xs text-muted-foreground">{formatCurrency(creator.hourlyRate)}/hr</div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
