import type { ClusterMeta, GraphEdge } from '../types/graph';

export interface ChainTraceResult {
  focusClusterId: string;
  /** All clusters on any upstream or downstream path (includes focus). */
  clusterIds: Set<string>;
  /** Directed edges that lie on at least one upstream/downstream path through focus. */
  edgeIds: Set<string>;
  upstreamClusterIds: Set<string>;
  downstreamClusterIds: Set<string>;
  upstreamEdgeIds: Set<string>;
  downstreamEdgeIds: Set<string>;
  /** Upstream clusters sorted by value-chain order (raw materials first). */
  upstreamOrdered: string[];
  /** Downstream clusters sorted by value-chain order. */
  downstreamOrdered: string[];
}

function buildAdjacency(edges: GraphEdge[]) {
  const upstreamOf = new Map<string, { clusterId: string; edgeId: string }[]>();
  const downstreamOf = new Map<string, { clusterId: string; edgeId: string }[]>();

  for (const e of edges) {
    if (!upstreamOf.has(e.target)) upstreamOf.set(e.target, []);
    upstreamOf.get(e.target)!.push({ clusterId: e.source, edgeId: e.id });

    if (!downstreamOf.has(e.source)) downstreamOf.set(e.source, []);
    downstreamOf.get(e.source)!.push({ clusterId: e.target, edgeId: e.id });
  }

  return { upstreamOf, downstreamOf };
}

/** DFS upstream: all ancestors of `start` (excluding start). */
function collectUpstream(
  start: string,
  upstreamOf: Map<string, { clusterId: string; edgeId: string }[]>
): { clusterIds: Set<string>; edgeIds: Set<string> } {
  const clusterIds = new Set<string>();
  const edgeIds = new Set<string>();
  const visited = new Set<string>();

  function dfs(node: string) {
    const parents = upstreamOf.get(node) ?? [];
    for (const { clusterId, edgeId } of parents) {
      edgeIds.add(edgeId);
      if (visited.has(clusterId)) continue;
      visited.add(clusterId);
      clusterIds.add(clusterId);
      dfs(clusterId);
    }
  }

  dfs(start);
  return { clusterIds, edgeIds };
}

/** DFS downstream: all descendants of `start` (excluding start). */
function collectDownstream(
  start: string,
  downstreamOf: Map<string, { clusterId: string; edgeId: string }[]>
): { clusterIds: Set<string>; edgeIds: Set<string> } {
  const clusterIds = new Set<string>();
  const edgeIds = new Set<string>();
  const visited = new Set<string>();

  function dfs(node: string) {
    const children = downstreamOf.get(node) ?? [];
    for (const { clusterId, edgeId } of children) {
      edgeIds.add(edgeId);
      if (visited.has(clusterId)) continue;
      visited.add(clusterId);
      clusterIds.add(clusterId);
      dfs(clusterId);
    }
  }

  dfs(start);
  return { clusterIds, edgeIds };
}

function sortByChainOrder(clusterIds: Iterable<string>, clusters: ClusterMeta[]): string[] {
  const order = new Map<string, number>(clusters.map((c) => [c.id, c.order]));
  return [...clusterIds].sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
}

/**
 * Multi-hop value-chain trace from a cluster: full upstream + downstream subgraph.
 */
export function traceValueChain(
  focusClusterId: string,
  edges: GraphEdge[],
  clusters: ClusterMeta[]
): ChainTraceResult {
  const { upstreamOf, downstreamOf } = buildAdjacency(edges);
  const up = collectUpstream(focusClusterId, upstreamOf);
  const down = collectDownstream(focusClusterId, downstreamOf);

  const clusterIds = new Set<string>([focusClusterId, ...up.clusterIds, ...down.clusterIds]);
  const edgeIds = new Set<string>([...up.edgeIds, ...down.edgeIds]);

  return {
    focusClusterId,
    clusterIds,
    edgeIds,
    upstreamClusterIds: up.clusterIds,
    downstreamClusterIds: down.clusterIds,
    upstreamEdgeIds: up.edgeIds,
    downstreamEdgeIds: down.edgeIds,
    upstreamOrdered: sortByChainOrder(up.clusterIds, clusters),
    downstreamOrdered: sortByChainOrder(down.clusterIds, clusters),
  };
}
