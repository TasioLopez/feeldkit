import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type AlertProps = HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "destructive" | "warning";
};

const variants: Record<NonNullable<AlertProps["variant"]>, string> = {
  default: "border-border bg-muted text-foreground",
  destructive: "border-destructive/30 bg-destructive/10 text-destructive",
  warning: "border-warning/30 bg-warning/10 text-warning",
};

export const Alert = forwardRef<HTMLDivElement, AlertProps>(({ className, variant = "default", ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn("relative w-full rounded-lg border p-4 text-sm [&_svg]:absolute [&_svg]:left-4 [&_svg]:top-4 [&_svg~*]:pl-7", variants[variant], className)}
    {...props}
  />
));
Alert.displayName = "Alert";

export const AlertTitle = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
  <h5 ref={ref} className={cn("mb-1 font-medium leading-none tracking-tight", className)} {...props} />
));
AlertTitle.displayName = "AlertTitle";

export const AlertDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("text-sm opacity-90 [&_p]:leading-relaxed", className)} {...props} />,
);
AlertDescription.displayName = "AlertDescription";
