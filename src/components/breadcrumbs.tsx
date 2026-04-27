import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

export type BreadcrumbItem = { label: string; href?: string };

export function Breadcrumbs({ items, className }: { items: BreadcrumbItem[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex flex-wrap items-center gap-1 text-sm text-muted-foreground", className)}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={`${item.label}-${i}`} className="flex items-center gap-1">
            {i > 0 ? <ChevronRight className="size-3.5 shrink-0 opacity-60" aria-hidden /> : null}
            {item.href && !isLast ? (
              <Link href={item.href} className="text-foreground/80 transition-colors hover:text-primary">
                {item.label}
              </Link>
            ) : (
              <span className={cn(isLast && "font-medium text-foreground")}>{item.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
