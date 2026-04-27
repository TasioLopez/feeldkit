import { NextResponse } from "next/server";
import { createScopedHandler } from "@/lib/api/endpoint";
import { listEventTypes } from "@/lib/packs/events/event-taxonomy-service";

export const GET = createScopedHandler("read:fields", async () => {
  return NextResponse.json({ items: listEventTypes() });
});
