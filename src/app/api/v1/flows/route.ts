import { NextResponse } from "next/server";
import { createScopedHandler } from "@/lib/api/endpoint";
import { getFlowRepository } from "@/lib/flows/get-flow-repository";

export const GET = createScopedHandler("read:flows", async () => {
  const repo = getFlowRepository();
  return NextResponse.json({
    flows: await repo.listFlows(),
  });
});
