import type { ClusterMeta, GraphEdge, GraphNode } from '../types/graph';
import nodesJson from '../data/nodes.json';
import edgesJson from '../data/edges.json';
import clustersJson from '../data/clusters.json';

export const bundledGraphData: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  clusters: ClusterMeta[];
} = {
  nodes: nodesJson as unknown as GraphNode[],
  edges: edgesJson as GraphEdge[],
  clusters: clustersJson as ClusterMeta[],
};
