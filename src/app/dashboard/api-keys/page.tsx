import type { Metadata } from "next";
import { getOrganizationContext, listApiKeysForOrganization } from "./actions";
import { ApiKeysClient } from "./api-keys-client";
import { OrganizationCard } from "./organization-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { env } from "@/lib/config/env";
import { isSupabaseConfigured } from "@/lib/config/env";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "API keys | FeeldKit",
  description: "Create and manage API keys for your organization.",
};

const scopes = ["read:packs", "read:fields", "normalize", "validate", "parse", "admin:reviews", "admin:fields"];

export default async function DashboardApiKeysPage() {
  const [keys, orgContext] = await Promise.all([listApiKeysForOrganization(), getOrganizationContext()]);

  return (
    <div className="space-y-6">
      <PageHeader title="API keys" description="Issue keys with scoped access to the FeeldKit HTTP API." />
      {isSupabaseConfigured() ? (
        <>
          {orgContext ? (
            <OrganizationCard
              organizationId={orgContext.organizationId}
              organizationName={orgContext.organizationName}
            />
          ) : null}
          <ApiKeysClient initialKeys={keys} role={orgContext?.role ?? "viewer"} />
        </>
      ) : (
        <Alert variant="warning">
          <AlertTitle>Supabase required</AlertTitle>
          <AlertDescription>
            Configure Supabase environment variables to create and list organization API keys from the database.
          </AlertDescription>
        </Alert>
      )}
      {(env.NODE_ENV !== "production" || env.ALLOW_DEMO_API_KEY) && (
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="text-base">Demo key</CardTitle>
            <CardDescription>Available when not in production or when ALLOW_DEMO_API_KEY is enabled.</CardDescription>
          </CardHeader>
          <CardContent>
            <code className="block rounded-md bg-muted px-3 py-2 font-mono text-sm">fk_demo_public_1234567890</code>
          </CardContent>
        </Card>
      )}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="text-base">Available scopes</CardTitle>
          <CardDescription>Picked at create time. Assign the minimum scopes needed for each integration.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {scopes.map((scope) => (
            <Badge key={scope} variant="secondary" className="font-mono text-xs">
              {scope}
            </Badge>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
