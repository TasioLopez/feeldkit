import type {
  FlowFieldMapping,
  FlowPack,
  FlowPackVersion,
} from "@/lib/domain/types";

export interface FlowVersionWithMappings {
  pack: FlowPack;
  version: FlowPackVersion;
  mappings: FlowFieldMapping[];
}

export interface IFlowRepository {
  listFlows(): Promise<FlowPack[]>;
  getFlowByKey(flowKey: string): Promise<FlowPack | null>;
  /**
   * Returns the active version when `version` is omitted, or the explicitly pinned version.
   * Resolves the denormalized mapping rows for fast iteration during runtime.
   */
  getFlowVersion(flowKey: string, version?: string): Promise<FlowVersionWithMappings | null>;
  /** Resolve a version row by primary key (used for org pin_version overrides). */
  getFlowVersionById(versionId: string): Promise<FlowVersionWithMappings | null>;
  listVersions(flowKey: string): Promise<FlowPackVersion[]>;
}
