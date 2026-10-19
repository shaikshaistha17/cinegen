"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { CreatorProfile } from "@/types";

type StyleAxis = {
  label: string;
  key: string;
  color: string;
};

const AXES: StyleAxis[] = [
  { label: "Cinematic", key: "cinematic", color: "#8b5cf6" },
  { label: "Bold", key: "bold", color: "#06b6d4" },
  { label: "Minimal", key: "minimal", color: "#10b981" },
  { label: "Experimental", key: "experimental", color: "#f59e0b" },
  { label: "Commercial", key: "commercial", color: "#ef4444" },
  { label: "Artistic", key: "artistic", color: "#ec4899" },
];

function getStyleScore(creator: CreatorProfile, key: string): number {
  const tools = creator.verifiedTools.map((t) => t.name.toLowerCase());
  const specs = creator.specializations.map((s) => s.toLowerCase());
  const bio = creator.bio.toLowerCase();
  const skills = creator.skills.map((s) => s.toLowerCase());

  switch (key) {
    case "cinematic":
      return Math.min(100, (
        (tools.some((t) => ["runway", "sora", "kling"].includes(t)) ? 30 : 0) +
        (specs.some((s) => s.includes("film") || s.includes("video")) ? 25 : 0) +
        (bio.includes("cinematic") || bio.includes("film") ? 25 : 0) +
        (creator.stats.avgRating > 4.8 ? 20 : 10)
      ));
    case "bold":
      return Math.min(100, (
        (tools.some((t) => ["midjourney", "flux"].includes(t)) ? 30 : 0) +
        (specs.some((s) => s.includes("social") || s.includes("short")) ? 20 : 0) +
        (bio.includes("bold") || bio.includes("dynamic") || bio.includes("energy") ? 25 : 0) +
        (creator.hourlyRateUsd > 100 ? 25 : 15)
      ));
    case "minimal":
      return Math.min(100, (
        (specs.some((s) => s.includes("image") || s.includes("motion")) ? 25 : 0) +
        (bio.includes("minimal") || bio.includes("clean") || bio.includes("elegant") ? 30 : 0) +
        (tools.some((t) => ["adobe firefly", "flux"].includes(t)) ? 25 : 0) +
        20
      ));
    case "experimental":
      return Math.min(100, (
        (tools.some((t) => ["comfyui", "stable diffusion"].includes(t)) ? 35 : 0) +
        (bio.includes("experimental") || bio.includes("pioneer") || bio.includes("avant") ? 30 : 0) +
        (specs.some((s) => s.includes("animation")) ? 20 : 0) +
        15
      ));
    case "commercial":
      return Math.min(100, (
        (creator.stats.projectsCompleted > 50 ? 30 : creator.stats.projectsCompleted > 25 ? 20 : 10) +
        (creator.stats.repeatClientRate > 80 ? 30 : 20) +
        (creator.verification.badge === "Studio" ? 25 : 15) +
        15
      ));
    case "artistic":
      return Math.min(100, (
        (bio.includes("art") || bio.includes("aesthetic") || bio.includes("visual") ? 30 : 0) +
        (specs.some((s) => s.includes("animation") || s.includes("motion")) ? 25 : 0) +
        (tools.some((t) => ["midjourney", "stable diffusion", "comfyui"].includes(t)) ? 25 : 0) +
        20
      ));
    default: return 50;
  }
}

function RadarChart({ scores }: { scores: Record<string, number> }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const size = 180;
  const center = size / 2;
  const radius = 70;
  const n = AXES.length;

  const getPoint = (i: number, r: number) => {
    const angle = (i * 2 * Math.PI) / n - Math.PI / 2;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const scorePoints = AXES.map((axis, i) => {
    const score = scores[axis.key] / 100;
    return getPoint(i, radius * score);
  });

  const polygonPoints = scorePoints.map((p) => `${p.x},${p.y}`).join(" ");

  const gridLevels = [0.25, 0.5, 0.75, 1.0];

  const pathLength = scorePoints.reduce((acc, p, i) => {
    if (i === 0) return 0;
    const prev = scorePoints[i - 1];
    return acc + Math.sqrt((p.x - prev.x) ** 2 + (p.y - prev.y) ** 2);
  }, 0);

  return (
    <div className="relative">
      <svg width={size} height={size} className="mx-auto">
        {/* Radial gradient for fill */}
        <defs>
          <radialGradient id="radarGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(139,92,246,0.4)" />
            <stop offset="50%" stopColor="rgba(99,102,241,0.3)" />
            <stop offset="100%" stopColor="rgba(20,184,166,0.2)" />
          </radialGradient>
        </defs>

        {/* Grid levels */}
        {gridLevels.map((level, idx) => {
          const points = AXES.map((_, i) => {
            const p = getPoint(i, radius * level);
            return `${p.x},${p.y}`;
          }).join(" ");
          return (
            <motion.polygon
              key={level}
              points={points}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: idx * 0.1 }}
            />
          );
        })}

        {/* Axis lines */}
        {AXES.map((_, i) => {
          const outer = getPoint(i, radius);
          return (
            <motion.line
              key={i}
              x1={center}
              y1={center}
              x2={outer.x}
              y2={outer.y}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
              initial={{ opacity: 0, pathLength: 0 }}
              animate={{ opacity: 1, pathLength: 1 }}
              transition={{ delay: 0.2 + i * 0.05 }}
            />
          );
        })}

        {/* Animated score polygon */}
        <motion.polygon
          points={polygonPoints}
          fill="url(#radarGradient)"
          stroke="#8b5cf6"
          strokeWidth="2"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.6, ease: "easeOut" }}
        />

        {/* Score dots with pulse on hover */}
        {scorePoints.map((p, i) => (
          <g key={i}>
            <motion.circle
              cx={p.x}
              cy={p.y}
              r={hoveredIndex === i ? "6" : "4"}
              fill={AXES[i].color}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 + i * 0.05 }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="cursor-pointer"
            />
            {hoveredIndex === i && (
              <motion.circle
                cx={p.x}
                cy={p.y}
                r="8"
                fill="none"
                stroke={AXES[i].color}
                strokeWidth="2"
                initial={{ opacity: 0.8, scale: 0.8 }}
                animate={{ opacity: 0, scale: 1.5 }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            )}
          </g>
        ))}

        {/* Axis labels */}
        {AXES.map((axis, i) => {
          const labelPoint = getPoint(i, radius + 18);
          return (
            <motion.text
              key={axis.key}
              x={labelPoint.x}
              y={labelPoint.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[10px] font-medium"
              fill={hoveredIndex === i ? axis.color : "rgba(255,255,255,0.6)"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 + i * 0.05 }}
            >
              {axis.label}
            </motion.text>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoveredIndex !== null && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-0 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/20 text-xs whitespace-nowrap"
        >
          <div className="font-semibold" style={{ color: AXES[hoveredIndex].color }}>
            {AXES[hoveredIndex].label}
          </div>
          <div className="text-white">{scores[AXES[hoveredIndex].key]} / 100</div>
        </motion.div>
      )}
    </div>
  );
}

export function StyleDNA({ creator }: { creator: CreatorProfile }) {
  const scores: Record<string, number> = {};
  AXES.forEach((axis) => {
    scores[axis.key] = getStyleScore(creator, axis.key);
  });

  const dominant = AXES.reduce((a, b) => scores[a.key] > scores[b.key] ? a : b);

  return (
    <div className="glass rounded-2xl border border-white/5 p-5">
      <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
        <span className="text-lg">🧬</span> Style DNA
      </h3>

      <RadarChart scores={scores} />

      <div className="mt-3 text-center">
        <div className="text-xs text-muted-foreground mb-2">Dominant Style</div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 text-sm font-semibold">
          {dominant.label}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {AXES.sort((a, b) => scores[b.key] - scores[a.key]).slice(0, 3).map((axis) => (
          <div key={axis.key} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-20">{axis.label}</span>
            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: axis.color }}
                initial={{ width: 0 }}
                animate={{ width: `${scores[axis.key]}%` }}
                transition={{ duration: 0.6, delay: 0.1 }}
              />
            </div>
            <span className="text-xs text-muted-foreground w-8 text-right">{scores[axis.key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
