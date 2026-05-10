import type { Metadata } from "next";
import Link from "next/link";
import { Code2, KeyRound, PlayCircle } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SimulateForm } from "./simulate-form";

export const metadata: Metadata = {
  title: "Developer hub | FeeldKit",
  description: "SDK quickstart, API key links, and flow simulation for FeeldKit developers.",
};

export default function DashboardDeveloperPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Developer hub"
        description="Install the SDK, test a flow before deploying, and move governance config across environments."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/api-keys">
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
              <CardDescription>Typed route coverage for normalize, flows, profiles, and promotion APIs.</CardDescription>
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
              <CardTitle className="text-base">Recipes</CardTitle>
              <CardDescription>Start with the flagship flow, then add governance profiles.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/developers">Public quickstart</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/docs">API docs</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/promotions">Curator queue</Link>
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
