import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, FileCode2, Rocket } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Developer docs | FeeldKit",
  description: "Quick start and links to API reference.",
};

export default function DashboardDocsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Developer docs" description="HTTP examples and links to the public reference." />
      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <Card variant="feature">
          <CardHeader>
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <FileCode2 className="size-5" aria-hidden />
            </div>
            <CardTitle className="text-base">Quick start</CardTitle>
            <CardDescription>Normalize a country code with the demo key (local dev).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <pre className="overflow-x-auto rounded-md bg-code p-4 font-mono text-xs text-code-foreground leading-relaxed">
              {`curl -H "x-api-key: fk_demo_public_1234567890" \\
  -H "content-type: application/json" \\
  -d '{"field_key":"countries","value":"NL"}' \\
  http://localhost:3000/api/v1/normalize`}
            </pre>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card variant="panel">
            <CardHeader>
              <div className="flex size-10 items-center justify-center rounded-lg border border-brand/20 bg-brand-soft/60 text-brand-strong">
                <Rocket className="size-5" />
              </div>
              <CardTitle className="text-base">Operator quick start</CardTitle>
              <CardDescription>Recommended workflow for a safe production setup.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>1. Create dedicated keys per integration.</p>
              <p>2. Validate key scopes with a canary request.</p>
              <p>3. Monitor review queue for low-confidence mappings.</p>
            </CardContent>
          </Card>

          <Card variant="elevated">
          <CardHeader>
            <CardTitle className="text-base">Reference</CardTitle>
            <CardDescription>Public API docs and machine-readable spec.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Architecture, pack specification, and roadmap live under the repository <span className="font-mono text-foreground">docs/</span> folder.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/docs">
                  Public API docs
                  <ExternalLink className="size-3.5 opacity-70" aria-hidden />
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/openapi.yaml">
                  OpenAPI YAML
                  <ExternalLink className="size-3.5 opacity-70" aria-hidden />
                </Link>
              </Button>
            </div>
          </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
