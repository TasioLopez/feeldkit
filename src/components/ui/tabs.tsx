"use client";

import { useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type TabItem = {
  id: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
};

export function Tabs({
  items,
  defaultValue,
  className,
}: {
  items: TabItem[];
  defaultValue?: string;
  className?: string;
}) {
  const firstEnabled = useMemo(() => items.find((i) => !i.disabled)?.id, [items]);
  const [active, setActive] = useState(defaultValue ?? firstEnabled ?? "");
  const activeTab = items.find((i) => i.id === active) ?? items[0];

  return (
    <div className={cn("space-y-4", className)}>
      <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={item.disabled}
            onClick={() => setActive(item.id)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              item.disabled && "cursor-not-allowed opacity-50",
              active === item.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div>{activeTab?.content}</div>
    </div>
  );
}
