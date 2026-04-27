import { NextResponse } from "next/server";
import { createScopedHandler } from "@/lib/api/endpoint";
import { getFieldRepository } from "@/lib/repositories/get-field-repository";

export const GET = createScopedHandler("read:fields", async (request) => {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  const repo = getFieldRepository();
  const results = await repo.searchValues("practical_industry", query);
  return NextResponse.json({
    query,
    items: results.map((entry) => entry.value),
  });
});
