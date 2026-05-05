import type { Metadata } from "next";
import { Shield } from "lucide-react";
import { getAdminActorContext } from "@/lib/auth/admin-context";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Reveal } from "@/components/motion/reveal";
import { DOMAIN_POLICIES } from "@/lib/matching/inference/policy";
import { getGovernanceRepository } from "@/lib/governance/get-governance-repository";
import { upsertOrgFieldLockAction, upsertOrgPolicyOverrideAction } from "./actions";

export const metadata: Metadata = {
  title: "Governance | FeeldKit",
  description: "Organization confidence policy and overrides (read-only).",
};

export default async function GovernanceDashboardPage() {
  const actor = await getAdminActorContext();
  const governance = getGovernanceRepository();

  const overrides = actor?.organizationId ? await governance.listOrgPolicyOverrides(actor.organizationId) : [];
  const fieldLocks = actor?.organizationId ? await governance.listOrgFieldLocks(actor.organizationId) : [];
  const flowOverrides = actor?.organizationId ? await governance.listFlowPackOverrides(actor.organizationId) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Governance"
        description="Per-organization confidence thresholds, field locks, and flow overrides. Editing arrives in Phase 4 Wave 2; Wave 1 is read-only."
      />

      {!actor?.organizationId ? (
        <EmptyState title="Sign in required" description="Connect Supabase and sign in to view governance data." />
      ) : (
        <>
          <Reveal>
            <Card variant="panel">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="size-4 text-muted-foreground" aria-hidden />
                  <CardTitle className="text-base">Default domain thresholds (global)</CardTitle>
                </div>
                <CardDescription>
                  Production inference still uses these defaults until Wave 2 enables org overrides at runtime. See{" "}
                  <code className="font-mono text-[11px]">docs/INFERENCE_POLICY.md</code>.
                </CardDescription>
              </CardHeader>
              <div className="border-t border-stroke-soft px-6 py-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="text-muted-foreground">
                        <th className="pb-2 pr-4">domain</th>
                        <th className="pb-2 pr-4">matched ≥</th>
                        <th className="pb-2">suggested ≥</th>
                      </tr>
                    </thead>
                    <tbody className="text-foreground">
                      {Object.values(DOMAIN_POLICIES).map((p) => (
                        <tr key={p.domain} className="border-t border-stroke-soft/80">
                          <td className="py-2 pr-4">{p.domain}</td>
                          <td className="py-2 pr-4">{p.matched}</td>
                          <td className="py-2">{p.suggested}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          </Reveal>

          <Reveal delay={0.06}>
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="text-base">Organization policy overrides</CardTitle>
                <CardDescription>Rows in org_policy_overrides for your organization.</CardDescription>
              </CardHeader>
              <div className="border-t border-stroke-soft px-6 py-4">
                {overrides.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No overrides configured.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {overrides.map((o) => (
                      <li key={o.id} className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{o.domain}</Badge>
                        <span className="font-mono text-xs">
                          matched {o.matched} · suggested {o.suggested}
                        </span>
                        {o.notes ? <span className="text-muted-foreground">— {o.notes}</span> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          </Reveal>

          <Reveal delay={0.1}>
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="text-base">Field locks</CardTitle>
                <CardDescription>
                  require_review forces human review; disable_auto_apply prevents auto-matched (Wave 2 enforcement).
                </CardDescription>
              </CardHeader>
              <div className="border-t border-stroke-soft px-6 py-4">
                {fieldLocks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No field locks.</p>
                ) : (
                  <ul className="space-y-2 text-sm font-mono text-xs">
                    {fieldLocks.map((l) => (
                      <li key={l.id} className="flex flex-wrap gap-2">
                        <span>{l.fieldKey}</span>
                        <Badge variant="outline">{l.mode}</Badge>
                        {l.reason ? <span className="text-muted-foreground">{l.reason}</span> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          </Reveal>

          <Reveal delay={0.14}>
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="text-base">Flow pack overrides</CardTitle>
                <CardDescription>Per-flow adjustments (skip, replace, lock, pin_version).</CardDescription>
              </CardHeader>
              <div className="border-t border-stroke-soft px-6 py-4">
                {flowOverrides.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No flow overrides.</p>
                ) : (
                  <ul className="space-y-2 text-xs font-mono">
                    {flowOverrides.map((r) => (
                      <li key={r.id}>
                        pack {r.flowPackId.slice(0, 8)}… · ordinal {r.ordinal ?? "—"} · {r.action}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          </Reveal>

          <Reveal delay={0.18}>
            <Card variant="panel">
              <CardHeader>
                <CardTitle className="text-base">Edit organization policy (Wave 2)</CardTitle>
                <CardDescription>
                  Upserts <code className="font-mono text-[11px]">org_policy_overrides</code>. Requires owner/admin.
                </CardDescription>
              </CardHeader>
              <div className="border-t border-stroke-soft px-6 py-4">
                <form action={upsertOrgPolicyOverrideAction} className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1">
                    <Label htmlFor="domain">domain</Label>
                    <Input id="domain" name="domain" placeholder="geo" required className="font-mono text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="matched">matched ≥</Label>
                    <Input id="matched" name="matched" type="number" step="0.01" min={0} max={1} required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="suggested">suggested ≥</Label>
                    <Input id="suggested" name="suggested" type="number" step="0.01" min={0} max={1} required />
                  </div>
                  <div className="space-y-1 md:col-span-2 lg:col-span-1">
                    <Label htmlFor="notes">notes</Label>
                    <Input id="notes" name="notes" placeholder="optional" />
                  </div>
                  <div className="flex items-end">
                    <Button type="submit" variant="brand" size="sm">
                      Save override
                    </Button>
                  </div>
                </form>
              </div>
            </Card>
          </Reveal>

          <Reveal delay={0.22}>
            <Card variant="panel">
              <CardHeader>
                <CardTitle className="text-base">Field lock</CardTitle>
                <CardDescription>
                  Upserts <code className="font-mono text-[11px]">org_field_locks</code> for a canonical field key.
                </CardDescription>
              </CardHeader>
              <div className="border-t border-stroke-soft px-6 py-4">
                <form action={upsertOrgFieldLockAction} className="grid gap-3 md:grid-cols-4">
                  <div className="space-y-1 md:col-span-2">
                    <Label htmlFor="field_key">field_key</Label>
                    <Input id="field_key" name="field_key" placeholder="countries" required className="font-mono text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="mode">mode</Label>
                    <select
                      id="mode"
                      name="mode"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      required
                    >
                      <option value="require_review">require_review</option>
                      <option value="disable_auto_apply">disable_auto_apply</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="reason">reason</Label>
                    <Input id="reason" name="reason" placeholder="optional" />
                  </div>
                  <div className="flex items-end">
                    <Button type="submit" variant="secondary" size="sm">
                      Save lock
                    </Button>
                  </div>
                </form>
              </div>
            </Card>
          </Reveal>
        </>
      )}
    </div>
  );
}
