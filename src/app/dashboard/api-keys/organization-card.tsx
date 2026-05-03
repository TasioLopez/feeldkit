"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function OrganizationCard({
  organizationId,
  organizationName,
}: {
  organizationId: string;
  organizationName: string | null;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(organizationId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore – browser may block clipboard outside user gesture
    }
  }

  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle className="text-base">{organizationName || "Organization"}</CardTitle>
        <CardDescription>
          Use this id as <code className="rounded bg-muted px-1 font-mono text-xs">organization_id</code> in API
          requests when your key is not org-scoped.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2">
          <code
            className="flex-1 min-w-[260px] truncate rounded-md bg-muted px-3 py-2 font-mono text-sm text-foreground"
            title={organizationId}
          >
            {organizationId}
          </code>
          <Button type="button" size="sm" variant="secondary" onClick={copy}>
            {copied ? (
              <>
                <Check className="size-4" aria-hidden />
                Copied
              </>
            ) : (
              <>
                <Copy className="size-4" aria-hidden />
                Copy
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
