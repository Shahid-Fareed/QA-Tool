"use client";

import React from "react";
import Link from "next/link";
import { Zap } from "lucide-react";

interface BrandProps {
  isCollapsed: boolean;
  onClose?: () => void;
}

export function Brand({ isCollapsed, onClose }: BrandProps) {
  return (
    <div
      className={`p-5 mb-4 border-b border-border flex items-center ${isCollapsed ? "justify-center" : ""}`}
    >
      <Link
        href="/"
        onClick={onClose}
        className="flex items-center gap-3 group transition-all duration-300"
      >
        <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center group-hover:bg-brand/20 transition-colors duration-300 shrink-0">
          <Zap className="w-4 h-4 text-brand" />
        </div>
        {!isCollapsed && (
          <span className="text-foreground font-semibold text-sm tracking-tight whitespace-nowrap overflow-hidden">
            QA Tool
          </span>
        )}
      </Link>
    </div>
  );
}
