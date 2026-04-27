import type { Metadata } from "next";
import { listApiKeysForOrganization } from "./actions";
import { ApiKeysClient } from "./api-keys-client";
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
  const keys = await listApiKeysForOrganization();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">API keys</h1>
        <p className="mt-1 text-sm text-muted-foreground">Issue keys with scoped access to the FeeldKit HTTP API.</p>
      </div>
      {isSupabaseConfigured() ? (
        <ApiKeysClient initialKeys={keys} />
      ) : (
        <Alert variant="warning">
          <AlertTitle>Supabase required</AlertTitle>
          <AlertDescription>
            Configure Supabase environment variables to create and list organization API keys from the database.
          </AlertDescription>
        </Alert>
      )}
      {(env.NODE_ENV !== "production" || env.ALLOW_DEMO_API_KEY) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Demo key</CardTitle>
            <CardDescription>Available when not in production or when ALLOW_DEMO_API_KEY is enabled.</CardDescription>
          </CardHeader>
          <CardContent>
            <code className="block rounded-md bg-muted px-3 py-2 font-mono text-sm">fk_demo_public_1234567890</code>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Available scopes</CardTitle>
          <CardDescription>Assign the minimum scopes needed for each integration.</CardDescription>
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
