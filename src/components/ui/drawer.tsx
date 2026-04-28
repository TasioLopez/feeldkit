"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";

export function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <>
      <div
        aria-hidden={!open}
        onClick={onClose}
        className={cn("fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm transition-opacity md:hidden", open ? "opacity-100" : "pointer-events-none opacity-0")}
      />
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-[90vw] max-w-sm border-l border-border bg-card p-4 shadow-xl transition-transform md:hidden",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">{title}</h3>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
        {children}
      </aside>
    </>
  );
}
