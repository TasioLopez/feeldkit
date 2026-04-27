import { NextResponse } from "next/server";
import { createScopedHandler } from "@/lib/api/endpoint";
import { getFieldRepository } from "@/lib/repositories/get-field-repository";

export const GET = createScopedHandler("read:fields", async () => {
  const repo = getFieldRepository();
  const types = await repo.getFieldTypes();
  return NextResponse.json({
    field_types: types.map((entry) => ({
      key: entry.key,
      name: entry.name,
      supports_validation: entry.supportsValidation,
      supports_crosswalks: entry.supportsCrosswalks,
      metadata_schema: entry.metadataSchema,
    })),
  });
});
