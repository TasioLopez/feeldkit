import { NextResponse } from "next/server";
import { createScopedHandler } from "@/lib/api/endpoint";
import { normalizeJobTitle } from "@/lib/packs/jobs/job-title-normalizer";
import { detectFunction } from "@/lib/packs/jobs/function-detector";
import { detectSeniority } from "@/lib/packs/jobs/seniority-detector";

export const GET = createScopedHandler("normalize", async (request) => {
  const title = new URL(request.url).searchParams.get("q") ?? "";
  const [normalized, fn, seniority] = await Promise.all([
    normalizeJobTitle(title),
    detectFunction(title),
    detectSeniority(title),
  ]);
  return NextResponse.json({
    normalized,
    function: fn,
    seniority,
  });
});
