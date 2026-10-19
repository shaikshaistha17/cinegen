"use client";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export default function HeroMeshGradient() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Animated gradient orbs */}
      <motion.div
        animate={
          prefersReducedMotion
            ? {}
            : {
                x: [0, 100, 0],
                y: [0, -50, 0],
              }
        }
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600/30 rounded-full blur-3xl"
      />
      
      <motion.div
        animate={
          prefersReducedMotion
            ? {}
            : {
                x: [0, -80, 0],
                y: [0, 60, 0],
              }
        }
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
        className="absolute top-40 right-1/4 w-80 h-80 bg-cyan-500/25 rounded-full blur-3xl"
      />
      
      <motion.div
        animate={
          prefersReducedMotion
            ? {}
            : {
                x: [0, 60, 0],
                y: [0, -40, 0],
              }
        }
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 4,
        }}
        className="absolute bottom-20 left-1/2 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl"
      />

      {/* SVG geometric shapes */}
      <svg
        className="absolute inset-0 w-full h-full opacity-10"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <motion.circle
          cx="20%"
          cy="30%"
          r="150"
          stroke="url(#gradient1)"
          strokeWidth="2"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={
            prefersReducedMotion
              ? { opacity: 0.3 }
              : { pathLength: 1, opacity: 0.3 }
          }
          transition={{ duration: 2, ease: "easeInOut" }}
        />
        <motion.circle
          cx="75%"
          cy="60%"
          r="120"
          stroke="url(#gradient2)"
          strokeWidth="2"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={
            prefersReducedMotion
              ? { opacity: 0.3 }
              : { pathLength: 1, opacity: 0.3 }
          }
          transition={{ duration: 2.5, ease: "easeInOut", delay: 0.5 }}
        />
        <defs>
          <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
          <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
