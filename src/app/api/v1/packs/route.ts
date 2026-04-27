import { NextResponse } from "next/server";
import { createScopedHandler } from "@/lib/api/endpoint";
import { getFieldRepository } from "@/lib/repositories/get-field-repository";

export const GET = createScopedHandler("read:packs", async () => {
  const repo = getFieldRepository();
  return NextResponse.json({
    packs: await repo.getPacks(),
  });
});
