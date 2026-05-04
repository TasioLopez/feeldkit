import { NextResponse } from "next/server";
import { createScopedHandler } from "@/lib/api/endpoint";
import { getFlowRepository } from "@/lib/flows/get-flow-repository";

export const GET = createScopedHandler("read:flows", async (request) => {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const flowKey = segments.at(-1) ?? "";
  const repo = getFlowRepository();
  const pack = await repo.getFlowByKey(flowKey);
  if (!pack) {
    return NextResponse.json({ error: "flow_not_found" }, { status: 404 });
  }
  const versions = await repo.listVersions(flowKey);
  const active = await repo.getFlowVersion(flowKey);
  return NextResponse.json({
    flow: pack,
    versions,
    active_version: active
      ? {
          version: active.version,
          field_mappings: active.mappings,
        }
      : null,
  });
});
