"use client";
import { motion } from "framer-motion";

export default function HeroAnimatedLines() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none hidden lg:block"
      viewBox="0 0 1200 800"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Curved connection lines */}
      <motion.path
        d="M 200 400 Q 400 300, 600 350"
        stroke="url(#lineGradient)"
        strokeWidth="2"
        fill="none"
        opacity="0.15"
        strokeDasharray="5 5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2, ease: "easeInOut" }}
      />
      
      <motion.path
        d="M 800 250 Q 900 400, 1000 500"
        stroke="url(#lineGradient)"
        strokeWidth="2"
        fill="none"
        opacity="0.15"
        strokeDasharray="5 5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2.2, ease: "easeInOut", delay: 0.3 }}
      />
      
      <motion.path
        d="M 300 600 Q 500 550, 700 600"
        stroke="url(#lineGradient)"
        strokeWidth="2"
        fill="none"
        opacity="0.15"
        strokeDasharray="5 5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2.5, ease: "easeInOut", delay: 0.6 }}
      />

      <defs>
        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
    </svg>
  );
}
