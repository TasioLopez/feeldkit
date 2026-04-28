"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function ThemeToggle({ className }: { className?: string }) {
  const { setTheme, theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  if (!mounted) {
    return (
      <div
        className={cn("flex h-9 w-[116px] items-center justify-center rounded-full border border-border bg-muted/40", className)}
        aria-hidden
      />
    );
  }

  const cycle = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;
  const label =
    theme === "light" ? "Light theme" : theme === "dark" ? "Dark theme" : `System (${resolvedTheme ?? "system"})`;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("gap-2 rounded-full px-3", className)}
      onClick={cycle}
      title={label}
      aria-label={`Theme: ${label}. Click to cycle.`}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span className="hidden text-xs sm:inline">{theme === "system" ? "System" : theme === "dark" ? "Dark" : "Light"}</span>
    </Button>
  );
}
