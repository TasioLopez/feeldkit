import { NextResponse } from "next/server";
import { createScopedHandler } from "@/lib/api/endpoint";
import { getFieldRepository } from "@/lib/repositories/get-field-repository";

export const GET = createScopedHandler("read:fields", async (request) => {
  const url = new URL(request.url);
  const path = url.pathname;
  const fieldKey = path.split("/").filter(Boolean).at(-2) ?? "";
  const query = url.searchParams.get("q") ?? "";
  const repo = getFieldRepository();
  return NextResponse.json({
    field_key: fieldKey,
    query,
    results: await repo.searchValues(fieldKey, query),
  });
});
