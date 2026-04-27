import { NextResponse } from "next/server";
import { createScopedHandler } from "@/lib/api/endpoint";
import { crosswalkLookup } from "@/lib/crosswalk/crosswalk-service";
import { getFieldRepository } from "@/lib/repositories/get-field-repository";

export const GET = createScopedHandler("read:fields", async (request) => {
  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  const code = url.searchParams.get("code") ?? "";
  if (!from || !to || !code) {
    return NextResponse.json({ error: "from, to and code are required" }, { status: 400 });
  }
  const repo = getFieldRepository();
  const sourceField = await repo.getFieldTypeByKey(from);
  const fromValues = await repo.getValuesByFieldKey(from);
  const sourceValue = fromValues.find((entry) => entry.key === code);
  return NextResponse.json({
    from:
      sourceField && sourceValue ? { field_key: from, value: code, label: sourceValue.label } : { field_key: from, value: code },
    to: await crosswalkLookup({ from, to, code }, repo),
  });
});
