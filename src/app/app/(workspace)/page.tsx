import Link from "next/link";
import type { Metadata } from "next";
import { Code2, KeyRound, ShieldCheck, Workflow } from "lucide-react";
import { getActorContext } from "@/lib/auth/admin-context";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Workspace | FeeldKit",
  description: "FeeldKit user workspace overview.",
};

export default async function AppHomePage() {
  const actor = await getActorContext();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workspace"
        description="Set up API keys, test deterministic flows, and manage your organization integration surface."
        actions={
          <Button asChild variant="brand" size="sm">
            <Link href="/app/developer">Open developer setup</Link>
          </Button>
        }
      />

      <Card variant="feature">
        <CardHeader>
          <CardTitle className="text-xl">Your FeeldKit workspace is ready</CardTitle>
          <CardDescription>
            This is the user-facing app surface. Platform curation and operator tools stay on the admin dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="font-mono">
            orgRole: {actor?.orgRole ?? "viewer"}
          </Badge>
          <Badge variant="outline" className="font-mono">
            platformRole: {actor?.platformRole ?? "none"}
          </Badge>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Create API keys",
            description: "Issue scoped keys for integrations and scripts.",
            href: "/app/api-keys",
            icon: KeyRound,
          },
          {
            title: "Developer setup",
            description: "Install the SDK and run your first flow simulation.",
            href: "/app/developer",
            icon: Code2,
          },
          {
            title: "Workspace settings",
            description: "Review your organization id and role.",
            href: "/app/settings",
            icon: ShieldCheck,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="rounded-xl border border-border bg-card p-5 transition hover:bg-muted/50">
              <Icon className="size-5 text-brand-strong" aria-hidden />
              <h2 className="mt-4 font-semibold">{item.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
            </Link>
          );
        })}
      </div>

      <Card variant="panel">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Workflow className="size-4 text-brand-strong" aria-hidden />
            <CardTitle className="text-base">Recommended next step</CardTitle>
          </div>
          <CardDescription>
            Create a least-privilege API key, then run a flow simulation before wiring FeeldKit into production.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
