import type { GraphEdge, GraphNode } from '../../types/graph';

export interface GraphDataSource {
  getNodes(): Promise<GraphNode[]>;
  getEdges(): Promise<GraphEdge[]>;
}
