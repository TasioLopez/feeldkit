import type { FieldValue } from "@/lib/domain/types";
import type { IFieldRepository } from "@/lib/repositories/field-repository.interface";

export async function crosswalkMatch(
  repo: IFieldRepository,
  fieldKey: string,
  inputValueKey: string,
): Promise<{ value: FieldValue; confidence: number } | null> {
  const crosswalks = await repo.getCrosswalksByFrom(fieldKey, inputValueKey);
  const first = crosswalks[0];
  if (!first) {
    return null;
  }
  const resolved = await repo.resolveCrosswalkTarget(first);
  if (!resolved) {
    return null;
  }
  return {
    value: resolved.value,
    confidence: first.confidence,
  };
}
