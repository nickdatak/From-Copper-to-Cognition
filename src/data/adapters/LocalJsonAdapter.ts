import type { GraphDataSource } from './GraphDataSource';
import type { GraphEdge, GraphNode } from '../../types/graph';
import { bundledGraphData } from '../../store/graphData';

export class LocalJsonAdapter implements GraphDataSource {
  async getNodes(): Promise<GraphNode[]> {
    return bundledGraphData.nodes;
  }

  async getEdges(): Promise<GraphEdge[]> {
    return bundledGraphData.edges;
  }

  async getClusters() {
    return bundledGraphData.clusters;
  }
}

export const localJsonAdapter = new LocalJsonAdapter();
