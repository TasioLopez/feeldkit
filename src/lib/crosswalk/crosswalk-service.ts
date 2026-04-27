import type { IFieldRepository } from "@/lib/repositories/field-repository.interface";
import { getFieldRepository } from "@/lib/repositories/get-field-repository";

export interface CrosswalkQuery {
  from: string;
  to: string;
  code: string;
}

export async function crosswalkLookup(query: CrosswalkQuery, repo?: IFieldRepository) {
  const r = repo ?? getFieldRepository();
  const rows = await r.getCrosswalksByFrom(query.from, query.code);
  const results = await Promise.all(
    rows.map(async (row) => {
      const target = await r.resolveCrosswalkTarget(row);
      if (!target || target.fieldType.key !== query.to) {
        return null;
      }
      return {
        field_key: target.fieldType.key,
        key: target.value.key,
        label: target.value.label,
        confidence: row.confidence,
      };
    }),
  );
  return results.filter(Boolean);
}
