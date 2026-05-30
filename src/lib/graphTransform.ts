import type { ElementDefinition } from 'cytoscape';
import type {
  ClusterId,
  ClusterMeta,
  EffectiveNode,
  GraphEdge,
  GraphNode,
  Scenario,
} from '../types/graph';
import { companyExposureMax, scoreForMode, toEffectiveNode } from './scoring';

export interface FilterState {
  searchQuery: string;
  clusters: Set<ClusterId>;
  edgeTypes: Set<string>;
  showClusters: boolean;
  showCompanies: boolean;
}

export function getClusterId(node: GraphNode): ClusterId {
  return (node.clusterId ?? node.layer) as ClusterId;
}

export function buildEffectiveNodes(
  nodes: GraphNode[],
  scenario: Scenario | undefined
): EffectiveNode[] {
  return nodes.map((n) => toEffectiveNode(n, scenario));
}

export function filterNodes(
  nodes: EffectiveNode[],
  filters: FilterState
): EffectiveNode[] {
  const q = filters.searchQuery.trim().toLowerCase();
  return nodes.filter((n) => {
    const cid = getClusterId(n);
    if (!filters.clusters.has(cid)) return false;
    if (n.isCluster && !filters.showClusters) return false;
    if (!n.isCluster && n.nodeType === 'company' && !filters.showCompanies) return false;
    if (q) {
      const hay = `${n.label} ${n.shortLabel} ${n.ticker ?? ''} ${n.description}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function filterEdges(
  edges: GraphEdge[],
  visibleClusterIds: Set<string>,
  filters: FilterState
): GraphEdge[] {
  return edges.filter((e) => {
    if (!visibleClusterIds.has(e.source) || !visibleClusterIds.has(e.target)) return false;
    if (!filters.edgeTypes.has(e.edgeType)) return false;
    return true;
  });
}

export function clusterColor(clusterId: string, clusters: ClusterMeta[]): string {
  const palette = [
    '#82a8be', '#92a882', '#a89882', '#82a8a8', '#a8a082',
    '#b8a082', '#a082b8', '#b88282', '#8290b8', '#9082b8',
    '#b8909e', '#9eb890', '#d4b87a', '#b8a090', '#90b8a8',
    '#a8b090', '#c4a87a',
  ];
  const idx = clusters.findIndex((c) => c.id === clusterId);
  return palette[idx >= 0 ? idx % palette.length : 0] ?? '#a8a39c';
}

function toCyNodeData(
  node: EffectiveNode,
  viewMode: string,
  clusters: ClusterMeta[],
  companyTicker?: string
): Record<string, string | number | boolean> {
  const s = node.effectiveScores;
  const cid = getClusterId(node);
  const modeScore = scoreForMode(s, viewMode);
  const companyExp = companyExposureMax(node, companyTicker);

  return {
    id: node.id,
    label: node.label,
    shortLabel: node.shortLabel,
    displayLabel: node.shortLabel,
    nodeType: node.nodeType,
    clusterId: cid,
    clusterColor: clusterColor(cid, clusters),
    ticker: node.ticker ?? '',
    hasLogo: false,
    logoUrl: '',
    description: node.description,
    importanceScore: s.importanceScore,
    pricingPowerScore: s.pricingPowerScore,
    substitutabilityScore: s.substitutabilityScore,
    capitalIntensityScore: s.capitalIntensityScore,
    valueCaptureScore: s.valueCaptureScore,
    centralityScore: s.centralityScore,
    modeScore,
    companyExp,
    concentrationRisk: (100 - s.substitutabilityScore) * 0.5 + s.centralityScore * 0.5,
    labelOpacity: node.isCluster ? 1 : 0.92,
    isCluster: Boolean(node.isCluster),
  };
}

/**
 * Serpentine vertical layout: value chain flows top → bottom, clusters alternate
 * left/right columns so directed edges read clearly (not a long horizontal strip).
 */
export function seedCompanyGraphPositions(
  nodes: EffectiveNode[],
  clusters: ClusterMeta[]
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const clusterOrder = new Map(clusters.map((c) => [c.id, c.order]));
  const ROW_GAP = 200;
  const COL_OFFSET = 300;
  const companiesByCluster: Record<string, EffectiveNode[]> = {};

  for (const n of nodes) {
    if (n.isCluster) continue;
    const cid = getClusterId(n);
    if (!companiesByCluster[cid]) companiesByCluster[cid] = [];
    companiesByCluster[cid].push(n);
  }

  const sortedClusters = [...clusters].sort((a, b) => a.order - b.order);

  for (const cluster of sortedClusters) {
    const order = clusterOrder.get(cluster.id) ?? 0;
    const row = Math.floor(order / 2);
    const onLeft = order % 2 === 0;
    const cx = onLeft ? -COL_OFFSET : COL_OFFSET;
    const cy = row * ROW_GAP;

    positions.set(cluster.id, { x: cx, y: cy });

    const companies = companiesByCluster[cluster.id] ?? [];
    const cols = Math.ceil(Math.sqrt(companies.length)) || 1;
    companies.forEach((co, i) => {
      const col = i % cols;
      const r = Math.floor(i / cols);
      // Flat layout: absolute positions (no compound parents)
      positions.set(co.id, {
        x: cx + (col - (cols - 1) / 2) * 44,
        y: cy + 52 + r * 36,
      });
    });
  }

  return positions;
}

export function nodesToElements(
  nodes: EffectiveNode[],
  clusters: ClusterMeta[],
  viewMode: string,
  companyTicker?: string
): ElementDefinition[] {
  const positions = seedCompanyGraphPositions(nodes, clusters);
  const elements: ElementDefinition[] = [];
  // Clusters first (behind), then companies on top
  const ordered = [
    ...nodes.filter((n) => n.isCluster),
    ...nodes.filter((n) => !n.isCluster),
  ];

  for (const node of ordered) {
    const pos = positions.get(node.id);
    if (!pos) continue;

    elements.push({
      group: 'nodes',
      data: toCyNodeData(node, viewMode, clusters, companyTicker),
      position: pos,
    });
  }
  return elements;
}

export function edgesToElements(edges: GraphEdge[], scenarioId?: string): ElementDefinition[] {
  return edges.map((e) => {
    let strength = e.strength;
    if (scenarioId && e.scenarioSensitivity?.[scenarioId as keyof typeof e.scenarioSensitivity]) {
      strength *= e.scenarioSensitivity[scenarioId as keyof typeof e.scenarioSensitivity] ?? 1;
    }
    return {
      group: 'edges',
      data: {
        id: e.id,
        source: e.source,
        target: e.target,
        edgeType: e.edgeType,
        strength: Math.min(1.5, strength),
        directionality: e.directionality,
        flowType: e.flowType,
        description: e.description,
      },
    };
  });
}

export function buildCyElements(
  nodes: EffectiveNode[],
  edges: GraphEdge[],
  clusters: ClusterMeta[],
  viewMode: string,
  scenarioId?: string,
  companyTicker?: string
): ElementDefinition[] {
  const visibleClusterIds = new Set(
    nodes.filter((n) => n.isCluster).map((n) => n.id)
  );
  const clusterEdges = edges.filter(
    (e) => visibleClusterIds.has(e.source) && visibleClusterIds.has(e.target)
  );

  return [
    ...nodesToElements(nodes, clusters, viewMode, companyTicker),
    ...edgesToElements(clusterEdges, scenarioId),
  ];
}

export function layerColor(clusterId: string, clusters: ClusterMeta[]): string {
  return clusterColor(clusterId, clusters);
}
