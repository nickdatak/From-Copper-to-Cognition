import type { ClusterMeta, GraphEdge, GraphNode } from '../../types/graph';
import { getClusterId } from '../../lib/graphTransform';

interface DependencyListsProps {
  node: GraphNode;
  edges: GraphEdge[];
  clusters: ClusterMeta[];
  onNavigate: (id: string) => void;
}

export function DependencyLists({ node, edges, clusters, onNavigate }: DependencyListsProps) {
  const focusId = node.isCluster ? node.id : getClusterId(node);

  const upstream = edges
    .filter((e) => e.target === focusId)
    .map((e) => clusters.find((c) => c.id === e.source))
    .filter(Boolean) as ClusterMeta[];

  const downstream = edges
    .filter((e) => e.source === focusId)
    .map((e) => clusters.find((c) => c.id === e.target))
    .filter(Boolean) as ClusterMeta[];

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <h4 className="mb-1.5 text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Upstream clusters
        </h4>
        <ul className="space-y-1">
          {upstream.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onNavigate(c.id)}
                className="text-left text-xs hover:underline"
                style={{ color: 'var(--accent)' }}
              >
                {c.shortLabel}
              </button>
            </li>
          ))}
          {upstream.length === 0 && <li className="text-xs" style={{ color: 'var(--text-dim)' }}>—</li>}
        </ul>
      </div>
      <div>
        <h4 className="mb-1.5 text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Downstream clusters
        </h4>
        <ul className="space-y-1">
          {downstream.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onNavigate(c.id)}
                className="text-left text-xs hover:underline"
                style={{ color: 'var(--accent)' }}
              >
                {c.shortLabel}
              </button>
            </li>
          ))}
          {downstream.length === 0 && <li className="text-xs" style={{ color: 'var(--text-dim)' }}>—</li>}
        </ul>
      </div>
    </div>
  );
}
