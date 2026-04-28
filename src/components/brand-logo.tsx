import Image from "next/image";
import { cn } from "@/lib/cn";

type BrandLogoProps = {
  className?: string;
  alt?: string;
  priority?: boolean;
};

export function BrandLogo({ className, alt = "FeeldKit logo", priority = false }: BrandLogoProps) {
  return (
    <Image
      src="/feeldkit-logo.svg"
      alt={alt}
      width={32}
      height={32}
      priority={priority}
      className={cn("size-8 object-contain", className)}
    />
  );
}
