"use client";
import { motion } from "framer-motion";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

const DOTS = [0, 1, 2, 3];

export default function PlanningState() {
  const { phase, currentQuery } = useWorkspaceStore();
  if (phase !== "planning") return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center py-12 gap-4"
    >
      <div className="flex items-center gap-1.5">
        {DOTS.map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-cyan-400"
            animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-zinc-300">Planning analysis…</p>
        <p className="text-xs text-zinc-600 mt-1 max-w-xs truncate">"{currentQuery}"</p>
      </div>
    </motion.div>
  );
}
