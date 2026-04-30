"use client";

import React from "react";
import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface NavLinkProps {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  isCollapsed: boolean;
  onClick?: () => void;
}

export function NavLink({
  href,
  label,
  icon: Icon,
  isActive,
  isCollapsed,
  onClick,
}: NavLinkProps) {
  const link = (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "sidebar-nav-item",
        isActive && "sidebar-nav-item-active",
        isCollapsed && "justify-center",
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {!isCollapsed && (
        <span className="whitespace-nowrap overflow-hidden">{label}</span>
      )}
    </Link>
  );

  if (isCollapsed) {
    return (
      <Tooltip content={label} side="right">
        {link}
      </Tooltip>
    );
  }

  return link;
}
