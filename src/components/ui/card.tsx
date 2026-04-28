import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "elevated" | "feature" | "glass" | "float" | "panel";
};

const cardVariants: Record<NonNullable<CardProps["variant"]>, string> = {
  default: "border border-border/90 bg-card text-card-foreground shadow-sm",
  panel: "border border-stroke-soft bg-surface-panel text-card-foreground shadow-sm",
  elevated: "border border-border/70 bg-elevated text-card-foreground shadow-md",
  feature:
    "border border-border/60 bg-gradient-to-b from-card via-card to-subtle text-card-foreground shadow-lg ring-1 ring-brand/10",
  glass: "border border-border/70 bg-card/80 text-card-foreground shadow-md backdrop-blur-md",
  float: "border border-stroke-soft bg-surface-float text-card-foreground shadow-xl",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(({ className, variant = "default", ...props }, ref) => (
  <div ref={ref} className={cn("rounded-xl", cardVariants[variant], className)} {...props} />
));
Card.displayName = "Card";

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col gap-1.5 p-6 pb-0", className)} {...props} />
));
CardHeader.displayName = "CardHeader";

export const CardTitle = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
));
CardTitle.displayName = "CardTitle";

export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm leading-relaxed text-muted-foreground", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-4", className)} {...props} />
));
CardContent.displayName = "CardContent";

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
));
CardFooter.displayName = "CardFooter";
