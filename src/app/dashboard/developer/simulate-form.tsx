"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const SAMPLE_PROFILE = `{
  "schema": "feeldkit.simulation_profile.v1",
  "flow_key": "linkedin_salesnav__hubspot",
  "cases": [
    {
      "name": "minimal contact",
      "source_record": {
        "full_name": "Ada Lovelace",
        "company_name": "FeeldKit",
        "company_industry": "Computer Software"
      },
      "expected": { "status": "incomplete" }
    }
  ]
}`;

export function SimulateForm() {
  const [apiKey, setApiKey] = useState("");
  const [profile, setProfile] = useState(SAMPLE_PROFILE);
  const [result, setResult] = useState<string>("Ready.");
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    setResult("Running simulation...");
    try {
      const response = await fetch("/api/v1/flow/simulate", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "content-type": "application/json",
          accept: "application/json",
        },
        body: profile,
      });
      const text = await response.text();
      setResult(text ? JSON.stringify(JSON.parse(text), null, 2) : `HTTP ${response.status}`);
    } catch (err) {
      setResult(err instanceof Error ? err.message : "Simulation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-foreground">
        API key
        <input
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          placeholder="fk_..."
          className="mt-1 w-full rounded-md border border-stroke-soft bg-background px-3 py-2 font-mono text-sm outline-none ring-brand/20 focus:ring-2"
        />
      </label>
      <label className="block text-sm font-medium text-foreground">
        simulation_profile.v1
        <textarea
          value={profile}
          onChange={(event) => setProfile(event.target.value)}
          rows={14}
          className="mt-1 w-full rounded-md border border-stroke-soft bg-code px-3 py-2 font-mono text-xs text-code-foreground outline-none ring-brand/20 focus:ring-2"
        />
      </label>
      <Button type="button" onClick={run} disabled={!apiKey || loading}>
        {loading ? "Running..." : "Run dry-run simulation"}
      </Button>
      <pre className="max-h-80 overflow-auto rounded-md bg-code p-3 font-mono text-xs text-code-foreground">
        {result}
      </pre>
    </div>
  );
}
