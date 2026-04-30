"use client";

import React, { useState } from "react";
import { Role, Permission } from "@/lib/rbac";
import { Sidebar } from "@/components/layout/Sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Menu, X, Zap } from "lucide-react";

interface DashboardLayoutClientProps {
  children: React.ReactNode;
  userName: string;
  role: Role;
  customPermissions: Permission[];
}

export function DashboardLayoutClient({
  children,
  userName,
  role,
  customPermissions,
}: DashboardLayoutClientProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-surface relative">
      {/* Mobile Header (Flex sibling on mobile) */}
      <div className="md:hidden h-16 flex items-center px-4 z-40 bg-surface/80 backdrop-blur-md border-b border-border justify-between shrink-0">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg bg-brand/5 border border-brand/10 text-brand hover:text-brand-muted"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center">
            <Zap className="w-4 h-4 text-brand" />
          </div>
          <span className="text-foreground font-semibold text-sm tracking-tight">
            QA Tool
          </span>
        </div>
        <div className="flex items-center">
          <ThemeToggle />
        </div>
      </div>

      <Sidebar
        userName={userName}
        role={role}
        customPermissions={customPermissions}
        mobileOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <main className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
