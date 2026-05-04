import { NextResponse } from "next/server";
import { createScopedHandler } from "@/lib/api/endpoint";
import { getFlowRepository } from "@/lib/flows/get-flow-repository";

export const GET = createScopedHandler("read:flows", async (request) => {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  // /api/v1/flows/{flowKey}/versions/{version}
  const version = segments.at(-1) ?? "";
  const flowKey = segments.at(-3) ?? "";
  const repo = getFlowRepository();
  const entry = await repo.getFlowVersion(flowKey, version);
  if (!entry) {
    return NextResponse.json({ error: "flow_version_not_found" }, { status: 404 });
  }
  return NextResponse.json({
    flow: entry.pack,
    version: entry.version,
    field_mappings: entry.mappings,
  });
});
