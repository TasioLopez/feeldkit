"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Tooltip({
  content,
  children,
  className,
}: {
  content: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 top-full z-40 mt-2 -translate-x-1/2 rounded-md border border-border bg-inverse px-2 py-1 text-xs text-inverse-foreground shadow-md transition-all",
          open ? "opacity-100 translate-y-0" : "translate-y-1 opacity-0",
        )}
      >
        {content}
      </span>
    </span>
  );
}
