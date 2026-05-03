import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeText } from "@/lib/matching/normalize-text";
import type {
  FieldAlias,
  FieldCrosswalk,
  FieldPack,
  FieldType,
  FieldValue,
  PackCategory,
} from "@/lib/domain/types";
import type { IFieldRepository, RecentDecision } from "@/lib/repositories/field-repository.interface";

function mapPack(row: Record<string, unknown>): FieldPack {
  return {
    id: row.id as string,
    key: row.key as string,
    name: row.name as string,
    description: (row.description as string) ?? "",
    category: (row.category as PackCategory) ?? "taxonomy",
    status: row.status as FieldPack["status"],
    version: (row.version as string) ?? "1.0.0",
    sourceType: (row.source_type as FieldPack["sourceType"]) ?? "hybrid",
    isPublic: Boolean(row.is_public),
    isSystem: Boolean(row.is_system),
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  };
}

function mapFieldType(row: Record<string, unknown>): FieldType {
  return {
    id: row.id as string,
    fieldPackId: row.field_pack_id as string,
    key: row.key as string,
    name: row.name as string,
    description: (row.description as string) ?? "",
    kind: (row.kind as FieldType["kind"]) ?? "taxonomy",
    status: row.status as FieldType["status"],
    isPublic: Boolean(row.is_public),
    supportsHierarchy: Boolean(row.supports_hierarchy),
    supportsRelationships: Boolean(row.supports_relationships),
    supportsLocale: Boolean(row.supports_locale),
    supportsValidation: Boolean(row.supports_validation),
    supportsCrosswalks: Boolean(row.supports_crosswalks),
    metadataSchema: (row.metadata_schema as Record<string, unknown>) ?? {},
  };
}

function mapFieldValue(row: Record<string, unknown>): FieldValue {
  return {
    id: row.id as string,
    fieldTypeId: row.field_type_id as string,
    key: row.key as string,
    label: row.label as string,
    normalizedLabel: row.normalized_label as string,
    locale: (row.locale as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    parentId: (row.parent_id as string | null) ?? null,
    sortOrder: Number(row.sort_order ?? 0),
    status: row.status as FieldValue["status"],
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    source: (row.source as string | null) ?? null,
    sourceId: (row.source_id as string | null) ?? null,
  };
}

function mapAlias(row: Record<string, unknown>): FieldAlias {
  return {
    id: row.id as string,
    fieldValueId: row.field_value_id as string,
    fieldTypeId: row.field_type_id as string,
    alias: row.alias as string,
    normalizedAlias: row.normalized_alias as string,
    locale: (row.locale as string | null) ?? null,
    source: (row.source as string | null) ?? null,
    confidence: Number(row.confidence ?? 0.9),
    status: row.status as FieldAlias["status"],
  };
}

function mapCrosswalk(row: Record<string, unknown>): FieldCrosswalk {
  return {
    id: row.id as string,
    fromFieldTypeId: row.from_field_type_id as string,
    fromValueId: row.from_value_id as string,
    toFieldTypeId: row.to_field_type_id as string,
    toValueId: row.to_value_id as string,
    crosswalkType: row.crosswalk_type as string,
    confidence: Number(row.confidence ?? 0.8),
    source: (row.source as string | null) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  };
}

export class SupabaseFieldRepository implements IFieldRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getPacks(): Promise<FieldPack[]> {
    const { data, error } = await this.client.from("field_packs").select("*").order("key");
    if (error || !data) {
      return [];
    }
    return data.map((row) => mapPack(row as Record<string, unknown>));
  }

  async getPackByKey(packKey: string): Promise<FieldPack | null> {
    const { data, error } = await this.client.from("field_packs").select("*").eq("key", packKey).maybeSingle();
    if (error || !data) {
      return null;
    }
    return mapPack(data as Record<string, unknown>);
  }

  async getFieldTypes(): Promise<FieldType[]> {
    const { data, error } = await this.client.from("field_types").select("*").order("key");
    if (error || !data) {
      return [];
    }
    return data.map((row) => mapFieldType(row as Record<string, unknown>));
  }

  async getFieldTypeByKey(fieldKey: string): Promise<FieldType | null> {
    const { data, error } = await this.client.from("field_types").select("*").eq("key", fieldKey).limit(1).maybeSingle();
    if (error || !data) {
      return null;
    }
    return mapFieldType(data as Record<string, unknown>);
  }

  async getValuesByFieldKey(fieldKey: string): Promise<FieldValue[]> {
    const type = await this.getFieldTypeByKey(fieldKey);
    if (!type) {
      return [];
    }
    const { data, error } = await this.client
      .from("field_values")
      .select("*")
      .eq("field_type_id", type.id)
      .order("sort_order");
    if (error || !data) {
      return [];
    }
    return data.map((row) => mapFieldValue(row as Record<string, unknown>));
  }

  async searchValues(fieldKey: string, query: string): Promise<Array<{ value: FieldValue; alias?: FieldAlias }>> {
    const normalized = normalizeText(query);
    if (!normalized) {
      return [];
    }
    const values = await this.getValuesByFieldKey(fieldKey);
    const ids = new Set(values.map((v) => v.id));
    const byValue = values
      .filter((entry) => entry.normalizedLabel.includes(normalized) || entry.key.toLowerCase().includes(normalized))
      .map((entry) => ({ value: entry }));

    const idList = [...ids];
    const { data: aliasRows } =
      idList.length === 0
        ? { data: [] as Record<string, unknown>[] }
        : await this.client
            .from("field_aliases")
            .select("*")
            .in("field_value_id", idList)
            .ilike("normalized_alias", `%${normalized.replace(/%/g, "")}%`);

    const byAlias =
      aliasRows?.map((row) => {
        const a = mapAlias(row as Record<string, unknown>);
        const value = values.find((v) => v.id === a.fieldValueId);
        return value ? { value, alias: a } : null;
      }) ?? [];

    return [...byValue, ...byAlias.filter(Boolean)] as Array<{ value: FieldValue; alias?: FieldAlias }>;
  }

  async getAliasesForType(fieldTypeId: string): Promise<FieldAlias[]> {
    const { data, error } = await this.client.from("field_aliases").select("*").eq("field_type_id", fieldTypeId);
    if (error || !data) {
      return [];
    }
    return data.map((row) => mapAlias(row as Record<string, unknown>));
  }

  async getCrosswalksByFrom(fieldKey: string, valueKey: string): Promise<FieldCrosswalk[]> {
    const type = await this.getFieldTypeByKey(fieldKey);
    if (!type) {
      return [];
    }
    const { data: fromValue, error: fvError } = await this.client
      .from("field_values")
      .select("id")
      .eq("field_type_id", type.id)
      .eq("key", valueKey)
      .maybeSingle();
    if (fvError || !fromValue) {
      return [];
    }
    const { data, error } = await this.client
      .from("field_crosswalks")
      .select("*")
      .eq("from_value_id", fromValue.id);
    if (error || !data) {
      return [];
    }
    return data.map((row) => mapCrosswalk(row as Record<string, unknown>));
  }

  async resolveCrosswalkTarget(entry: FieldCrosswalk): Promise<{ fieldType: FieldType; value: FieldValue } | null> {
    const [{ data: typeRow }, { data: valueRow }] = await Promise.all([
      this.client.from("field_types").select("*").eq("id", entry.toFieldTypeId).maybeSingle(),
      this.client.from("field_values").select("*").eq("id", entry.toValueId).maybeSingle(),
    ]);
    if (!typeRow || !valueRow) {
      return null;
    }
    return {
      fieldType: mapFieldType(typeRow as Record<string, unknown>),
      value: mapFieldValue(valueRow as Record<string, unknown>),
    };
  }

  async getValueParents(valueId: string, maxDepth = 6): Promise<FieldValue[]> {
    const chain: FieldValue[] = [];
    let currentId: string | null = valueId;
    const seen = new Set<string>();
    for (let depth = 0; depth < maxDepth; depth += 1) {
      if (!currentId || seen.has(currentId)) break;
      seen.add(currentId);
      const { data, error }: { data: Record<string, unknown> | null; error: unknown } = await this.client
        .from("field_values")
        .select("*")
        .eq("id", currentId)
        .maybeSingle();
      if (error || !data) break;
      const value = mapFieldValue(data);
      if (depth > 0) chain.push(value);
      currentId = value.parentId;
    }
    return chain;
  }

  async getRecentDecisionsFor(
    fieldTypeId: string,
    normalizedInput: string,
    limit = 25,
  ): Promise<RecentDecision[]> {
    const decisions: RecentDecision[] = [];
    const { data: reviews } = await this.client
      .from("mapping_reviews")
      .select("status, selected_value_id, suggested_value_id, created_at")
      .eq("field_type_id", fieldTypeId)
      .eq("normalized_input", normalizedInput)
      .order("created_at", { ascending: false })
      .limit(limit);
    for (const row of reviews ?? []) {
      const valueId = (row.selected_value_id as string | null) ?? (row.suggested_value_id as string | null);
      if (!valueId) continue;
      decisions.push({
        valueId,
        status: ((row.status as RecentDecision["status"]) ?? "pending"),
        source: "mapping_reviews",
        createdAt: (row.created_at as string) ?? new Date().toISOString(),
      });
    }
    const { data: aliases } = await this.client
      .from("field_aliases")
      .select("field_value_id, source, status, created_at")
      .eq("field_type_id", fieldTypeId)
      .eq("normalized_alias", normalizedInput)
      .limit(limit);
    for (const row of aliases ?? []) {
      const valueId = row.field_value_id as string | null;
      if (!valueId) continue;
      decisions.push({
        valueId,
        status: "alias",
        source: (row.source as string | null) ?? "field_aliases",
        createdAt: (row.created_at as string) ?? new Date().toISOString(),
      });
    }
    return decisions;
  }

  async getCrosswalksByFromValueId(valueId: string, toFieldTypeId?: string): Promise<FieldCrosswalk[]> {
    let query = this.client.from("field_crosswalks").select("*").eq("from_value_id", valueId);
    if (toFieldTypeId) {
      query = query.eq("to_field_type_id", toFieldTypeId);
    }
    const { data, error } = await query;
    if (error || !data) return [];
    return data.map((row) => mapCrosswalk(row as Record<string, unknown>));
  }
}
