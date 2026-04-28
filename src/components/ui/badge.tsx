import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type BadgeProps = HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "secondary" | "outline" | "success" | "warning" | "destructive" | "muted" | "brand" | "glow";
};

const variants: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "border-transparent bg-foreground text-background",
  brand: "border-transparent bg-brand-soft text-brand-strong",
  glow: "border-brand/35 bg-brand-soft/70 text-brand-strong shadow-[0_0_0_1px_color-mix(in_oklab,var(--brand)_20%,transparent)]",
  secondary: "border-transparent bg-secondary text-secondary-foreground",
  outline: "text-foreground border-border",
  success: "border-transparent bg-success/15 text-success",
  warning: "border-transparent bg-warning/15 text-warning",
  destructive: "border-transparent bg-destructive/15 text-destructive",
  muted: "border-transparent bg-muted text-muted-foreground",
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium uppercase tracking-[0.03em] leading-none transition-colors",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
