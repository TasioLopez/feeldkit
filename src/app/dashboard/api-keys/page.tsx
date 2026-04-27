import { listApiKeysForOrganization } from "./actions";
import { ApiKeysClient } from "./api-keys-client";
import { env } from "@/lib/config/env";
import { isSupabaseConfigured } from "@/lib/config/env";

const scopes = ["read:packs", "read:fields", "normalize", "validate", "parse", "admin:reviews", "admin:fields"];

export default async function DashboardApiKeysPage() {
  const keys = await listApiKeysForOrganization();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">API Keys</h1>
      {isSupabaseConfigured() ? (
        <ApiKeysClient initialKeys={keys} />
      ) : (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Configure Supabase environment variables to create and list organization API keys from the database.
        </p>
      )}
      {(env.NODE_ENV !== "production" || env.ALLOW_DEMO_API_KEY) && (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="font-medium">Demo key (non-production or ALLOW_DEMO_API_KEY)</p>
          <p className="mt-2 rounded bg-slate-100 px-3 py-2 font-mono text-sm">fk_demo_public_1234567890</p>
        </section>
      )}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="font-medium">Available scopes</p>
        <ul className="mt-2 list-disc pl-5 text-sm">
          {scopes.map((scope) => (
            <li key={scope}>{scope}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
