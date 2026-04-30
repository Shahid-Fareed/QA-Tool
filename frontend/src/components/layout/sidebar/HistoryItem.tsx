"use client";

import React from "react";
import Link from "next/link";
import { MessageSquare, Edit3, Trash2, Check } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface HistoryItemProps {
  id: string;
  title: string;
  isActive: boolean;
  isCollapsed: boolean;
  isEditing: boolean;
  editValue: string;
  onEditChange: (val: string) => void;
  onEditSubmit: () => void;
  onEditCancel: () => void;
  onEditStart: () => void;
  onDeleteRequest: () => void;
  href: string;
  onClick?: () => void;
}

export function HistoryItem({
  id,
  title,
  isActive,
  isCollapsed,
  isEditing,
  editValue,
  onEditChange,
  onEditSubmit,
  onEditCancel,
  onEditStart,
  onDeleteRequest,
  href,
  onClick,
}: HistoryItemProps) {
  if (isEditing) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onEditSubmit();
        }}
        className="flex items-center gap-1 px-2 py-1.5 bg-surface border border-brand/30 rounded-lg mx-1"
      >
        <input
          autoFocus
          value={editValue}
          onChange={(e) => onEditChange(e.target.value)}
          onBlur={onEditSubmit}
          className="flex-1 bg-transparent text-[11px] outline-none text-foreground min-w-0"
        />
        <button type="submit" className="text-brand hover:text-brand/80">
          <Check className="w-3 h-3" />
        </button>
      </form>
    );
  }

  const content = (
    <div className="group relative px-2">
      <Link
        href={href}
        onClick={onClick}
        className={cn(
          "flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-medium transition-all group/item w-full",
          isActive
            ? "bg-brand/10 text-brand shadow-sm"
            : "text-muted-foreground hover:bg-brand/5 hover:text-foreground",
          isCollapsed ? "justify-center px-2" : "pr-14",
        )}
      >
        <MessageSquare
          className={cn(
            "w-3.5 h-3.5 shrink-0 transition-opacity",
            isActive
              ? "opacity-100"
              : "opacity-40 group-hover/item:opacity-100",
          )}
        />
        {!isCollapsed && <span className="truncate flex-1">{title}</span>}
      </Link>

      {!isCollapsed && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEditStart();
            }}
            className="p-1 hover:bg-brand/10 rounded text-muted-foreground hover:text-brand transition-colors"
          >
            <Edit3 className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDeleteRequest();
            }}
            className="p-1 hover:bg-red-500/10 rounded text-muted-foreground hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );

  if (isCollapsed) {
    return (
      <Tooltip content={title} side="right">
        {content}
      </Tooltip>
    );
  }

  return content;
}
