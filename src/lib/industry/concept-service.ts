import { normalizeText } from "@/lib/matching/normalize-text";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { IndustryConcept, IndustryConceptCode, IndustryConceptEdge, IndustryCodeSystem } from "@/lib/industry/types";
import type { IndustryConceptGraph } from "@/lib/industry/graph-types";

function conceptKeyFromLabel(label: string): string {
  return `industry_${normalizeText(label).replace(/\s+/g, "_").slice(0, 120)}`;
}

type ConceptMapEntry = {
  id: string;
  key: string;
  label: string;
};

export async function ingestIndustryConceptGraphWithClient(
  admin: SupabaseClient,
  graph: IndustryConceptGraph,
  options?: { strict?: boolean },
): Promise<{
  concepts: number;
  codes: number;
  edges: number;
  concept_errors: number;
  code_errors: number;
  edge_errors: number;
  skipped_edges_missing_nodes: number;
}> {
  const conceptByNode = new Map<string, ConceptMapEntry>();
  let conceptCount = 0;
  let codeCount = 0;
  let edgeCount = 0;
  let conceptErrors = 0;
  let codeErrors = 0;
  let edgeErrors = 0;
  let skippedEdgesMissingNodes = 0;

  for (const node of graph.nodes) {
    const conceptKey = conceptKeyFromLabel(node.label);
    const { data: conceptRow, error: conceptErr } = await admin
      .from("industry_concepts")
      .upsert(
        {
          key: conceptKey,
          label: node.label,
          normalized_label: normalizeText(node.label),
          status: node.status,
          metadata: {
            code_systems: [node.codeSystem],
          },
        },
        { onConflict: "key" },
      )
      .select("id,key,label")
      .single();
    if (conceptErr || !conceptRow) {
      conceptErrors += 1;
      continue;
    }
    conceptCount += 1;
    const nodeKey = `${node.codeSystem}:${node.code}`;
    conceptByNode.set(nodeKey, {
      id: conceptRow.id as string,
      key: conceptRow.key as string,
      label: conceptRow.label as string,
    });
    const { error: codeErr } = await admin.from("industry_concept_codes").upsert(
      {
        concept_id: conceptRow.id,
        code_system: node.codeSystem,
        code: node.code,
        label: node.label,
        hierarchy_path: node.hierarchyPath,
        parent_code: node.parentCode,
        status: node.status,
        source: (node.metadata?.source_standard as string | undefined) ?? "industry_source",
        version: (node.metadata?.version as string | undefined) ?? null,
        metadata: node.metadata ?? {},
      },
      { onConflict: "code_system,code" },
    );
    if (codeErr) {
      codeErrors += 1;
    } else {
      codeCount += 1;
    }
  }

  for (const edge of graph.edges) {
    const from = conceptByNode.get(`${edge.fromSystem}:${edge.fromCode}`);
    const to = conceptByNode.get(`${edge.toSystem}:${edge.toCode}`);
    if (!from || !to) {
      skippedEdgesMissingNodes += 1;
      continue;
    }
    const { error: edgeErr } = await admin.from("industry_concept_edges").upsert(
      {
        from_concept_id: from.id,
        to_concept_id: to.id,
        relation_type: edge.relationType,
        mapping_quality: edge.mappingQuality,
        confidence: edge.confidence,
        source: edge.source,
        source_evidence: edge.evidence ?? null,
        inferred: Boolean(edge.inferred),
        status: edge.inferred ? "pending" : "approved",
        metadata: edge.metadata ?? {},
      },
      { onConflict: "from_concept_id,to_concept_id,relation_type,source" },
    );
    if (edgeErr) {
      edgeErrors += 1;
    } else {
      edgeCount += 1;
    }
  }

  const summary = {
    concepts: conceptCount,
    codes: codeCount,
    edges: edgeCount,
    concept_errors: conceptErrors,
    code_errors: codeErrors,
    edge_errors: edgeErrors,
    skipped_edges_missing_nodes: skippedEdgesMissingNodes,
  };
  if (options?.strict && (conceptErrors > 0 || codeErrors > 0 || edgeErrors > 0)) {
    throw new Error(
      `ingestIndustryConceptGraphWithClient strict failure: concept_errors=${conceptErrors} code_errors=${codeErrors} edge_errors=${edgeErrors} skipped_edges_missing_nodes=${skippedEdgesMissingNodes}`,
    );
  }
  return summary;
}

const INDUSTRY_FIELD_TYPE_BY_SYSTEM: Record<IndustryCodeSystem, string> = {
  linkedin: "linkedin_industry_codes",
  naics: "naics_codes",
  nace: "nace_sections",
  isic: "isic_sections",
  sic: "sic_divisions",
  gics: "gics_sectors",
  practical: "practical_industry",
};

function valueKeyForSystem(system: IndustryCodeSystem, code: string): string {
  if (system === "linkedin") return `li_industry_${code}`;
  if (system === "naics") return `naics_${code}`;
  if (system === "gics") return `gics_${code}`;
  if (system === "nace") return `nace_${normalizeText(code)}`;
  if (system === "isic") return `isic_${normalizeText(code)}`;
  if (system === "sic") return `sic_${normalizeText(code)}`;
  return `practical_${normalizeText(code)}`;
}

export async function mirrorIndustryConceptEdgesToFieldCrosswalks(
  admin: SupabaseClient,
  graph: IndustryConceptGraph,
  options?: { strict?: boolean },
): Promise<{
  inserted: number;
  skipped_missing_field_types: number;
  skipped_missing_values: number;
  errors: number;
}> {
  const typeKeys = [...new Set(Object.values(INDUSTRY_FIELD_TYPE_BY_SYSTEM))];
  const { data: typeRows } = await admin.from("field_types").select("id,key").in("key", typeKeys);
  const typeIdByKey = new Map((typeRows ?? []).map((row) => [String(row.key), String(row.id)]));
  let inserted = 0;
  let skippedMissingFieldTypes = 0;
  let skippedMissingValues = 0;
  let errors = 0;
  for (const edge of graph.edges) {
    const fromTypeKey = INDUSTRY_FIELD_TYPE_BY_SYSTEM[edge.fromSystem];
    const toTypeKey = INDUSTRY_FIELD_TYPE_BY_SYSTEM[edge.toSystem];
    const fromTypeId = typeIdByKey.get(fromTypeKey);
    const toTypeId = typeIdByKey.get(toTypeKey);
    if (!fromTypeId || !toTypeId) {
      skippedMissingFieldTypes += 1;
      continue;
    }
    const fromValueKey = valueKeyForSystem(edge.fromSystem, edge.fromCode);
    const toValueKey = valueKeyForSystem(edge.toSystem, edge.toCode);
    const [{ data: fromValue }, { data: toValue }] = await Promise.all([
      admin.from("field_values").select("id").eq("field_type_id", fromTypeId).eq("key", fromValueKey).maybeSingle(),
      admin.from("field_values").select("id").eq("field_type_id", toTypeId).eq("key", toValueKey).maybeSingle(),
    ]);
    if (!fromValue?.id || !toValue?.id) {
      skippedMissingValues += 1;
      continue;
    }
    const { error } = await admin.from("field_crosswalks").upsert(
      {
        from_field_type_id: fromTypeId,
        from_value_id: fromValue.id,
        to_field_type_id: toTypeId,
        to_value_id: toValue.id,
        crosswalk_type: edge.relationType,
        confidence: edge.confidence,
        source: edge.source,
        metadata: {
          mapping_quality: edge.mappingQuality,
          inferred: Boolean(edge.inferred),
        },
      },
      { onConflict: "from_value_id,to_value_id,crosswalk_type" },
    );
    if (!error) inserted += 1;
    else errors += 1;
  }
  if (options?.strict && (errors > 0 || skippedMissingFieldTypes > 0)) {
    throw new Error(
      `mirrorIndustryConceptEdgesToFieldCrosswalks strict failure: errors=${errors} skipped_missing_field_types=${skippedMissingFieldTypes} skipped_missing_values=${skippedMissingValues}`,
    );
  }
  return {
    inserted,
    skipped_missing_field_types: skippedMissingFieldTypes,
    skipped_missing_values: skippedMissingValues,
    errors,
  };
}

export async function ingestIndustryConceptGraph(graph: IndustryConceptGraph): Promise<{
  concepts: number;
  codes: number;
  edges: number;
  concept_errors: number;
  code_errors: number;
  edge_errors: number;
  skipped_edges_missing_nodes: number;
}> {
  const admin = getSupabaseServiceClient();
  if (!admin) {
    return {
      concepts: 0,
      codes: 0,
      edges: 0,
      concept_errors: 0,
      code_errors: 0,
      edge_errors: 0,
      skipped_edges_missing_nodes: 0,
    };
  }
  return ingestIndustryConceptGraphWithClient(admin, graph);
}

export async function resolveIndustryCode(args: {
  codeSystem: IndustryCodeSystem;
  code: string;
}): Promise<{
  concept: IndustryConcept | null;
  code: IndustryConceptCode | null;
}> {
  const admin = getSupabaseServiceClient();
  if (!admin) return { concept: null, code: null };
  const { data: codeRow } = await admin
    .from("industry_concept_codes")
    .select("id, concept_id, code_system, code, label, hierarchy_path, parent_code, status, source, version, metadata")
    .eq("code_system", args.codeSystem)
    .eq("code", args.code)
    .maybeSingle();
  if (!codeRow) return { concept: null, code: null };
  const { data: conceptRow } = await admin
    .from("industry_concepts")
    .select("id, key, label, normalized_label, status, metadata")
    .eq("id", codeRow.concept_id)
    .maybeSingle();
  if (!conceptRow) return { concept: null, code: null };
  return {
    concept: {
      id: conceptRow.id as string,
      key: conceptRow.key as string,
      label: conceptRow.label as string,
      normalizedLabel: conceptRow.normalized_label as string,
      status: conceptRow.status as string,
      metadata: (conceptRow.metadata as Record<string, unknown>) ?? {},
    },
    code: {
      id: codeRow.id as string,
      conceptId: codeRow.concept_id as string,
      codeSystem: codeRow.code_system as IndustryCodeSystem,
      code: codeRow.code as string,
      label: codeRow.label as string,
      hierarchyPath: (codeRow.hierarchy_path as string | null) ?? null,
      parentCode: (codeRow.parent_code as string | null) ?? null,
      status: codeRow.status as string,
      source: (codeRow.source as string | null) ?? null,
      version: (codeRow.version as string | null) ?? null,
      metadata: (codeRow.metadata as Record<string, unknown>) ?? {},
    },
  };
}

export async function translateIndustryCode(args: {
  codeSystem: IndustryCodeSystem;
  code: string;
  targetSystems: IndustryCodeSystem[];
}): Promise<{
  concept: IndustryConcept | null;
  targets: IndustryConceptCode[];
  mappings: IndustryConceptEdge[];
}> {
  const admin = getSupabaseServiceClient();
  if (!admin) return { concept: null, targets: [], mappings: [] };
  const resolved = await resolveIndustryCode({ codeSystem: args.codeSystem, code: args.code });
  if (!resolved.concept) return { concept: null, targets: [], mappings: [] };
  const conceptId = resolved.concept.id;
  const { data: targetRows } = await admin
    .from("industry_concept_codes")
    .select("id, concept_id, code_system, code, label, hierarchy_path, parent_code, status, source, version, metadata")
    .eq("concept_id", conceptId)
    .in("code_system", args.targetSystems);
  const { data: edgeRows } = await admin
    .from("industry_concept_edges")
    .select("id, from_concept_id, to_concept_id, relation_type, mapping_quality, confidence, source, source_evidence, status, inferred, metadata")
    .or(`from_concept_id.eq.${conceptId},to_concept_id.eq.${conceptId}`)
    .in("status", ["approved", "pending"]);
  return {
    concept: resolved.concept,
    targets: (targetRows ?? []).map((row) => ({
      id: row.id as string,
      conceptId: row.concept_id as string,
      codeSystem: row.code_system as IndustryCodeSystem,
      code: row.code as string,
      label: row.label as string,
      hierarchyPath: (row.hierarchy_path as string | null) ?? null,
      parentCode: (row.parent_code as string | null) ?? null,
      status: row.status as string,
      source: (row.source as string | null) ?? null,
      version: (row.version as string | null) ?? null,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
    })),
    mappings: (edgeRows ?? []).map((row) => ({
      id: row.id as string,
      fromConceptId: row.from_concept_id as string,
      toConceptId: row.to_concept_id as string,
      relationType: row.relation_type as string,
      mappingQuality: row.mapping_quality as string,
      confidence: Number(row.confidence ?? 0),
      source: (row.source as string | null) ?? null,
      sourceEvidence: (row.source_evidence as string | null) ?? null,
      status: ((row.status as string) ?? "approved") as IndustryConceptEdge["status"],
      inferred: Boolean(row.inferred),
      metadata: (row.metadata as Record<string, unknown>) ?? {},
    })),
  };
}

export async function listIndustryEdges(status?: "pending" | "approved" | "rejected"): Promise<IndustryConceptEdge[]> {
  const admin = getSupabaseServiceClient();
  if (!admin) return [];
  const query = admin
    .from("industry_concept_edges")
    .select("id, from_concept_id, to_concept_id, relation_type, mapping_quality, confidence, source, source_evidence, status, inferred, metadata")
    .order("created_at", { ascending: false })
    .limit(500);
  const { data } = status ? await query.eq("status", status) : await query;
  return (data ?? []).map((row) => ({
    id: row.id as string,
    fromConceptId: row.from_concept_id as string,
    toConceptId: row.to_concept_id as string,
    relationType: row.relation_type as string,
    mappingQuality: row.mapping_quality as string,
    confidence: Number(row.confidence ?? 0),
    source: (row.source as string | null) ?? null,
    sourceEvidence: (row.source_evidence as string | null) ?? null,
    status: ((row.status as string) ?? "approved") as IndustryConceptEdge["status"],
    inferred: Boolean(row.inferred),
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  }));
}

export async function decideIndustryEdge(args: {
  edgeId: string;
  decision: "approved" | "rejected";
  actorId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const admin = getSupabaseServiceClient();
  if (!admin) return { ok: false, error: "Server not configured" };
  const { error } = await admin
    .from("industry_concept_edges")
    .update({
      status: args.decision,
      reviewed_by: args.actorId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", args.edgeId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
