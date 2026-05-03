"use client";

import { useState, useTransition } from "react";
import { Check, Copy, ShieldAlert } from "lucide-react";
import { createApiKeyAction, revokeApiKeyAction } from "./actions";
import { ALL_API_KEY_SCOPES, DEFAULT_API_KEY_SCOPES, type ApiScope } from "@/lib/auth/api-key";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs } from "@/components/ui/tabs";
import { Tooltip } from "@/components/ui/tooltip";

type KeyRow = {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  created_at: string;
  revoked_at: string | null;
};

const ADMIN_SCOPES: readonly ApiScope[] = ["admin:reviews", "admin:fields"];

function isAdminScope(scope: ApiScope): boolean {
  return ADMIN_SCOPES.includes(scope);
}

export function ApiKeysClient({
  initialKeys,
  role,
}: {
  initialKeys: KeyRow[];
  role: string;
}) {
  const isOwner = role === "owner";
  const visibleScopes = ALL_API_KEY_SCOPES.filter((scope) => isOwner || !isAdminScope(scope));

  const [keys, setKeys] = useState(initialKeys);
  const [name, setName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<ApiScope[]>(() =>
    DEFAULT_API_KEY_SCOPES.filter((scope) => visibleScopes.includes(scope)),
  );
  const [plaintext, setPlaintext] = useState<string | null>(null);
  const [issuedScopes, setIssuedScopes] = useState<ApiScope[]>([]);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function refreshFromServer(next: KeyRow[]) {
    setKeys(next);
  }

  function toggleScope(scope: ApiScope) {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  }

  async function copyKey(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setMessage("Could not copy to clipboard.");
    }
  }

  return (
    <div className="space-y-6">
      {plaintext ? (
        <Alert variant="warning" className="border-amber-500/40 shadow-sm">
          <AlertTitle>Copy this key now</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>It will not be shown again after you leave this page.</p>
            <div className="flex flex-wrap items-center gap-2 rounded-md bg-code px-3 py-2 font-mono text-sm text-code-foreground break-all">
              {plaintext}
            </div>
            {issuedScopes.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Scopes:</span>
                {issuedScopes.map((scope) => (
                  <Badge key={scope} variant="secondary" className="font-mono text-[10px]">
                    {scope}
                  </Badge>
                ))}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => copyKey(plaintext)}>
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
              <Button type="button" size="sm" variant="outline" onClick={() => setPlaintext(null)}>
                Dismiss
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="text-base">Create a key</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setMessage(null);
              startTransition(async () => {
                const result = await createApiKeyAction({ name, scopes: selectedScopes });
                if (result.error) {
                  setMessage(result.error);
                  return;
                }
                if (result.plaintextKey) {
                  setPlaintext(result.plaintextKey);
                  setIssuedScopes(result.scopes ?? selectedScopes);
                  setCopied(false);
                  setName("");
                }
                const list = await import("./actions").then((m) => m.listApiKeysForOrganization());
                refreshFromServer(list);
              });
            }}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="min-w-[200px] flex-1 space-y-2">
                <Label htmlFor="keyName">Key name</Label>
                <Input id="keyName" value={name} onChange={(e) => setName(e.target.value)} placeholder="Production n8n" />
              </div>
            </div>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-foreground">Scopes</legend>
              <p className="text-xs text-muted-foreground">
                Pick the minimum set this key needs. Admin scopes are owner-only.
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {visibleScopes.map((scope) => {
                  const checked = selectedScopes.includes(scope);
                  const admin = isAdminScope(scope);
                  return (
                    <label
                      key={scope}
                      className="flex cursor-pointer items-start gap-2 rounded-md border border-stroke-soft bg-surface-panel p-2.5 text-sm transition-colors hover:bg-muted/40"
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 size-4 rounded border-input accent-foreground"
                        checked={checked}
                        onChange={() => toggleScope(scope)}
                      />
                      <span className="flex flex-col gap-0.5">
                        <span className="font-mono text-xs text-foreground">{scope}</span>
                        {admin ? (
                          <span className="text-[10px] uppercase tracking-wide text-warning">owner only</span>
                        ) : null}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <Button type="submit" variant="brand" disabled={isPending || selectedScopes.length === 0}>
              Create key
            </Button>
          </form>
          {message ? (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {message}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="text-base">Your API keys</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0">
          <div className="text-xs text-muted-foreground">
            Tip: Use one key per workflow and rotate on schedule <Kbd>90d</Kbd>.
          </div>
          <Tabs
            defaultValue="active"
            items={[
              {
                id: "active",
                label: "Active",
                content: (
                  <ul className="divide-y divide-border rounded-lg border border-border bg-card">
                    {keys.filter((key) => !key.revoked_at).length === 0 ? (
                      <li className="px-6 py-10 text-center text-sm text-muted-foreground">
                        No active keys yet. Create one above.
                      </li>
                    ) : (
                      keys
                        .filter((key) => !key.revoked_at)
                        .map((k) => (
                          <li key={k.id} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0 space-y-1">
                              <p className="font-medium text-foreground">{k.name}</p>
                              <p className="text-sm text-muted-foreground">
                                Prefix <code className="rounded bg-muted px-1 font-mono text-foreground">{k.key_prefix}…</code> · created{" "}
                                {new Date(k.created_at).toLocaleString()}
                              </p>
                              {k.scopes.length > 0 ? (
                                <div className="flex flex-wrap gap-1 pt-1">
                                  {k.scopes.map((scope) => (
                                    <Badge key={scope} variant="secondary" className="font-mono text-[10px] normal-case tracking-normal">
                                      {scope}
                                    </Badge>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              {revokeId === k.id ? (
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-xs text-muted-foreground">Revoke this key?</span>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    disabled={isPending}
                                    onClick={() => {
                                      startTransition(async () => {
                                        await revokeApiKeyAction(k.id);
                                        setRevokeId(null);
                                        const list = await import("./actions").then((m) => m.listApiKeysForOrganization());
                                        refreshFromServer(list);
                                      });
                                    }}
                                  >
                                    Confirm
                                  </Button>
                                  <Button type="button" size="sm" variant="ghost" onClick={() => setRevokeId(null)}>
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <Tooltip content="Revoked keys cannot be restored">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="text-destructive hover:bg-destructive/10"
                                    disabled={isPending}
                                    onClick={() => setRevokeId(k.id)}
                                  >
                                    <ShieldAlert className="size-4" />
                                    Revoke
                                  </Button>
                                </Tooltip>
                              )}
                            </div>
                          </li>
                        ))
                    )}
                  </ul>
                ),
              },
              {
                id: "revoked",
                label: "Revoked",
                content: (
                  <ul className="divide-y divide-border rounded-lg border border-border bg-card">
                    {keys.filter((key) => key.revoked_at).length === 0 ? (
                      <li className="px-6 py-8 text-center text-sm text-muted-foreground">No revoked keys.</li>
                    ) : (
                      keys
                        .filter((key) => key.revoked_at)
                        .map((k) => (
                          <li key={k.id} className="px-6 py-4">
                            <p className="font-medium text-foreground">{k.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Prefix <code className="rounded bg-muted px-1 font-mono text-foreground">{k.key_prefix}…</code>
                            </p>
                          </li>
                        ))
                    )}
                  </ul>
                ),
              },
            ]}
          />
        </CardContent>
        <Separator />
        <CardFooter className="text-xs text-muted-foreground">Revoked keys cannot be reactivated.</CardFooter>
      </Card>
    </div>
  );
}
