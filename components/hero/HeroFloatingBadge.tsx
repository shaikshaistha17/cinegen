"use client";
import { motion } from "framer-motion";

interface HeroFloatingBadgeProps {
  icon: string;
  text: string;
  color: "violet" | "cyan" | "amber";
  delay?: number;
}

const colorStyles = {
  violet: "bg-violet-500/20 border-violet-400/30 shadow-violet-500/20 text-violet-200",
  cyan: "bg-cyan-500/20 border-cyan-400/30 shadow-cyan-500/20 text-cyan-200",
  amber: "bg-amber-500/20 border-amber-400/30 shadow-amber-500/20 text-amber-200",
};

export default function HeroFloatingBadge({
  icon,
  text,
  color,
  delay = 0,
}: HeroFloatingBadgeProps) {
  return (
    <motion.div
      animate={{
        y: [0, -12, 0],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border backdrop-blur-sm shadow-lg text-xs font-semibold ${colorStyles[color]}`}
    >
      <span>{icon}</span>
      <span>{text}</span>
    </motion.div>
  );
}
