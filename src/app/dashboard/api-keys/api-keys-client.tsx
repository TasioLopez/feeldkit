"use client";

import { useState, useTransition } from "react";
import { createApiKeyAction, revokeApiKeyAction } from "./actions";

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
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function refreshFromServer(next: KeyRow[]) {
    setKeys(next);
  }

  return (
    <div className="space-y-6">
      {plaintext ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-medium">Copy this key now — it will not be shown again.</p>
          <p className="mt-2 break-all font-mono">{plaintext}</p>
          <button
            type="button"
            className="mt-3 text-teal-800 underline"
            onClick={() => setPlaintext(null)}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <form
        className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4"
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
              setName("");
            }
            const list = await import("./actions").then((m) => m.listApiKeysForOrganization());
            refreshFromServer(list);
          });
        }}
      >
        <div>
          <label htmlFor="keyName" className="block text-sm font-medium text-slate-700">
            New key name
          </label>
          <input
            id="keyName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 rounded border border-slate-300 px-3 py-2 text-sm"
            placeholder="Production n8n"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          Create key
        </button>
      </form>
      {message ? <p className="text-sm text-red-600">{message}</p> : null}

      <section className="rounded-lg border border-slate-200 bg-white">
        <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-medium">Your API keys</h2>
        <ul className="divide-y divide-slate-100">
          {keys.length === 0 ? (
            <li className="px-4 py-6 text-sm text-slate-500">No keys yet. Create one above (requires Supabase + profile).</li>
          ) : (
            keys.map((k) => (
              <li key={k.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{k.name}</p>
                  <p className="text-slate-500">
                    Prefix <code className="text-slate-700">{k.key_prefix}…</code> · created{" "}
                    {new Date(k.created_at).toLocaleString()}
                  </p>
                </div>
                {!k.revoked_at ? (
                  <button
                    type="button"
                    className="text-red-600 hover:underline"
                    disabled={isPending}
                    onClick={() => {
                      startTransition(async () => {
                        await revokeApiKeyAction(k.id);
                        const list = await import("./actions").then((m) => m.listApiKeysForOrganization());
                        refreshFromServer(list);
                      });
                    }}
                  >
                    Revoke
                  </button>
                ) : (
                  <span className="text-slate-400">Revoked</span>
                )}
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
