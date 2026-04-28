"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type DropdownItem = {
  id: string;
  label: string;
  onSelect: () => void;
  muted?: boolean;
};

export function DropdownMenu({
  trigger,
  items,
  align = "end",
}: {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      window.addEventListener("mousedown", onPointerDown);
    }
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div className="relative inline-flex" ref={ref}>
      <button type="button" onClick={() => setOpen((value) => !value)} className="inline-flex">
        {trigger}
      </button>
      {open ? (
        <div
          className={cn(
            "absolute top-full z-40 mt-2 min-w-40 rounded-lg border border-border bg-card p-1 shadow-lg",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                item.onSelect();
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                item.muted ? "text-destructive hover:bg-destructive/10" : "text-foreground hover:bg-muted",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
