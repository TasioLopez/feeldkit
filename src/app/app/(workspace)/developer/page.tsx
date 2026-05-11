import Link from "next/link";
import type { Metadata } from "next";
import { Code2, KeyRound, PlayCircle } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SimulateForm } from "@/app/dashboard/developer/simulate-form";

export const metadata: Metadata = {
  title: "Developer setup | FeeldKit",
  description: "SDK quickstart and flow simulation for FeeldKit workspaces.",
};

export default function AppDeveloperPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Developer setup"
        description="Create a scoped API key, install the SDK, and run a dry-run flow before production."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/app/api-keys">
              <KeyRound className="size-4" />
              API keys
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <Card variant="feature">
            <CardHeader>
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Code2 className="size-5" aria-hidden />
              </div>
              <CardTitle className="text-base">Install @feeldkit/sdk</CardTitle>
              <CardDescription>Typed route coverage for normalize, flows, profiles, and simulation helpers.</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="overflow-x-auto rounded-md bg-code p-4 font-mono text-xs text-code-foreground">
                {`npm install @feeldkit/sdk

import { FeeldKitClient } from "@feeldkit/sdk";

const client = new FeeldKitClient({
  apiKey: process.env.FEELDKIT_API_KEY!,
});

const result = await client.flows.translate({
  flowKey: "linkedin_salesnav__hubspot",
  sourceRecord: { company_industry: "Computer Software" },
});`}
              </pre>
            </CardContent>
          </Card>

          <Card variant="panel">
            <CardHeader>
              <CardTitle className="text-base">Helpful links</CardTitle>
              <CardDescription>User-facing setup paths only. Operator curation stays in the admin dashboard.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/developers">Public quickstart</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/docs">API docs</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/app/settings">Workspace settings</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card variant="elevated">
          <CardHeader>
            <div className="flex size-10 items-center justify-center rounded-lg border border-brand/20 bg-brand-soft/60 text-brand-strong">
              <PlayCircle className="size-5" aria-hidden />
            </div>
            <CardTitle className="text-base">Inline flow simulation</CardTitle>
            <CardDescription>Posts to `/api/v1/flow/simulate` and never writes mapping reviews.</CardDescription>
          </CardHeader>
          <CardContent>
            <SimulateForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
