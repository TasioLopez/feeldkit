import { NextResponse } from "next/server";
import { createScopedHandler } from "@/lib/api/endpoint";
import { listIntentTopics } from "@/lib/packs/intent/intent-topic-service";

export const GET = createScopedHandler("read:fields", async () => {
  return NextResponse.json({ items: listIntentTopics() });
});
