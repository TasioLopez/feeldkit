"use client";

import { useMemo, useState, useTransition } from "react";
import {
  processQueuedEnrichmentJobsAction,
  runBatchEnrichmentAction,
  runSingleEnrichmentAction,
  type EnrichmentRunResult,
} from "./actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

type FieldTypeOption = {
  key: string;
  name: string;
  packKey: string;
};

type JobRow = {
  id: string;
  fieldKey: string;
  status: "pending" | "running" | "completed" | "failed";
  submittedCount: number;
  createdCount: number;
  skippedCount: number;
  error: string | null;
  createdAt: string;
};

export function EnrichmentClient({ fieldTypes, initialJobs }: { fieldTypes: FieldTypeOption[]; initialJobs: JobRow[] }) {
  const [fieldKey, setFieldKey] = useState(fieldTypes[0]?.key ?? "");
  const [singleInput, setSingleInput] = useState("");
  const [batchInput, setBatchInput] = useState("");
  const [limit, setLimit] = useState(5);
  const [result, setResult] = useState<EnrichmentRunResult | null>(null);
  const [jobs, setJobs] = useState(initialJobs);
  const [isPending, startTransition] = useTransition();

  const grouped = useMemo(() => {
    const map = new Map<string, FieldTypeOption[]>();
    for (const fieldType of fieldTypes) {
      map.set(fieldType.packKey, [...(map.get(fieldType.packKey) ?? []), fieldType]);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [fieldTypes]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Enricher"
        description="Generate pending enrichment proposals directly from the dashboard."
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="soft" size="sm" className="rounded-full">
              <a href="/dashboard/reviews?status=pending">Open pending reviews</a>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const response = await processQueuedEnrichmentJobsAction();
                  setResult(response);
                })
              }
            >
              Process queued jobs
            </Button>
          </div>
        }
      />

      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="text-base">Run settings</CardTitle>
          <CardDescription>Choose target field and generation limits.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fieldType">Target field type</Label>
            <select
              id="fieldType"
              className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
              value={fieldKey}
              onChange={(event) => setFieldKey(event.target.value)}
            >
              {grouped.map(([packKey, items]) => (
                <optgroup key={packKey} label={packKey}>
                  {items.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.name} ({item.key})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="limit">Suggestions per input</Label>
            <Input
              id="limit"
              type="number"
              min={1}
              max={10}
              value={String(limit)}
              onChange={(event) => setLimit(Math.min(10, Math.max(1, Number(event.target.value) || 1)))}
            />
          </div>
        </CardContent>
      </Card>

      <Tabs
        defaultValue="single"
        items={[
          {
            id: "single",
            label: "Single",
            content: (
              <Card variant="panel">
                <CardHeader>
                  <CardTitle className="text-base">Single input enrichment</CardTitle>
                  <CardDescription>Use one source input and generate suggestions.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    placeholder="e.g. Growth ninja"
                    value={singleInput}
                    onChange={(event) => setSingleInput(event.target.value)}
                  />
                  <Button
                    type="button"
                    variant="brand"
                    size="sm"
                    disabled={isPending || !fieldKey || !singleInput.trim()}
                    onClick={() =>
                      startTransition(async () => {
                        const response = await runSingleEnrichmentAction({
                          fieldKey,
                          input: singleInput.trim(),
                          limit,
                        });
                        setResult(response);
                        if (response.mode === "queued") {
                          setJobs((current) => [
                            {
                              id: response.queuedJobId ?? crypto.randomUUID(),
                              fieldKey,
                              status: "pending",
                              submittedCount: response.submitted ?? 0,
                              createdCount: 0,
                              skippedCount: 0,
                              error: null,
                              createdAt: new Date().toISOString(),
                            },
                            ...current,
                          ]);
                        }
                      })
                    }
                  >
                    Run single enrichment
                  </Button>
                </CardContent>
              </Card>
            ),
          },
          {
            id: "batch",
            label: "Batch",
            content: (
              <Card variant="panel">
                <CardHeader>
                  <CardTitle className="text-base">Batch enrichment</CardTitle>
                  <CardDescription>Paste one source term per line.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <textarea
                    className="min-h-40 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
                    placeholder={"Head of Growth\nVP Finance\nSenior SWE"}
                    value={batchInput}
                    onChange={(event) => setBatchInput(event.target.value)}
                  />
                  <Button
                    type="button"
                    variant="brand"
                    size="sm"
                    disabled={isPending || !fieldKey || !batchInput.trim()}
                    onClick={() =>
                      startTransition(async () => {
                        const response = await runBatchEnrichmentAction({
                          fieldKey,
                          rawInputs: batchInput,
                          limit,
                        });
                        setResult(response);
                        if (response.mode === "queued") {
                          setJobs((current) => [
                            {
                              id: response.queuedJobId ?? crypto.randomUUID(),
                              fieldKey,
                              status: "pending",
                              submittedCount: response.submitted ?? 0,
                              createdCount: 0,
                              skippedCount: 0,
                              error: null,
                              createdAt: new Date().toISOString(),
                            },
                            ...current,
                          ]);
                        }
                      })
                    }
                  >
                    Run batch enrichment
                  </Button>
                </CardContent>
              </Card>
            ),
          },
        ]}
      />

      {result ? (
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="text-base">Run summary</CardTitle>
            <CardDescription>{result.ok ? "Generation completed." : "Generation failed."}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {result.error ? (
              <Badge variant="destructive">{result.error}</Badge>
            ) : (
              <>
                <Badge variant="secondary">field {result.fieldKey}</Badge>
                <Badge variant="secondary">mode {result.mode ?? "sync"}</Badge>
                <Badge variant="secondary">submitted {result.submitted ?? 0}</Badge>
                <Badge variant="success">created {result.created ?? 0}</Badge>
                <Badge variant="warning">skipped {result.skipped ?? 0}</Badge>
                <Badge variant="muted">
                  provider {result.provider} / {result.model}
                </Badge>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card variant="panel">
        <CardHeader>
          <CardTitle className="text-base">Queued jobs</CardTitle>
          <CardDescription>Large batch runs are queued and processed in chunks.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No jobs yet.</p>
          ) : (
            jobs.map((job) => (
              <div key={job.id} className="rounded-md border border-border p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{job.fieldKey}</Badge>
                  <Badge variant={job.status === "completed" ? "success" : job.status === "failed" ? "destructive" : "warning"}>
                    {job.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    submitted {job.submittedCount} / created {job.createdCount} / skipped {job.skippedCount}
                  </span>
                </div>
                {job.error ? <p className="mt-2 text-xs text-destructive">{job.error}</p> : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
