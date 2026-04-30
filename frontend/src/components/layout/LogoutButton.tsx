"use client";

import { logoutAction } from "@/app/login/actions";
import { LogOut, Loader2 } from "lucide-react";
import { useTransition } from "react";

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
    });
  };

  return (
    <button
      id="logout-btn"
      onClick={handleLogout}
      disabled={isPending}
      title="Sign Out"
      className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg border border-border bg-brand/5 text-muted-foreground hover:text-foreground hover:border-red-500/30 hover:bg-red-500/5 text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPending ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <LogOut className="w-3 h-3" />
      )}
      <span className="hidden sm:inline">
        {isPending ? "Signing out..." : "Sign Out"}
      </span>
    </button>
  );
}
