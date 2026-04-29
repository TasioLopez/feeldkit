"use server";

import { revalidatePath } from "next/cache";
import { assertAdminRole, getAdminActorContext } from "@/lib/auth/admin-context";
import { decideIndustryEdge } from "@/lib/industry/concept-service";

export async function decideIndustryEdgeAction(edgeId: string, decision: "approved" | "rejected"): Promise<void> {
  const actor = await getAdminActorContext();
  if (!actor) return;
  try {
    assertAdminRole(actor.role, "review industry mappings");
  } catch {
    return;
  }
  const result = await decideIndustryEdge({
    edgeId,
    decision,
    actorId: actor.userId,
  });
  if (!result.ok) return;
  revalidatePath("/dashboard/industry");
}
