import type { Core } from 'cytoscape';
import type { GraphEdge, GraphNode } from '../types/graph';

export function exportSelectedSubgraph(
  cy: Core,
  nodes: GraphNode[],
  edges: GraphEdge[],
  selectedIds: string[]
): string {
  const idSet = new Set(selectedIds);
  for (const id of selectedIds) {
    const n = cy.getElementById(id);
    n.neighborhood().nodes().forEach((nn) => {
      idSet.add(nn.id());
    });
  }

  const subNodes = nodes.filter((n) => idSet.has(n.id));
  const subNodeIds = new Set(subNodes.map((n) => n.id));
  const subEdges = edges.filter(
    (e) => subNodeIds.has(e.source) && subNodeIds.has(e.target)
  );

  return JSON.stringify({ nodes: subNodes, edges: subEdges }, null, 2);
}

export function downloadJson(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportPng(cy: Core): void {
  const png = cy.png({ full: true, scale: 2, bg: '#0f0e0d' });
  const a = document.createElement('a');
  a.href = png;
  a.download = 'copper-to-cognition-graph.png';
  a.click();
}
