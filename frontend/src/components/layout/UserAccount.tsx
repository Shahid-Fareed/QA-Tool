"use client";

import React, { useState, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import { LogOut, ChevronDown, Loader2, Shield } from "lucide-react";
import { logoutAction } from "@/app/login/actions";
import { Tooltip } from "../ui/Tooltip";

interface UserAccountProps {
  name: string;
  role: string;
  isCollapsed?: boolean;
}

export function UserAccount({
  name,
  role,
  isCollapsed = false,
}: UserAccountProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [openAbove, setOpenAbove] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const getInitials = (userName: string) => {
    const parts = userName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return userName.trim().slice(0, 2).toUpperCase();
  };

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
    });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function updateDropdownDirection() {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const estimatedDropdownHeight = 240;
      setOpenAbove(rect.bottom + estimatedDropdownHeight > viewportHeight);
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", updateDropdownDirection);
    updateDropdownDirection();

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", updateDropdownDirection);
    };
  }, [isOpen]);

  const button = (
    <button
      ref={buttonRef}
      onClick={() => setIsOpen(!isOpen)}
      className={`flex items-center rounded-xl hover:bg-brand/5 transition-all duration-200 group focus:outline-none ${
        isCollapsed ? "p-1.5 justify-center w-full" : "p-1.5 pr-3 gap-3"
      }`}
    >
      {/* Avatar */}
      <div className="w-9 h-9 rounded-lg bg-red-800 flex items-center justify-center text-white font-semibold text-xs shadow-lg group-hover:shadow-red-900/20 transition-all shrink-0">
        {getInitials(name)}
      </div>

      {/* Name and Arrow - Hidden when collapsed */}
      {!isCollapsed && (
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="text-sm font-medium text-foreground transition-colors truncate">
            {name}
          </span>
          <ChevronDown
            className={`w-4 h-4 opacity-40 group-hover:opacity-100 transition-all duration-300 shrink-0 ${isOpen ? "rotate-180" : ""}`}
          />
        </div>
      )}
    </button>
  );

  return (
    <div className="relative overflow-visible" ref={dropdownRef}>
      {isCollapsed ? (
        <Tooltip content={name} side="right">
          {button}
        </Tooltip>
      ) : (
        button
      )}

      {isOpen && (
        <div
          className={`absolute min-w-56 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 ${
            isCollapsed
              ? "left-12 origin-bottom-left"
              : "left-0 right-0 origin-bottom"
          } ${openAbove ? "bottom-full top-auto mb-2" : "top-full mt-2"}`}
        >
          <div className="p-1.5 space-y-1">
            <button
              onClick={handleLogout}
              disabled={isPending}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-red-500/10 rounded-lg transition-all group disabled:opacity-50"
            >
              <div className="w-8 h-8 rounded-full bg-red-500/5 flex items-center justify-center group-hover:bg-red-500/15 transition-colors">
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                ) : (
                  <LogOut className="w-4 h-4 text-red-500/60 group-hover:text-red-500" />
                )}
              </div>
              <span className="font-medium text-foreground/70 group-hover:text-red-500">
                {isPending ? "Signing Out..." : "Sign Out"}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
