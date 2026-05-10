import { NextResponse } from "next/server";
import { createMultiScopedHandler } from "@/lib/api/endpoint";
import { simulateFlow, simulationProfileSchema } from "@/lib/flows/simulate";

/**
 * Phase 6 simulate endpoint. Requires both `normalize` and `read:flows` because
 * the simulate path runs flow translation and reads flow-pack metadata.
 */
export const POST = createMultiScopedHandler(["normalize", "read:flows"], async (request) => {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const orgIdHeader = request.headers.get("x-feeldkit-organization-id") ?? undefined;
  const merged =
    typeof raw === "object" && raw !== null && !("organization_id" in raw)
      ? { ...(raw as Record<string, unknown>), organization_id: orgIdHeader }
      : raw;

  const parsed = simulationProfileSchema.safeParse(merged);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid simulation_profile", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const result = await simulateFlow(parsed.data);
    if (result.cases.length > 0 && result.cases[0]?.fields.length === 0 && result.flow.version === "unknown") {
      return NextResponse.json({ error: "flow_not_found", flow: result.flow }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: "simulation_failed", detail: err instanceof Error ? err.message : "unknown" },
      { status: 500 },
    );
  }
});
