import type { Metadata } from "next";
import { getOrganizationContext, listApiKeysForOrganization } from "@/app/dashboard/api-keys/actions";
import { ApiKeysClient } from "@/app/dashboard/api-keys/api-keys-client";
import { OrganizationCard } from "@/app/dashboard/api-keys/organization-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ALL_API_KEY_SCOPES } from "@/lib/auth/api-key";
import { isSupabaseConfigured } from "@/lib/config/env";

export const metadata: Metadata = {
  title: "API keys | FeeldKit workspace",
  description: "Create and manage API keys for your organization.",
};

export default async function AppApiKeysPage() {
  const [keys, orgContext] = await Promise.all([listApiKeysForOrganization(), getOrganizationContext()]);

  return (
    <div className="space-y-6">
      <PageHeader title="API keys" description="Issue scoped keys for integrations and scripts in this workspace." />
      {isSupabaseConfigured() ? (
        <>
          {orgContext ? (
            <OrganizationCard
              organizationId={orgContext.organizationId}
              organizationName={orgContext.organizationName}
            />
          ) : null}
          <ApiKeysClient initialKeys={keys} orgRole={orgContext?.orgRole ?? "viewer"} />
        </>
      ) : (
        <Alert variant="warning">
          <AlertTitle>Supabase required</AlertTitle>
          <AlertDescription>Configure Supabase environment variables to create and list organization API keys.</AlertDescription>
        </Alert>
      )}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="text-base">Available scopes</CardTitle>
          <CardDescription>Owners can issue admin scopes. Admins can manage non-admin integration keys.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {ALL_API_KEY_SCOPES.map((scope) => (
            <Badge key={scope} variant="secondary" className="font-mono text-xs">
              {scope}
            </Badge>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
