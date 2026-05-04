"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const SAMPLE_RECORD = {
  full_name: "Ada Lovelace",
  headline: "Founder at FeeldKit",
  company_name: "FeeldKit",
  linkedin_url: "https://www.linkedin.com/in/ada",
  profile_id: "ACoAAAA1",
  company_industry: "Computer Software",
  company_country: "NL",
  company_employee_size_band: "11-50",
};

export function FlowTestForm({ flowKey }: { flowKey: string }) {
  const [payload, setPayload] = useState<string>(() => JSON.stringify(SAMPLE_RECORD, null, 2));
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);
    setSubmitting(true);
    try {
      const sourceRecord = JSON.parse(payload);
      const response = await fetch("/api/v1/flow/translate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ flow_key: flowKey, source_record: sourceRecord }),
      });
      const json = (await response.json()) as unknown;
      if (!response.ok) {
        setError(`HTTP ${response.status}: ${JSON.stringify(json)}`);
      }
      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "request failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="source_record">Source record (JSON)</Label>
        <textarea
          id="source_record"
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
          rows={10}
          className="w-full rounded-lg border border-stroke-soft bg-surface-panel p-3 font-mono text-xs"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? "Translating…" : "Run flow"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPayload(JSON.stringify(SAMPLE_RECORD, null, 2))}
        >
          Reset to sample
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {result ? (
        <pre className="max-h-[420px] overflow-auto rounded-lg border border-stroke-soft bg-surface-panel p-3 text-xs">
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </form>
  );
}
