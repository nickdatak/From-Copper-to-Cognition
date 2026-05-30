import type { ClusterMeta } from '../../types/graph';
import type { ChainTraceResult } from '../../lib/chainTrace';

interface ChainTraceSummaryProps {
  trace: ChainTraceResult;
  clusters: ClusterMeta[];
  onNavigate: (clusterId: string) => void;
}

export function ChainTraceSummary({ trace, clusters, onNavigate }: ChainTraceSummaryProps) {
  const label = (id: string) => clusters.find((c) => c.id === id)?.shortLabel ?? id;

  return (
    <section className="space-y-2">
      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
        {trace.upstreamClusterIds.size} upstream · {trace.downstreamClusterIds.size} downstream ·{' '}
        {trace.edgeIds.size} cluster links
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <h4
            className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider"
            style={{ color: 'var(--chain-upstream)' }}
          >
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: 'var(--chain-upstream)' }} />
            Upstream (DFS)
          </h4>
          <ul className="max-h-28 space-y-0.5 overflow-y-auto">
            {trace.upstreamOrdered.map((id) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onNavigate(id)}
                  className="text-left text-xs hover:underline"
                  style={{ color: 'var(--chain-upstream)' }}
                >
                  {label(id)}
                </button>
              </li>
            ))}
            {trace.upstreamOrdered.length === 0 && (
              <li className="text-xs" style={{ color: 'var(--text-dim)' }}>
                —
              </li>
            )}
          </ul>
        </div>
        <div>
          <h4
            className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider"
            style={{ color: 'var(--chain-downstream)' }}
          >
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: 'var(--chain-downstream)' }} />
            Downstream (DFS)
          </h4>
          <ul className="max-h-28 space-y-0.5 overflow-y-auto">
            {trace.downstreamOrdered.map((id) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onNavigate(id)}
                  className="text-left text-xs hover:underline"
                  style={{ color: 'var(--chain-downstream)' }}
                >
                  {label(id)}
                </button>
              </li>
            ))}
            {trace.downstreamOrdered.length === 0 && (
              <li className="text-xs" style={{ color: 'var(--text-dim)' }}>
                —
              </li>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}
