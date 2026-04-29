import { loadLinkedinIndustryNodes } from "./linkedin-industries-source";
import { buildGlobalSystemNodes, inferNaicsToGlobalEdges } from "./industry-global-systems-source";
import { loadLinkedinNaicsCrosswalk } from "./industry-naics-crosswalk-source";
import { buildPracticalOverlayNodes, inferPracticalToConceptEdges } from "./industry-practical-overlay-source";
import type { IndustryCodeNode, IndustryConceptGraph, IndustryCrosswalkEdge } from "./industry-interop-types";

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
  const [linkedinNodes, naicsCrosswalk] = await Promise.all([loadLinkedinIndustryNodes(), loadLinkedinNaicsCrosswalk()]);
  const practicalNodes = buildPracticalOverlayNodes();
  const globalNodes = buildGlobalSystemNodes();
  const nodes = dedupeNodes([...linkedinNodes, ...naicsCrosswalk.naicsNodes, ...globalNodes, ...practicalNodes]);
  const inferredNaicsEdges = inferNaicsToGlobalEdges(naicsCrosswalk.naicsNodes, globalNodes);
  const practicalEdges = inferPracticalToConceptEdges(practicalNodes, linkedinNodes);
  const edges = dedupeEdges([...naicsCrosswalk.edges, ...inferredNaicsEdges, ...practicalEdges]);
  return { nodes, edges };
}
