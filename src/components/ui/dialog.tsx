"use client";

import { useRef } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";

export function Dialog({
  triggerLabel,
  title,
  description,
  children,
}: {
  triggerLabel: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.showModal()}>
        {triggerLabel}
      </Button>
      <dialog
        ref={ref}
        className={cn(
          "w-full max-w-lg rounded-xl border border-border bg-card p-0 text-foreground shadow-xl backdrop:bg-foreground/20",
          "open:animate-[fade-in_140ms_ease-out]",
        )}
      >
        <div className="border-b border-border px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">{title}</h3>
              {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={() => ref.current?.close()}>
              <X className="size-4" />
            </Button>
          </div>
        </div>
        <div className="px-5 py-4">{children}</div>
      </dialog>
    </>
  );
}
