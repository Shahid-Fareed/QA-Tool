"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Tooltip } from "@/components/ui/Tooltip";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-9 h-9 rounded-xl glass animate-pulse" />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Tooltip content={isDark ? "Light Mode" : "Dark Mode"} side="right">
      <button
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="p-2 rounded-xl glass hover:bg-brand/10 group transition-all duration-300"
        aria-label="Toggle theme"
      >
        <div className="relative w-5 h-5 flex items-center justify-center">
          {isDark ? (
            <Moon className="h-[1.2rem] w-[1.2rem] text-brand transition-all animate-in zoom-in spin-in-90 duration-300" />
          ) : (
            <Sun className="h-[1.2rem] w-[1.2rem] text-brand transition-all animate-in zoom-in spin-in-90 duration-300" />
          )}
        </div>
      </button>
    </Tooltip>
  );
}
