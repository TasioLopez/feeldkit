import { cloneElement, forwardRef, isValidElement, type ButtonHTMLAttributes, type ReactElement } from "react";
import { cn } from "@/lib/cn";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive" | "link";
  size?: "sm" | "md" | "lg";
  asChild?: boolean;
};

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  outline: "border border-border bg-transparent hover:bg-muted hover:text-foreground",
  ghost: "hover:bg-muted hover:text-foreground",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
  link: "text-primary underline-offset-4 hover:underline",
};

const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-8 gap-1.5 rounded-md px-3 text-xs",
  md: "h-9 gap-2 rounded-md px-4 py-2 text-sm",
  lg: "h-10 gap-2 rounded-md px-6 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", type = "button", disabled, asChild, children, ...rest }, ref) => {
    const classes = cn(
      "inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "disabled:pointer-events-none disabled:opacity-50",
      variant !== "link" && "active:scale-[0.98]",
      variants[variant],
      variant !== "link" && sizes[size],
      className,
    );

    if (asChild) {
      if (!isValidElement(children)) {
        throw new Error("Button with asChild expects a single React element child.");
      }
      const child = children as ReactElement<{ className?: string }>;
      return cloneElement(child, {
        ...rest,
        className: cn(classes, child.props.className),
        ref: ref as never,
      } as never);
    }

    return (
      <button type={type} className={classes} ref={ref} disabled={disabled} {...rest}>
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
