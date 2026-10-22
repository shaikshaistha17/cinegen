"use client";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, X, Clock, Briefcase } from "lucide-react";
import Link from "next/link";
import { useServices } from "@/hooks/useServices";
import { CreatorService, PriceRange } from "@/types";

const ALL_SKILLS = [
  "Video Editing",
  "Motion Graphics",
  "Color Grading",
  "Sound Design",
  "Scriptwriting",
  "Storyboarding",
  "AI Video Generation",
  "3D Animation",
  "VFX",
  "Compositing",
];

const PRICE_RANGES: PriceRange[] = ["₹50k-₹1L", "₹1L-₹2.5L", "₹2.5L-₹4L", "₹4L-₹8L", "₹8L+"];

const DELIVERY_TIMES = ["1-2 days", "3-5 days", "1 week", "2 weeks", "Custom"];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "price_low", label: "Price: Low to High" },
  { value: "price_high", label: "Price: High to Low" },
];

interface FilterState {
  search: string;
  skills: string[];
  priceRanges: PriceRange[];
  deliveryTimes: string[];
  sortBy: string;
}

const DEFAULT_FILTERS: FilterState = {
  search: "",
  skills: [],
  priceRanges: [],
  deliveryTimes: [],
  sortBy: "newest",
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

function ServiceCard({ service, index }: { service: CreatorService; index: number }) {
  const priceColor = service.priceRange === "₹8L+" ? "from-amber-500 to-amber-600" :
                     service.priceRange === "₹4L-₹8L" ? "from-violet-500 to-violet-600" :
                     "from-cyan-500 to-cyan-600";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <Link href={`/services/${service.id}`}>
        <div className="glass-card rounded-2xl border border-white/8 hover:border-violet-500/40 transition-all duration-500 group hover:-translate-y-2 hover:shadow-2xl hover:shadow-violet-500/20 cursor-pointer overflow-hidden h-full"
          style={{ 
            background: "rgba(255,255,255,0.05)", 
            backdropFilter: "blur(16px)",
          }}>
          
          {/* Creator header */}
          <div className="p-4 pb-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {service.creatorName?.charAt(0) || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{service.creatorName || "Unknown Creator"}</div>
                <div className="text-xs text-muted-foreground truncate">{service.creatorHandle || "@creator"}</div>
              </div>
            </div>
          </div>

          <div className="p-4">
            {/* Service title */}
            <h3 className="font-semibold text-base mb-2 group-hover:text-violet-300 transition-colors">
              {service.title}
            </h3>

            {/* Description */}
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
              {service.description}
            </p>

            {/* Skills */}
            <div className="flex flex-wrap gap-1 mb-4">
              {service.skills.slice(0, 4).map((skill) => (
                <span
                  key={skill}
                  className="text-xs px-1.5 py-0.5 bg-violet-500/10 border border-violet-500/20 text-violet-300 rounded"
                >
                  {skill}
                </span>
              ))}
              {service.skills.length > 4 && (
                <span className="text-xs px-1.5 py-0.5 bg-white/5 rounded text-muted-foreground">
                  +{service.skills.length - 4}
                </span>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-white/5">
              <div className={`text-xs px-2 py-1 bg-gradient-to-r ${priceColor} rounded-lg text-white font-semibold`}>
                {service.priceRange}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {service.deliveryTime}
              </div>
            </div>

            {/* View Details button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full mt-3 py-2 bg-gradient-to-r from-violet-600/20 to-cyan-600/20 border border-violet-500/30 text-violet-300 rounded-lg text-sm font-medium hover:from-violet-600/30 hover:to-cyan-600/30 transition-all"
            >
              View Details
            </motion.button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function ServicesPage() {
  const { services, loading } = useServices();
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
    let result = [...services];

    // Search filter
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.skills.some((sk) => sk.toLowerCase().includes(q)) ||
          (s.creatorName && s.creatorName.toLowerCase().includes(q))
      );
    }

    // Skills filter
    if (filters.skills.length > 0) {
      result = result.filter((s) =>
        filters.skills.some((skill) => s.skills.includes(skill))
      );
    }

    // Price range filter
    if (filters.priceRanges.length > 0) {
      result = result.filter((s) => filters.priceRanges.includes(s.priceRange));
    }

    // Delivery time filter
    if (filters.deliveryTimes.length > 0) {
      result = result.filter((s) => filters.deliveryTimes.includes(s.deliveryTime));
    }

    // Sort
    switch (filters.sortBy) {
      case "price_low":
        result.sort((a, b) => {
          const priceOrder: Record<PriceRange, number> = {
            "₹50k-₹1L": 1,
            "₹1L-₹2.5L": 2,
            "₹2.5L-₹4L": 3,
            "₹4L-₹8L": 4,
            "₹8L+": 5,
          };
          return priceOrder[a.priceRange] - priceOrder[b.priceRange];
        });
        break;
      case "price_high":
        result.sort((a, b) => {
          const priceOrder: Record<PriceRange, number> = {
            "₹50k-₹1L": 1,
            "₹1L-₹2.5L": 2,
            "₹2.5L-₹4L": 3,
            "₹4L-₹8L": 4,
            "₹8L+": 5,
          };
          return priceOrder[b.priceRange] - priceOrder[a.priceRange];
        });
        break;
      default: // newest
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return result;
  }, [services, filters]);

  const activeFilters: { label: string; remove: () => void }[] = [
    ...filters.skills.map((s) => ({ label: s, remove: () => toggleArray("skills", s) })),
    ...filters.priceRanges.map((p) => ({ label: p, remove: () => toggleArray("priceRanges", p) })),
    ...filters.deliveryTimes.map((d) => ({ label: d, remove: () => toggleArray("deliveryTimes", d) })),
  ];

  const hasActiveFilters = activeFilters.length > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl mb-2">
          <span className="gradient-text">Discover Creator Services</span>
        </h1>
        <p className="text-muted-foreground">Browse ready-to-book services from verified AI creators</p>
      </div>

      {/* Search bar */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search services, skills, or creators..."
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 placeholder:text-muted-foreground transition-all"
          />
          {filters.search && (
            <button
              onClick={() => setFilter("search", "")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
            filtersOpen
              ? "bg-violet-500/20 border-violet-500/40 text-violet-300"
              : "bg-white/5 border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/10"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-violet-400" />}
        </button>

        <select
          value={filters.sortBy}
          onChange={(e) => setFilter("sortBy", e.target.value)}
          className="hidden sm:block px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-muted-foreground focus:outline-none focus:border-violet-500/50 cursor-pointer"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
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
              {/* Skills */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Skills
                </h3>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {ALL_SKILLS.map((skill) => (
                    <label key={skill} className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={filters.skills.includes(skill)}
                        onChange={() => toggleArray("skills", skill)}
                        className="w-3.5 h-3.5 rounded accent-violet-500 cursor-pointer"
                      />
                      <span
                        className={`text-sm transition-colors ${
                          filters.skills.includes(skill)
                            ? "text-foreground"
                            : "text-muted-foreground group-hover:text-foreground"
                        }`}
                      >
                        {skill}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Price Range
                </h3>
                <div className="space-y-1.5">
                  {PRICE_RANGES.map((range) => (
                    <label key={range} className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={filters.priceRanges.includes(range)}
                        onChange={() => toggleArray("priceRanges", range)}
                        className="w-3.5 h-3.5 rounded accent-violet-500 cursor-pointer"
                      />
                      <span
                        className={`text-sm transition-colors ${
                          filters.priceRanges.includes(range)
                            ? "text-foreground"
                            : "text-muted-foreground group-hover:text-foreground"
                        }`}
                      >
                        {range}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Delivery Time */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Delivery Time
                </h3>
                <div className="space-y-1.5">
                  {DELIVERY_TIMES.map((time) => (
                    <label key={time} className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={filters.deliveryTimes.includes(time)}
                        onChange={() => toggleArray("deliveryTimes", time)}
                        className="w-3.5 h-3.5 rounded accent-violet-500 cursor-pointer"
                      />
                      <span
                        className={`text-sm transition-colors ${
                          filters.deliveryTimes.includes(time)
                            ? "text-foreground"
                            : "text-muted-foreground group-hover:text-foreground"
                        }`}
                      >
                        {time}
                      </span>
                    </label>
                  ))}
                </div>
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
              <span className="text-foreground font-semibold">{filtered.length}</span> services found
            </p>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="glass rounded-2xl border border-white/5 p-4 h-64 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            /* Empty State */
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-6">
                <Briefcase className="w-8 h-8 text-violet-400" />
              </div>
              <h3 className="font-display font-semibold text-xl mb-2">No services match</h3>
              <p className="text-muted-foreground mb-2">Try adjusting your filters or search terms.</p>
              <button
                onClick={() => setFilters(DEFAULT_FILTERS)}
                className="mt-4 text-sm px-4 py-2 bg-violet-500/10 border border-violet-500/20 text-violet-300 rounded-lg hover:bg-violet-500/20 transition-all"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((service, i) => (
                <ServiceCard key={service.id} service={service} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
