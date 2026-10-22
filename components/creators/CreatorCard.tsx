"use client";
import { useState } from "react";
import Link from "next/link";
import { Star, CheckCircle, MapPin, Eye } from "lucide-react";
import { CreatorProfile } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { motion, useMotionValue, useTransform } from "framer-motion";

const BADGE_STYLES: Record<string, string> = {
  Studio: "bg-violet-500/90 text-white border border-violet-400/30",
  Verified: "bg-cyan-500/90 text-white border border-cyan-400/30",
  Rising: "bg-amber-500/90 text-white border border-amber-400/30",
  Unverified: "bg-white/20 text-white/80 border border-white/10",
};

const AVAIL_STYLES: Record<string, string> = {
  Available: "text-green-400",
  Limited: "text-amber-400",
  Booked: "text-red-400",
};

// Tool color map for visual variety
const TOOL_COLORS: Record<string, string> = {
  "Runway": "bg-blue-500/15 text-blue-300",
  "Midjourney": "bg-violet-500/15 text-violet-300",
  "Kling": "bg-pink-500/15 text-pink-300",
  "Sora": "bg-cyan-500/15 text-cyan-300",
  "Pika": "bg-orange-500/15 text-orange-300",
  "Luma": "bg-green-500/15 text-green-300",
  "Flux": "bg-yellow-500/15 text-yellow-300",
  "ComfyUI": "bg-red-500/15 text-red-300",
  "Stable Diffusion": "bg-purple-500/15 text-purple-300",
  "ElevenLabs": "bg-teal-500/15 text-teal-300",
  "Suno": "bg-lime-500/15 text-lime-300",
  "HeyGen": "bg-sky-500/15 text-sky-300",
  "Topaz": "bg-indigo-500/15 text-indigo-300",
  "Higgsfield": "bg-rose-500/15 text-rose-300",
  "Veo": "bg-emerald-500/15 text-emerald-300",
};

export function CreatorCard({ creator, index = 0 }: { creator: CreatorProfile; index?: number }) {
  const [isHovered, setIsHovered] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const rotateX = useTransform(y, [-100, 100], [5, -5]);
  const rotateY = useTransform(x, [-100, 100], [-5, 5]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set(e.clientX - centerX);
    y.set(e.clientY - centerY);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      style={{ 
        rotateX: isHovered ? rotateX : 0, 
        rotateY: isHovered ? rotateY : 0,
        transformStyle: "preserve-3d"
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
    >
      <Link href={`/creators/${creator.id}`}>
        <div className="glass-card rounded-2xl border border-white/8 hover:border-violet-500/40 transition-all duration-500 group hover:-translate-y-2 hover:shadow-2xl hover:shadow-violet-500/20 cursor-pointer overflow-hidden h-full relative"
          style={{ 
            background: "rgba(255,255,255,0.05)", 
            backdropFilter: "blur(16px)",
          }}>

          {/* Animated gradient border on hover */}
          <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500 via-indigo-500 to-teal-500 animate-gradient-shift blur-sm" 
              style={{ padding: "1px", margin: "-1px" }} />
          </div>

          {/* Cover — real image */}
          <div className="relative h-36 overflow-hidden bg-gradient-to-br from-violet-900 to-indigo-900">
            <img
              src={creator.coverUrl}
              alt=""
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

            {/* Animated shimmer on hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

            {/* Badge with pulsing glow */}
            <div className={`absolute top-3 right-3 text-xs px-2 py-0.5 rounded-full font-semibold backdrop-blur-sm ${BADGE_STYLES[creator.verification.badge]} ${
              creator.verification.badge === "Studio" ? "animate-pulse-glow" : ""
            }`}>
              {creator.verification.badge === "Studio" && "★ "}
              {creator.verification.badge}
            </div>

            {/* View Profile overlay on hover */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: isHovered ? 1 : 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center"
            >
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white font-semibold text-sm">
                <Eye className="w-4 h-4" />
                View Profile
              </div>
            </motion.div>

            {/* Availability */}
            <div className={`absolute top-3 left-3 text-xs font-bold flex items-center gap-1 px-2 py-0.5 rounded-full backdrop-blur-sm ${
              creator.availability === "Available"
                ? "bg-green-500/20 text-green-300 border border-green-500/40"
                : creator.availability === "Limited"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "bg-red-500/20 text-red-300 border border-red-500/40"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                creator.availability === "Available" ? "bg-green-400" :
                creator.availability === "Limited" ? "bg-amber-400" : "bg-red-400"
              }`} />
              {creator.availability}
            </div>

            {/* Specialization pill */}
            <div className="absolute bottom-3 left-3 text-xs px-2 py-0.5 bg-black/60 backdrop-blur-sm text-white/90 rounded-full border border-white/10 font-medium">
              {creator.specializations[0]}
            </div>
          </div>

          <div className="p-4">
            {/* Avatar + name row */}
            <div className="flex items-start gap-3 -mt-9 mb-3 relative z-10">
              <div className="w-14 h-14 rounded-xl border-2 border-background overflow-hidden shadow-xl flex-shrink-0 bg-gradient-to-br from-violet-600 to-cyan-600 flex items-center justify-center text-white font-bold text-xl ring-2 ring-purple-500/50 group-hover:ring-purple-400 transition-all">
                {creator.name.charAt(0)}
              </div>
              <div className="pt-5">
                <div className="font-semibold text-sm leading-tight">{creator.name}</div>
                <div className="text-xs text-muted-foreground">{creator.handle}</div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">{creator.headline}</p>

            {/* Tools with hover scale + glow */}
            <div className="flex flex-wrap gap-1 mb-4">
              {creator.verifiedTools.slice(0, 4).map((t) => (
                <motion.span 
                  key={t.name}
                  whileHover={{ scale: 1.05 }}
                  className={`flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-md font-medium transition-all hover:shadow-lg ${TOOL_COLORS[t.name] ?? "bg-white/5 text-muted-foreground"}`}>
                  {t.verified && <CheckCircle className="w-2.5 h-2.5" />}
                  {t.name}
                </motion.span>
              ))}
              {creator.verifiedTools.length > 4 && (
                <span className="text-xs px-1.5 py-0.5 bg-white/5 rounded-md text-muted-foreground">+{creator.verifiedTools.length - 4}</span>
              )}
            </div>

            {/* Stats row */}
            <div className="flex items-center justify-between text-xs border-t border-white/5 pt-3">
              <span className="flex items-center gap-1 font-semibold text-amber-400">
                <Star className="w-3 h-3 fill-amber-400" />
                {creator.stats.avgRating}
                <span className="text-muted-foreground font-normal">({creator.stats.projectsCompleted})</span>
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="w-3 h-3" />
                {creator.location.split(",")[0]}
              </span>
              <span className="font-bold text-foreground">
                {formatCurrency(creator.hourlyRate)}<span className="text-muted-foreground font-normal text-xs">/hr</span>
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
