import { loadLinkedinIndustryNodesWithDiagnostics } from "./linkedin-industries-source";
import { buildGlobalSystemNodes, inferNaicsToGlobalEdges } from "./industry-global-systems-source";
import { loadLinkedinNaicsCrosswalk } from "./industry-naics-crosswalk-source";
import { buildPracticalOverlayNodes, inferPracticalToConceptEdges } from "./industry-practical-overlay-source";
import type { IndustryCodeNode, IndustryConceptGraph, IndustryCrosswalkEdge } from "./industry-interop-types";
import type { LinkedinIndustrySourceDiagnostics } from "./linkedin-industries-source";
import type { LinkedinNaicsSourceDiagnostics } from "./industry-naics-crosswalk-source";

function dedupeNodes(nodes: IndustryCodeNode[]): IndustryCodeNode[] {
  const map = new Map<string, IndustryCodeNode>();
  for (const node of nodes) {
    const key = `${node.codeSystem}:${node.code}`;
    if (!map.has(key)) map.set(key, node);
  }
  return [...map.values()];
}

function dedupeEdges(edges: IndustryCrosswalkEdge[]): IndustryCrosswalkEdge[] {
  const map = new Map<string, IndustryCrosswalkEdge>();
  for (const edge of edges) {
    const key = `${edge.fromSystem}:${edge.fromCode}->${edge.toSystem}:${edge.toCode}:${edge.relationType}:${edge.source}`;
    if (!map.has(key)) map.set(key, edge);
  }
  return [...map.values()];
}

export async function buildIndustryConceptGraph(): Promise<IndustryConceptGraph> {
  const result = await buildIndustryConceptGraphWithDiagnostics();
  return result.graph;
}

export async function buildIndustryConceptGraphWithDiagnostics(options?: {
  forceSnapshots?: boolean;
}): Promise<{
  graph: IndustryConceptGraph;
  sourceDiagnostics: {
    linkedin: LinkedinIndustrySourceDiagnostics;
    linkedin_naics: LinkedinNaicsSourceDiagnostics;
  };
}> {
  const [linkedinSource, naicsCrosswalk] = await Promise.all([
    loadLinkedinIndustryNodesWithDiagnostics({ forceSnapshots: options?.forceSnapshots }),
    loadLinkedinNaicsCrosswalk({ forceSnapshots: options?.forceSnapshots }),
  ]);
  const linkedinNodes = linkedinSource.nodes;
  const practicalNodes = buildPracticalOverlayNodes();
  const globalNodes = buildGlobalSystemNodes();
  const nodes = dedupeNodes([...linkedinNodes, ...naicsCrosswalk.naicsNodes, ...globalNodes, ...practicalNodes]);
  const inferredNaicsEdges = inferNaicsToGlobalEdges(naicsCrosswalk.naicsNodes, globalNodes);
  const practicalEdges = inferPracticalToConceptEdges(practicalNodes, linkedinNodes);
  const edges = dedupeEdges([...naicsCrosswalk.edges, ...inferredNaicsEdges, ...practicalEdges]);
  return {
    graph: { nodes, edges },
    sourceDiagnostics: {
      linkedin: linkedinSource.diagnostics,
      linkedin_naics: naicsCrosswalk.diagnostics,
    },
  };
}
