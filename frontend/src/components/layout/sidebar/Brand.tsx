"use client";

import React from "react";
import { Zap } from "lucide-react";
import { useRouter } from "next/navigation";

interface BrandProps {
  isCollapsed: boolean;
  onClose?: () => void;
}

export function Brand({ isCollapsed, onClose }: BrandProps) {
  const router = useRouter();

  const handleClick = () => {
    window.dispatchEvent(new CustomEvent("new-chat"));
    router.push("/");
    if (onClose) onClose();
  };

  return (
    <div
      className={`p-5 mb-4 border-b border-border flex items-center ${isCollapsed ? "justify-center" : ""}`}
    >
      <button
        onClick={handleClick}
        className="flex items-center gap-3 group transition-all duration-300 cursor-pointer"
      >
        <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center group-hover:bg-brand/20 transition-colors duration-300 shrink-0">
          <Zap className="w-4 h-4 text-brand" />
        </div>
        {!isCollapsed && (
          <span className="text-foreground font-semibold text-sm tracking-tight whitespace-nowrap overflow-hidden">
            QA Tool
          </span>
        )}
      </button>
    </div>
  );
}
