import { EDGE_TYPES } from '../types/graph';
import { clusterColor } from '../lib/graphTransform';
import { useAppStore } from '../store/appStore';

const EDGE_COLORS: Record<string, string> = {
  physical_dependency: '#9a9590',
  capacity_translation: '#96a88a',
  commercial_flow: '#a89068',
  revenue_capture: '#d4b87a',
  bottleneck_constraint: '#d89080',
  competitive_dependency: '#8a9ab8',
  data_flow: '#88a8a8',
  power_flow: '#b8a080',
};

export function Legend() {
  const clusters = useAppStore((s) => s.clusters);

  return (
    <div className="space-y-3">
      <h3 className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        Legend
      </h3>
      <ul className="space-y-1 max-h-40 overflow-y-auto">
        {clusters.map((c) => (
          <li key={c.id} className="flex items-center gap-2 text-[10px]">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: clusterColor(c.id, clusters) }}
            />
            <span style={{ color: 'var(--text-muted)' }}>{c.shortLabel}</span>
          </li>
        ))}
      </ul>
      <div>
        <p className="mb-1 text-[10px]" style={{ color: 'var(--text-dim)' }}>
          Cluster edge types
        </p>
        <ul className="space-y-0.5">
          {EDGE_TYPES.slice(0, 5).map((et) => (
            <li key={et} className="flex items-center gap-2 text-[10px]">
              <span className="h-px w-4" style={{ background: EDGE_COLORS[et] }} />
              <span style={{ color: 'var(--text-muted)' }}>{et.replace(/_/g, ' ')}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
