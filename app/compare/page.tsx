"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useCreators } from "@/hooks/useCreators";
import { formatCurrency } from "@/lib/utils";
import { CreatorProfile } from "@/types";
import { Star, CheckCircle, X, Plus, ArrowLeft, Zap, DollarSign } from "lucide-react";
import Link from "next/link";

const COMPARE_FIELDS = [
  { label: "Hourly Rate", key: "rate" },
  { label: "Rating", key: "rating" },
  { label: "Projects Completed", key: "projects" },
  { label: "Repeat Client Rate", key: "repeat" },
  { label: "Response Time", key: "response" },
  { label: "Availability", key: "availability" },
  { label: "Verification Badge", key: "badge" },
  { label: "AI Tools", key: "tools" },
  { label: "Specializations", key: "specs" },
];

function getValue(creator: CreatorProfile, key: string) {
  switch (key) {
    case "rate": return `${formatCurrency(creator.hourlyRate)}/hr`;
    case "rating": return `${creator.stats.avgRating} ★`;
    case "projects": return `${creator.stats.projectsCompleted}`;
    case "repeat": return `${creator.stats.repeatClientRate}%`;
    case "response": return creator.stats.responseTime;
    case "availability": return creator.availability;
    case "badge": return creator.verification.badge;
    case "tools": return creator.verifiedTools.map((t) => t.name).join(", ");
    case "specs": return creator.specializations.join(", ");
    default: return "—";
  }
}

function getBest(creators: CreatorProfile[], key: string): string | null {
  if (creators.length < 2) return null;
  switch (key) {
    case "rate": return creators.reduce((a, b) => a.hourlyRate < b.hourlyRate ? a : b).id;
    case "rating": return creators.reduce((a, b) => a.stats.avgRating > b.stats.avgRating ? a : b).id;
    case "projects": return creators.reduce((a, b) => a.stats.projectsCompleted > b.stats.projectsCompleted ? a : b).id;
    case "repeat": return creators.reduce((a, b) => a.stats.repeatClientRate > b.stats.repeatClientRate ? a : b).id;
    case "badge": return creators.find((c) => c.verification.badge === "Studio")?.id ?? null;
    default: return null;
  }
}

export default function ComparePage() {
  const { creators: allCreators } = useCreators();
  const [selected, setSelected] = useState<CreatorProfile[]>([]);
  const [search, setSearch] = useState("");

  const filtered = allCreators.filter((c) =>
    !selected.find((s) => s.id === c.id) &&
    (c.name.toLowerCase().includes(search.toLowerCase()) ||
     c.headline.toLowerCase().includes(search.toLowerCase()))
  );

  const addCreator = (c: CreatorProfile) => {
    if (selected.length < 3) setSelected([...selected, c]);
  };

  const removeCreator = (id: string) => setSelected(selected.filter((c) => c.id !== id));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/creators" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to creators
      </Link>

      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl mb-2">Compare Creators</h1>
        <p className="text-muted-foreground">Select up to 3 creators to compare side by side</p>
      </div>

      {/* Creator selector */}
      {selected.length < 3 && (
        <div className="glass rounded-2xl border border-white/10 p-5 mb-8">
          <h2 className="font-semibold text-sm mb-3">Add a creator to compare</h2>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or specialty..."
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-violet-500/50 mb-3 placeholder:text-muted-foreground"
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
            {filtered.slice(0, 12).map((c) => (
              <button
                key={c.id}
                onClick={() => addCreator(c)}
                className="flex items-center gap-2 p-2 glass border border-white/5 rounded-xl hover:border-violet-500/30 transition-all text-left group"
              >
                <img src={c.avatarUrl} alt={c.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate">{c.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{formatCurrency(c.hourlyRate)}/hr</div>
                </div>
                <Plus className="w-3.5 h-3.5 text-muted-foreground group-hover:text-violet-400 ml-auto flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {selected.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Zap className="w-12 h-12 mx-auto mb-4 text-violet-400/40" />
          <p className="text-lg font-medium mb-1">Select creators above to compare</p>
          <p className="text-sm">Add 2–3 creators to see a side-by-side breakdown</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left text-xs text-muted-foreground uppercase tracking-wider pb-4 pr-4 w-32">Attribute</th>
                {selected.map((creator) => (
                  <th key={creator.id} className="pb-4 px-3 min-w-[200px]">
                    <div className="glass rounded-2xl border border-white/10 p-4 text-left relative">
                      <button
                        onClick={() => removeCreator(creator.id)}
                        className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/10 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <img src={creator.avatarUrl} alt={creator.name} className="w-12 h-12 rounded-xl object-cover mb-3 border border-white/10" />
                      <div className="font-semibold text-sm">{creator.name}</div>
                      <div className="text-xs text-muted-foreground mb-2">{creator.handle}</div>
                      <div className={`text-xs px-2 py-0.5 rounded-full inline-block font-medium ${
                        creator.verification.badge === "Studio" ? "bg-violet-500/20 text-violet-300" :
                        creator.verification.badge === "Verified" ? "bg-cyan-500/20 text-cyan-300" :
                        "bg-white/10 text-muted-foreground"
                      }`}>{creator.verification.badge}</div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARE_FIELDS.map((field, i) => {
                const bestId = getBest(selected, field.key);
                return (
                  <motion.tr
                    key={field.key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="border-t border-white/5"
                  >
                    <td className="py-3 pr-4 text-xs text-muted-foreground font-medium">{field.label}</td>
                    {selected.map((creator) => {
                      const isBest = bestId === creator.id;
                      const val = getValue(creator, field.key);
                      return (
                        <td key={creator.id} className="py-3 px-3">
                          <div className={`text-sm rounded-lg px-3 py-2 ${
                            isBest ? "bg-violet-500/10 border border-violet-500/20 text-violet-300 font-medium" : "text-muted-foreground"
                          }`}>
                            {isBest && <span className="text-xs text-violet-400 mr-1">★</span>}
                            {field.key === "tools" || field.key === "specs" ? (
                              <div className="flex flex-wrap gap-1">
                                {val.split(", ").slice(0, 4).map((v) => (
                                  <span key={v} className="text-xs px-1.5 py-0.5 bg-white/5 rounded">{v}</span>
                                ))}
                              </div>
                            ) : field.key === "availability" ? (
                              <span className={
                                val === "Available" ? "text-green-400" :
                                val === "Limited" ? "text-amber-400" : "text-red-400"
                              }>● {val}</span>
                            ) : val}
                          </div>
                        </td>
                      );
                    })}
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected.length >= 2 && (
        <div className="mt-8 glass rounded-2xl border border-violet-500/20 p-5">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-violet-400" /> AI Recommendation
          </h3>
          {(() => {
            const best = selected.reduce((a, b) =>
              (a.stats.avgRating * 0.4 + a.stats.repeatClientRate * 0.3 + (20000 - a.hourlyRate) * 0.015) >
              (b.stats.avgRating * 0.4 + b.stats.repeatClientRate * 0.3 + (20000 - b.hourlyRate) * 0.015) ? a : b
            );
            return (
              <div className="flex items-center gap-3">
                <img src={best.avatarUrl} alt={best.name} className="w-10 h-10 rounded-xl object-cover" />
                <div>
                  <p className="text-sm font-semibold">{best.name} is the best overall match</p>
                  <p className="text-xs text-muted-foreground">
                    Highest combined score across rating ({best.stats.avgRating}★), repeat clients ({best.stats.repeatClientRate}%), and value for money.
                  </p>
                </div>
                <Link
                  href={`/creators/${best.id}`}
                  className="ml-auto px-4 py-2 bg-violet-500/20 border border-violet-500/30 text-violet-300 rounded-xl text-sm hover:bg-violet-500/30 transition-all flex-shrink-0"
                >
                  View Profile
                </Link>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
