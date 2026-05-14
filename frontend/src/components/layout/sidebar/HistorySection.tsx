"use client";

import React from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface HistorySectionProps {
  label: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  isCollapsed: boolean;
}

export function HistorySection({
  label,
  isExpanded,
  onToggle,
  children,
  isCollapsed,
}: HistorySectionProps) {
  if (isCollapsed) return null;

  return (
    <div className="space-y-1 my-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between group/label pr-4"
      >
        <p className="sidebar-section-label mb-0!">{label}</p>
        <ChevronDown
          className={cn(
            "w-3 h-3 text-muted-foreground/40 group-hover/label:text-brand transition-all duration-300",
            !isExpanded && "-rotate-90",
          )}
        />
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="space-y-0.5 overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
