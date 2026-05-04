import type {
  FlowFieldMapping,
  FlowPack,
  FlowPackVersion,
} from "@/lib/domain/types";
import { flowPackV1Schema, type FlowPackV1 } from "@/lib/flows/schema";
import {
  type IFlowRepository,
  type FlowVersionWithMappings,
} from "@/lib/flows/flow-repository.interface";
import { flowDefinitions } from "@/data/flows";

type StaticEntry = {
  pack: FlowPack;
  version: FlowPackVersion;
  mappings: FlowFieldMapping[];
};

const STATIC_NAMESPACE = "feeldkit-static";

function makeStableId(input: string): string {
  return `${STATIC_NAMESPACE}:${input}`;
}

function buildEntry(definition: FlowPackV1, createdAt: string): StaticEntry {
  const flowPackId = makeStableId(definition.key);
  const versionId = makeStableId(`${definition.key}:v:${definition.version}`);
  const mappings: FlowFieldMapping[] = definition.field_mappings.map((mapping, idx) => {
    const transform =
      mapping.kind === "direct" ? (mapping.transform ?? { op: "copy" }) : {};
    const options =
      mapping.kind === "translate"
        ? mapping.options ?? {}
        : {};
    return {
      id: makeStableId(`${definition.key}:v:${definition.version}:m:${idx}`),
      flowPackVersionId: versionId,
      ordinal: idx,
      kind: mapping.kind,
      sourceFieldKey: mapping.source_field_key,
      targetFieldKey: mapping.target_field_key,
      transform: transform as Record<string, unknown>,
      options: options as Record<string, unknown>,
      isRequired: mapping.is_required,
      status: "active",
    };
  });

  const pack: FlowPack = {
    id: flowPackId,
    key: definition.key,
    name: definition.name,
    description: definition.description ?? "",
    sourceSystem: definition.source_system,
    targetSystem: definition.target_system,
    status: "active",
    isSystem: true,
    metadata: definition.metadata ?? {},
    createdAt,
    updatedAt: createdAt,
  };

  const version: FlowPackVersion = {
    id: versionId,
    flowPackId,
    version: definition.version,
    changelog: definition.changelog ?? null,
    definition: definition as unknown as Record<string, unknown>,
    sourceSnapshot: {},
    isActive: true,
    createdAt,
  };

  return { pack, version, mappings };
}

export class StaticFlowRepository implements IFlowRepository {
  private readonly entries: StaticEntry[];

  constructor(definitions: FlowPackV1[] = flowDefinitions) {
    const createdAt = new Date(0).toISOString();
    this.entries = definitions
      .map((raw) => flowPackV1Schema.parse(raw))
      .map((definition) => buildEntry(definition, createdAt));
  }

  async listFlows(): Promise<FlowPack[]> {
    return this.entries.map((entry) => entry.pack);
  }

  async getFlowByKey(flowKey: string): Promise<FlowPack | null> {
    const found = this.entries.find((entry) => entry.pack.key === flowKey);
    return found ? found.pack : null;
  }

  async getFlowVersion(
    flowKey: string,
    version?: string,
  ): Promise<FlowVersionWithMappings | null> {
    const found = this.entries.find(
      (entry) => entry.pack.key === flowKey && (!version || entry.version.version === version),
    );
    if (!found) return null;
    return { pack: found.pack, version: found.version, mappings: found.mappings };
  }

  async listVersions(flowKey: string): Promise<FlowPackVersion[]> {
    return this.entries.filter((entry) => entry.pack.key === flowKey).map((entry) => entry.version);
  }
}
