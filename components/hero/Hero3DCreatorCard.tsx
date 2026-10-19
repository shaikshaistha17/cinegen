"use client";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

interface Creator {
  name: string;
  avatar: string;
  specialty: string;
  tools: string[];
}

interface Hero3DCreatorCardProps {
  creator: Creator;
  rotation: { y: number; z: number };
  parallaxMultiplier?: number;
}

export default function Hero3DCreatorCard({
  creator,
  rotation,
  parallaxMultiplier = 0.3,
}: Hero3DCreatorCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 1000], [0, -150 * parallaxMultiplier]);

  return (
    <motion.div
      ref={cardRef}
      style={{ y }}
      whileHover={{ scale: 1.02, rotateY: rotation.y + 2 }}
      transition={{ duration: 0.3 }}
      className="relative w-60 h-52 group cursor-pointer"
    >
      <div
        className="w-full h-full rounded-2xl glass-strong border border-white/12 p-5 transition-all duration-300"
        style={{
          transform: `perspective(1000px) rotateY(${rotation.y}deg) rotateZ(${rotation.z}deg)`,
          boxShadow: `
            0 20px 60px rgba(139, 92, 246, 0.4),
            0 8px 16px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.1)
          `,
        }}
      >
        {/* Avatar */}
        <div className="flex items-center gap-3 mb-4">
          <img
            src={creator.avatar}
            alt={creator.name}
            className="w-14 h-14 rounded-full border-2 border-violet-400/30 object-cover shadow-lg"
          />
          <div>
            <h3 className="font-display text-base font-semibold text-white">
              {creator.name}
            </h3>
            <p className="text-xs text-violet-300/80">{creator.specialty}</p>
          </div>
        </div>

        {/* Tool badges */}
        <div className="flex flex-wrap gap-1.5">
          {creator.tools.slice(0, 3).map((tool) => (
            <span
              key={tool}
              className="text-xs px-2 py-1 rounded-lg bg-violet-500/20 text-violet-200 border border-violet-400/20 font-medium"
            >
              {tool}
            </span>
          ))}
        </div>

        {/* Decorative gradient overlay */}
        <div
          className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 50% 0%, rgba(139, 92, 246, 0.1), transparent 70%)",
          }}
        />
      </div>
    </motion.div>
  );
}
