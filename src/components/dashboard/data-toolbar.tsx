import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function DataToolbar({
  rightSlot,
  placeholder = "Search...",
}: {
  rightSlot?: ReactNode;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-subtle/50 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input aria-label="Search" className="pl-9" placeholder={placeholder} />
      </div>
      {rightSlot ? <div className="flex items-center gap-2">{rightSlot}</div> : null}
    </div>
  );
}
