"use client";

import { useState, useTransition } from "react";
import { Copy, Check } from "lucide-react";
import { createApiKeyAction, revokeApiKeyAction } from "./actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type KeyRow = {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  created_at: string;
  revoked_at: string | null;
};

export function ApiKeysClient({ initialKeys }: { initialKeys: KeyRow[] }) {
  const [keys, setKeys] = useState(initialKeys);
  const [name, setName] = useState("");
  const [plaintext, setPlaintext] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function refreshFromServer(next: KeyRow[]) {
    setKeys(next);
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
        <Alert variant="warning" className="border-amber-500/40">
          <AlertTitle>Copy this key now</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>It will not be shown again after you leave this page.</p>
            <div className="flex flex-wrap items-center gap-2 rounded-md bg-code px-3 py-2 font-mono text-sm text-code-foreground break-all">
              {plaintext}
            </div>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create a key</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              setMessage(null);
              startTransition(async () => {
                const result = await createApiKeyAction(name);
                if (result.error) {
                  setMessage(result.error);
                  return;
                }
                if (result.plaintextKey) {
                  setPlaintext(result.plaintextKey);
                  setCopied(false);
                  setName("");
                }
                const list = await import("./actions").then((m) => m.listApiKeysForOrganization());
                refreshFromServer(list);
              });
            }}
          >
            <div className="min-w-[200px] flex-1 space-y-2">
              <Label htmlFor="keyName">Key name</Label>
              <Input id="keyName" value={name} onChange={(e) => setName(e.target.value)} placeholder="Production n8n" />
            </div>
            <Button type="submit" disabled={isPending}>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your API keys</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {keys.length === 0 ? (
              <li className="px-6 py-10 text-center text-sm text-muted-foreground">No keys yet. Create one above (requires Supabase and profile).</li>
            ) : (
              keys.map((k) => (
                <li key={k.id} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium text-foreground">{k.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Prefix <code className="rounded bg-muted px-1 font-mono text-foreground">{k.key_prefix}…</code> · created{" "}
                      {new Date(k.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {!k.revoked_at ? (
                      revokeId === k.id ? (
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
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:bg-destructive/10"
                          disabled={isPending}
                          onClick={() => setRevokeId(k.id)}
                        >
                          Revoke
                        </Button>
                      )
                    ) : (
                      <span className="text-sm text-muted-foreground">Revoked</span>
                    )}
                  </div>
                </li>
              ))
            )}
          </ul>
        </CardContent>
        <Separator />
        <CardFooter className="text-xs text-muted-foreground">Revoked keys cannot be reactivated.</CardFooter>
      </Card>
    </div>
  );
}
