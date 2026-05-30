import type { EdgeSingular, NodeSingular, StylesheetJson } from 'cytoscape';

const EDGE_COLORS: Record<string, string> = {
  physical_dependency: '#64748b', // slate
  capacity_translation: '#22c55e', // green
  commercial_flow: '#a3a3a3', // neutral
  revenue_capture: '#f59e0b', // amber
  bottleneck_constraint: '#ef4444', // red
  competitive_dependency: '#8b5cf6', // violet
  data_flow: '#38bdf8', // sky
  power_flow: '#f97316', // orange
};

function nodeFill(viewMode: string): string | ((ele: NodeSingular) => string) {
  if (viewMode === 'cluster') {
    return (ele: NodeSingular) => String(ele.data('clusterColor') ?? '#a8a39c');
  }
  if (viewMode === 'concentrationRisk') {
    return 'mapData(concentrationRisk, 0, 150, #5a5652, #d89080)';
  }
  return 'mapData(modeScore, 0, 100, #5a5652, #d4b87a)';
}

export function buildStylesheet(viewMode: string): StylesheetJson {
  const sheet = [
    {
      selector: 'node',
      style: {
        label: 'data(displayLabel)',
        'text-valign': 'bottom',
        'text-halign': 'center',
        'font-size': 9,
        'font-family': 'IBM Plex Sans, sans-serif',
        color: '#eef2f8',
        'text-margin-y': 6,
        'text-opacity': 'mapData(labelOpacity, 0, 1, 0.5, 1)',
        'min-zoomed-font-size': 7,
        width: 18,
        height: 18,
        shape: 'ellipse' as const,
        'background-color': nodeFill(viewMode),
        'background-opacity': 1,
        'border-width': 1.5,
        'border-color': '#2b3448',
        'overlay-opacity': 0,
      },
    },
    {
      selector: 'node[nodeType = "cluster"]',
      style: {
        width: 130,
        height: 75,
        shape: 'round-rectangle',
        'background-opacity': 0.18,
        'border-width': 2,
        'border-color': '#d6b25e',
        'border-style': 'dashed',
        'font-size': 11,
        'font-weight': 500,
        'text-valign': 'center',
        'text-margin-y': 0,
        'z-index': 1,
      },
    },
    {
      selector: 'node[nodeType = "company"]',
      style: {
        width: 20,
        height: 20,
        'font-size': 9,
        'z-index': 10,
      },
    },
    {
      selector: 'node[nodeType = "company"][?hasLogo]',
      style: {
        width: 28,
        height: 28,
        shape: 'ellipse' as const,
        label: '',
        'text-opacity': 0,
        'background-color': '#0a0c10',
        'background-image': 'data(logoUrl)',
        'background-fit': 'cover',
        'background-clip': 'node',
        'background-opacity': 1,
        'border-color': '#2b3448',
      },
    },
    {
      selector: 'node.hovered',
      style: { 'border-color': '#4aa3ff', 'border-width': 2.5, 'z-index': 20 },
    },
    {
      selector: 'node.selected',
      style: { 'border-color': '#eef2f8', 'border-width': 3, 'z-index': 30 },
    },
    {
      selector: 'node.neighbor',
      style: { 'border-color': '#d6b25e', 'border-width': 2 },
    },
    {
      selector: 'node.dimmed',
      style: { opacity: 0.2, 'text-opacity': 0 },
    },
    {
      selector: 'node.on-path, node.on-chain',
      style: { 'border-color': '#e8e4df', 'border-width': 2.5, opacity: 1 },
    },
    {
      selector: 'node.on-chain-upstream',
      style: {
        'border-color': '#4aa3ff',
        'border-width': 2.5,
        opacity: 1,
        'background-opacity': 0.35,
      },
    },
    {
      selector: 'node.on-chain-downstream',
      style: {
        'border-color': '#f0b04a',
        'border-width': 2.5,
        opacity: 1,
        'background-opacity': 0.35,
      },
    },
    {
      selector: 'node[nodeType = "cluster"].on-chain-upstream',
      style: { 'background-color': '#4aa3ff' },
    },
    {
      selector: 'node[nodeType = "cluster"].on-chain-downstream',
      style: { 'background-color': '#f0b04a' },
    },
    {
      selector: 'edge',
      style: {
        width: 1.75,
        'line-color': (ele: EdgeSingular) =>
          EDGE_COLORS[String(ele.data('edgeType'))] ?? '#7a7570',
        opacity: 0.62,
        'curve-style': 'unbundled-bezier',
        'control-point-distances': 60,
        'control-point-weights': 0.4,
        'target-arrow-shape': 'triangle',
        'target-arrow-color': '#94a3b8',
        'arrow-scale': 1,
      },
    },
    {
      selector: 'edge.highlighted, edge.on-path',
      style: { opacity: 0.92, width: 2.5, 'line-color': '#d6b25e', 'target-arrow-color': '#d6b25e' },
    },
    {
      selector: 'edge.on-chain-upstream',
      style: {
        opacity: 0.92,
        width: 2.5,
        'line-color': '#4aa3ff',
        'target-arrow-color': '#4aa3ff',
      },
    },
    {
      selector: 'edge.on-chain-downstream',
      style: {
        opacity: 0.92,
        width: 2.5,
        'line-color': '#f0b04a',
        'target-arrow-color': '#f0b04a',
      },
    },
    {
      selector: 'edge.dimmed',
      style: { opacity: 0.08 },
    },
  ];
  return sheet as StylesheetJson;
}
