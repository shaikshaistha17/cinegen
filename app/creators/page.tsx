"use client";
import { useState, useMemo, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, SlidersHorizontal, X, Star, ChevronDown, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useCreators } from "@/hooks/useCreators";
import { CreatorCard } from "@/components/creators/CreatorCard";
import { CreatorCardSkeleton } from "@/components/creators/CreatorCardSkeleton";
import { ContentType, AiTool, AvailabilityStatus, FilterState } from "@/types";

const ALL_TOOLS: AiTool[] = ["Midjourney", "Runway", "Kling", "Veo", "Sora", "Pika", "Luma", "Flux", "ComfyUI", "Stable Diffusion", "ElevenLabs", "Suno", "HeyGen", "Topaz", "Higgsfield"];
const ALL_CONTENT_TYPES: ContentType[] = ["Short-form Video", "Long-form Video", "Animation", "Motion Graphics", "Image Campaign", "Social Media Pack", "Brand Film"];
const ALL_AVAILABILITY: AvailabilityStatus[] = ["Available", "Limited", "Booked"];

const SORT_OPTIONS = [
  { value: "relevance", label: "Most Relevant" },
  { value: "rating", label: "Top Rated" },
  { value: "rate_asc", label: "Rate: Low to High" },
  { value: "rate_desc", label: "Rate: High to Low" },
  { value: "projects", label: "Most Projects" },
];

const DEFAULT_FILTERS: FilterState = {
  search: "",
  tools: [],
  skills: [],
  specializations: [],
  aspectRatios: [],
  licenseTiers: [],
  availabilityStatuses: [],
  hourlyRateMin: 0,
  hourlyRateMax: 200,
  verifiedOnly: false,
  sortBy: "relevance",
};

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-violet-500/20 text-violet-300 rounded-full border border-violet-500/30">
      {label}
      <button onClick={onRemove} className="hover:text-white transition-colors">
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

export default function CreatorsPage() {
  const { creators, loading } = useCreators();
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const setFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
    setFilters((f) => ({ ...f, [key]: value }));

  const toggleArray = <T,>(key: keyof FilterState, value: T) => {
    setFilters((f) => {
      const arr = f[key] as T[];
      const exists = arr.includes(value);
      return { ...f, [key]: exists ? arr.filter((v) => v !== value) : [...arr, value] };
    });
  };

  const filtered = useMemo(() => {
    let result = [...creators];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.headline.toLowerCase().includes(q) ||
          c.bio.toLowerCase().includes(q) ||
          c.skills.some((s) => s.toLowerCase().includes(q)) ||
          c.specializations.some((s) => s.toLowerCase().includes(q)) ||
          c.verifiedTools.some((t) => t.name.toLowerCase().includes(q))
      );
    }

    if (filters.tools.length > 0) {
      result = result.filter((c) =>
        filters.tools.some((t) => c.verifiedTools.some((ct) => ct.name === t))
      );
    }

    if (filters.specializations.length > 0) {
      result = result.filter((c) =>
        filters.specializations.some((s) => c.specializations.includes(s))
      );
    }

    if (filters.availabilityStatuses.length > 0) {
      result = result.filter((c) => filters.availabilityStatuses.includes(c.availability));
    }

    if (filters.verifiedOnly) {
      result = result.filter((c) => c.verification.badge === "Studio" || c.verification.badge === "Verified");
    }

    result = result.filter(
      (c) => c.hourlyRateUsd >= filters.hourlyRateMin && c.hourlyRateUsd <= filters.hourlyRateMax
    );

    switch (filters.sortBy) {
      case "rating": result.sort((a, b) => b.stats.avgRating - a.stats.avgRating); break;
      case "rate_asc": result.sort((a, b) => a.hourlyRateUsd - b.hourlyRateUsd); break;
      case "rate_desc": result.sort((a, b) => b.hourlyRateUsd - a.hourlyRateUsd); break;
      case "projects": result.sort((a, b) => b.stats.projectsCompleted - a.stats.projectsCompleted); break;
      default:
        result.sort((a, b) => {
          if (a.verification.badge === "Studio" && b.verification.badge !== "Studio") return -1;
          if (b.verification.badge === "Studio" && a.verification.badge !== "Studio") return 1;
          return b.stats.avgRating - a.stats.avgRating;
        });
    }

    return result;
  }, [creators, filters]);

  const activeFilters: { label: string; remove: () => void }[] = [
    ...filters.tools.map((t) => ({ label: t, remove: () => toggleArray("tools", t) })),
    ...filters.specializations.map((s) => ({ label: s, remove: () => toggleArray("specializations", s) })),
    ...filters.availabilityStatuses.map((a) => ({ label: a, remove: () => toggleArray("availabilityStatuses", a) })),
    ...(filters.verifiedOnly ? [{ label: "Verified Only", remove: () => setFilter("verifiedOnly", false) }] : []),
    ...(filters.hourlyRateMax < 200 ? [{ label: `≤ $${filters.hourlyRateMax}/hr`, remove: () => setFilter("hourlyRateMax", 200) }] : []),
  ];

  const hasActiveFilters = activeFilters.length > 0;

  const mostRestrictive = useMemo(() => {
    if (filtered.length > 0) return null;
    if (filters.tools.length > 0) return `tools: ${filters.tools.slice(0, 2).join(", ")}`;
    if (filters.specializations.length > 0) return `specialization: ${filters.specializations[0]}`;
    if (filters.verifiedOnly) return "Verified Only filter";
    return null;
  }, [filtered, filters]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl mb-2">Discover AI Creators</h1>
        <p className="text-muted-foreground">Find the perfect AI filmmaker, animator, or generative artist for your campaign</p>
        <Link
          href="/compare"
          className="inline-flex items-center gap-2 mt-3 px-4 py-2 glass border border-violet-500/20 text-violet-300 rounded-xl text-sm font-medium hover:bg-violet-500/10 transition-all"
        >
          <span>⚖️</span> Compare Creators Side-by-Side
        </Link>
      </div>

      {/* Search bar */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, skill, tool, specialization..."
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 placeholder:text-muted-foreground transition-all"
          />
          {filters.search && (
            <button onClick={() => setFilter("search", "")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${filtersOpen ? "bg-violet-500/20 border-violet-500/40 text-violet-300" : "bg-white/5 border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/10"}`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-violet-400" />}
        </button>

        <select
          value={filters.sortBy}
          onChange={(e) => setFilter("sortBy", e.target.value as FilterState["sortBy"])}
          className="hidden sm:block px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-muted-foreground focus:outline-none focus:border-violet-500/50 cursor-pointer"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mb-5">
          {activeFilters.map((f) => (
            <FilterChip key={f.label} label={f.label} onRemove={f.remove} />
          ))}
          <button
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          >
            Clear all
          </button>
        </div>
      )}

      <div className="flex gap-6">
        {/* Sidebar Filters */}
        {filtersOpen && (
          <aside className="hidden md:block w-64 flex-shrink-0">
            <div className="sticky top-24 glass rounded-2xl border border-white/5 p-5 space-y-6 max-h-[80vh] overflow-y-auto">
                {/* Tools */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">AI Tools</h3>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {ALL_TOOLS.map((tool) => (
                      <label key={tool} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={filters.tools.includes(tool)}
                          onChange={() => toggleArray("tools", tool)}
                          className="w-3.5 h-3.5 rounded accent-violet-500 cursor-pointer"
                        />
                        <span className={`text-sm transition-colors ${filters.tools.includes(tool) ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}>
                          {tool}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Specializations */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Specialization</h3>
                  <div className="space-y-1.5">
                    {ALL_CONTENT_TYPES.map((type) => (
                      <label key={type} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={filters.specializations.includes(type)}
                          onChange={() => toggleArray("specializations", type)}
                          className="w-3.5 h-3.5 rounded accent-violet-500 cursor-pointer"
                        />
                        <span className={`text-sm transition-colors ${filters.specializations.includes(type) ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}>
                          {type}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Availability */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Availability</h3>
                  <div className="space-y-1.5">
                    {ALL_AVAILABILITY.map((avail) => (
                      <label key={avail} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={filters.availabilityStatuses.includes(avail)}
                          onChange={() => toggleArray("availabilityStatuses", avail)}
                          className="w-3.5 h-3.5 rounded accent-violet-500 cursor-pointer"
                        />
                        <span className={`text-sm transition-colors ${filters.availabilityStatuses.includes(avail) ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}>
                          {avail}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Rate range */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Hourly Rate: up to ${filters.hourlyRateMax}/hr
                  </h3>
                  <input
                    type="range"
                    min={0}
                    max={200}
                    step={10}
                    value={filters.hourlyRateMax}
                    onChange={(e) => setFilter("hourlyRateMax", Number(e.target.value))}
                    className="w-full accent-violet-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>$0</span>
                    <span>$200+</span>
                  </div>
                </div>

                {/* Verified only */}
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.verifiedOnly}
                      onChange={(e) => setFilter("verifiedOnly", e.target.checked)}
                      className="w-4 h-4 rounded accent-violet-500 cursor-pointer"
                    />
                    <div>
                      <div className="text-sm font-medium flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5 text-violet-400" />
                        Verified Only
                      </div>
                      <div className="text-xs text-muted-foreground">Studio or Verified badge</div>
                    </div>
                  </label>
                </div>

                <button
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                  className="w-full py-2 text-sm text-muted-foreground hover:text-foreground border border-white/10 rounded-lg hover:bg-white/5 transition-all"
                >
                  Reset all filters
                </button>
              </div>
            </aside>
          )}

        {/* Results */}
        <div className="flex-1">
          {/* Results count */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              <span className="text-foreground font-semibold">{filtered.length}</span> creators found
            </p>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => <CreatorCardSkeleton key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            /* Empty State */
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-6">
                <Search className="w-8 h-8 text-violet-400" />
              </div>
              <h3 className="font-display font-semibold text-xl mb-2">No creators match</h3>
              <p className="text-muted-foreground mb-2">
                {mostRestrictive ? `The ${mostRestrictive} filter is most restrictive.` : "Try adjusting your filters."}
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {activeFilters.map((f) => (
                  <button
                    key={f.label}
                    onClick={f.remove}
                    className="text-sm px-3 py-1.5 bg-violet-500/10 border border-violet-500/20 text-violet-300 rounded-lg hover:bg-violet-500/20 transition-all"
                  >
                    Remove: {f.label}
                  </button>
                ))}
                <button
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                  className="text-sm px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all"
                >
                  Clear all filters
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((creator, i) => (
                <CreatorCard key={creator.id} creator={creator} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
