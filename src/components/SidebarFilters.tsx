import { EDGE_TYPES } from '../types/graph';
import { useAppStore } from '../store/appStore';
import { Legend } from './Legend';
import { downloadJson, exportPng, exportSelectedSubgraph } from '../lib/exportSubgraph';
import type { GraphCanvasHandle } from './GraphCanvas';

interface SidebarFiltersProps {
  canvasHandle: React.MutableRefObject<GraphCanvasHandle | null>;
}

export function SidebarFilters({ canvasHandle }: SidebarFiltersProps) {
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useAppStore((s) => s.setSidebarCollapsed);
  const clusters = useAppStore((s) => s.clusters);
  const clustersFilter = useAppStore((s) => s.clustersFilter);
  const edgeTypes = useAppStore((s) => s.edgeTypes);
  const showClusters = useAppStore((s) => s.showClusters);
  const showCompanies = useAppStore((s) => s.showCompanies);
  const toggleCluster = useAppStore((s) => s.toggleCluster);
  const toggleEdgeType = useAppStore((s) => s.toggleEdgeType);
  const setShowClusters = useAppStore((s) => s.setShowClusters);
  const setShowCompanies = useAppStore((s) => s.setShowCompanies);
  const resetFilters = useAppStore((s) => s.resetFilters);
  const selectedNodeIds = useAppStore((s) => s.selectedNodeIds);
  const nodes = useAppStore((s) => s.nodes);
  const edges = useAppStore((s) => s.edges);

  if (sidebarCollapsed) {
    return (
      <button
        type="button"
        onClick={() => setSidebarCollapsed(false)}
        className="panel absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-r border border-l-0 px-1 py-4 text-[10px]"
        style={{ color: 'var(--text-muted)' }}
      >
        Controls
      </button>
    );
  }

  return (
    <aside
      className="panel flex w-[280px] shrink-0 flex-col border-r overflow-hidden"
      style={{ background: 'var(--surface)' }}
    >
      <header className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: 'var(--border)' }}>
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Controls
        </span>
        <button type="button" className="btn-ghost" onClick={() => setSidebarCollapsed(true)}>
          ‹
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        <section>
          <h3 className="mb-1.5 text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Display
          </h3>
          <div className="flex gap-1">
            <button
              type="button"
              className={`btn-ghost flex-1 text-[10px] ${showClusters ? 'active' : ''}`}
              onClick={() => setShowClusters(!showClusters)}
            >
              Clusters
            </button>
            <button
              type="button"
              className={`btn-ghost flex-1 text-[10px] ${showCompanies ? 'active' : ''}`}
              onClick={() => setShowCompanies(!showCompanies)}
            >
              Companies
            </button>
          </div>
        </section>

        <section>
          <h3 className="mb-1.5 text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Industry clusters
          </h3>
          <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
            {clusters.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`btn-ghost text-[9px] !px-1.5 ${clustersFilter.has(c.id) ? 'active' : ''}`}
                onClick={() => toggleCluster(c.id)}
                title={c.label}
              >
                {c.shortLabel}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-1.5 text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Edge types (cluster links)
          </h3>
          <div className="flex flex-wrap gap-1">
            {EDGE_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                className={`btn-ghost text-[9px] !px-1.5 ${edgeTypes.has(t) ? 'active' : ''}`}
                onClick={() => toggleEdgeType(t)}
              >
                {t.split('_')[0]}
              </button>
            ))}
          </div>
        </section>

        <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-dim)' }}>
          Edges connect industry clusters. Companies sit inside dashed cluster regions.
        </p>

        <Legend />
      </div>

      <footer className="flex flex-col gap-1.5 border-t p-3" style={{ borderColor: 'var(--border)' }}>
        <button type="button" className="btn-ghost w-full" onClick={() => canvasHandle.current?.fit()}>
          Fit to screen
        </button>
        <button type="button" className="btn-ghost w-full" onClick={() => canvasHandle.current?.focusSelected()}>
          Focus selected
        </button>
        <button type="button" className="btn-ghost w-full" onClick={() => canvasHandle.current?.resetLayout()}>
          Reset view
        </button>
        <button type="button" className="btn-ghost w-full" onClick={resetFilters}>
          Reset filters
        </button>
        <button
          type="button"
          className="btn-ghost w-full"
          onClick={() => {
            const cy = canvasHandle.current?.cy;
            if (cy) exportPng(cy);
          }}
        >
          Export PNG
        </button>
        <button
          type="button"
          className="btn-ghost w-full"
          onClick={() => {
            const cy = canvasHandle.current?.cy;
            if (!cy || selectedNodeIds.length === 0) return;
            downloadJson('subgraph.json', exportSelectedSubgraph(cy, nodes, edges, selectedNodeIds));
          }}
        >
          Export subgraph JSON
        </button>
      </footer>
    </aside>
  );
}
