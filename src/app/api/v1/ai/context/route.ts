import { NextResponse } from "next/server";
import { createScopedHandler } from "@/lib/api/endpoint";
import { getFieldRepository } from "@/lib/repositories/get-field-repository";

export const GET = createScopedHandler("read:fields", async (request) => {
  const packKeys = (new URL(request.url).searchParams.get("packs") ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  const repo = getFieldRepository();
  const allTypes = await repo.getFieldTypes();

  const available = await Promise.all(
    packKeys.map(async (key) => {
      const pack = await repo.getPackByKey(key);
      if (!pack) {
        return null;
      }
      return {
        key: pack.key,
        name: pack.name,
        field_types: allTypes.filter((entry) => entry.fieldPackId === pack.id).map((entry) => entry.key),
      };
    }),
  );

  return NextResponse.json({
    packs: available.filter(Boolean),
    guidance: "Use listed field_types as canonical value definitions when generating schemas and enums.",
  });
});
