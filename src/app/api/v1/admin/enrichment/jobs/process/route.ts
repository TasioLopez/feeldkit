import { NextResponse } from "next/server";
import { createScopedHandler } from "@/lib/api/endpoint";
import { processPendingEnrichmentJobs } from "@/lib/enrichment/job-service";

export const POST = createScopedHandler("admin:fields", async (request) => {
  const organizationId = request.headers.get("x-feeldkit-organization-id");
  if (!organizationId) {
    return NextResponse.json({ error: "missing organization context" }, { status: 400 });
  }
  const processed = await processPendingEnrichmentJobs(organizationId, 5);
  return NextResponse.json({ processed });
});
