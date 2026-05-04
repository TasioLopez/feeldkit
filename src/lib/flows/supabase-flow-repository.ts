import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  FlowFieldMapping,
  FlowFieldMappingKind,
  FlowPack,
  FlowPackVersion,
} from "@/lib/domain/types";
import {
  type IFlowRepository,
  type FlowVersionWithMappings,
} from "@/lib/flows/flow-repository.interface";

function mapFlowPack(row: Record<string, unknown>): FlowPack {
  return {
    id: row.id as string,
    key: row.key as string,
    name: row.name as string,
    description: (row.description as string | null) ?? "",
    sourceSystem: row.source_system as string,
    targetSystem: row.target_system as string,
    status: (row.status as FlowPack["status"]) ?? "active",
    isSystem: Boolean(row.is_system),
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: (row.created_at as string) ?? new Date(0).toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date(0).toISOString(),
  };
}

function mapFlowVersion(row: Record<string, unknown>): FlowPackVersion {
  return {
    id: row.id as string,
    flowPackId: row.flow_pack_id as string,
    version: row.version as string,
    changelog: (row.changelog as string | null) ?? null,
    definition: (row.definition as Record<string, unknown>) ?? {},
    sourceSnapshot: (row.source_snapshot as Record<string, unknown>) ?? {},
    isActive: Boolean(row.is_active ?? true),
    createdAt: (row.created_at as string) ?? new Date(0).toISOString(),
  };
}

function mapFlowFieldMapping(row: Record<string, unknown>): FlowFieldMapping {
  return {
    id: row.id as string,
    flowPackVersionId: row.flow_pack_version_id as string,
    ordinal: Number(row.ordinal ?? 0),
    kind: row.kind as FlowFieldMappingKind,
    sourceFieldKey: row.source_field_key as string,
    targetFieldKey: row.target_field_key as string,
    transform: (row.transform as Record<string, unknown>) ?? {},
    options: (row.options as Record<string, unknown>) ?? {},
    isRequired: Boolean(row.is_required),
    status: (row.status as FlowFieldMapping["status"]) ?? "active",
  };
}

export class SupabaseFlowRepository implements IFlowRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listFlows(): Promise<FlowPack[]> {
    const { data, error } = await this.client
      .from("flow_packs")
      .select("*")
      .eq("status", "active")
      .order("key");
    if (error || !data) {
      return [];
    }
    return data.map((row) => mapFlowPack(row as Record<string, unknown>));
  }

  async getFlowByKey(flowKey: string): Promise<FlowPack | null> {
    const { data, error } = await this.client
      .from("flow_packs")
      .select("*")
      .eq("key", flowKey)
      .maybeSingle();
    if (error || !data) {
      return null;
    }
    return mapFlowPack(data as Record<string, unknown>);
  }

  async getFlowVersion(
    flowKey: string,
    version?: string,
  ): Promise<FlowVersionWithMappings | null> {
    const pack = await this.getFlowByKey(flowKey);
    if (!pack) return null;
    let query = this.client
      .from("flow_pack_versions")
      .select("*")
      .eq("flow_pack_id", pack.id);
    if (version) {
      query = query.eq("version", version);
    } else {
      query = query.eq("is_active", true);
    }
    const { data: versionRow, error: versionError } = await query
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (versionError || !versionRow) {
      return null;
    }
    const versionEntity = mapFlowVersion(versionRow as Record<string, unknown>);
    const { data: mappingRows, error: mappingError } = await this.client
      .from("flow_pack_field_mappings")
      .select("*")
      .eq("flow_pack_version_id", versionEntity.id)
      .order("ordinal", { ascending: true });
    if (mappingError || !mappingRows) {
      return { pack, version: versionEntity, mappings: [] };
    }
    return {
      pack,
      version: versionEntity,
      mappings: mappingRows.map((row) => mapFlowFieldMapping(row as Record<string, unknown>)),
    };
  }

  async listVersions(flowKey: string): Promise<FlowPackVersion[]> {
    const pack = await this.getFlowByKey(flowKey);
    if (!pack) return [];
    const { data, error } = await this.client
      .from("flow_pack_versions")
      .select("*")
      .eq("flow_pack_id", pack.id)
      .order("created_at", { ascending: false });
    if (error || !data) {
      return [];
    }
    return data.map((row) => mapFlowVersion(row as Record<string, unknown>));
  }
}
