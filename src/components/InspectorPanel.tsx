import { useMemo } from 'react';
import { getCachedCompanyLogo } from '../lib/companyLogos';
import { traceValueChain } from '../lib/chainTrace';
import { useCompanyLogos } from '../hooks/useCompanyLogos';
import { filterEdges, getClusterId } from '../lib/graphTransform';
import { toEffectiveNode } from '../lib/scoring';
import { useAppStore } from '../store/appStore';
import { ChainTraceSummary } from './inspector/ChainTraceSummary';
import { ScoreBars } from './inspector/ScoreBars';
import { DependencyLists } from './inspector/DependencyLists';
import type { GraphCanvasHandle } from './GraphCanvas';

function fmtCompactUsd(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

interface InspectorPanelProps {
  canvasHandle: React.MutableRefObject<GraphCanvasHandle | null>;
}

export function InspectorPanel({ canvasHandle }: InspectorPanelProps) {
  const nodes = useAppStore((s) => s.nodes);
  const edges = useAppStore((s) => s.edges);
  const clusters = useAppStore((s) => s.clusters);
  const selectedNodeIds = useAppStore((s) => s.selectedNodeIds);
  const inspectorCollapsed = useAppStore((s) => s.inspectorCollapsed);
  const setInspectorCollapsed = useAppStore((s) => s.setInspectorCollapsed);
  const selectNode = useAppStore((s) => s.selectNode);
  const chainTraceClusterId = useAppStore((s) => s.chainTraceClusterId);
  const setChainTraceClusterId = useAppStore((s) => s.setChainTraceClusterId);
  const clearChainTrace = useAppStore((s) => s.clearChainTrace);
  const clustersFilter = useAppStore((s) => s.clustersFilter);
  const edgeTypes = useAppStore((s) => s.edgeTypes);

  const selectedNodes = useMemo(
    () =>
      selectedNodeIds
        .map((id) => nodes.find((n) => n.id === id))
        .filter(Boolean)
        .map((n) => toEffectiveNode(n!, undefined)),
    [selectedNodeIds, nodes]
  );

  const focusClusterId =
    selectedNodes.length === 1 ? getClusterId(selectedNodes[0]!) : null;

  const traceEdges = useMemo(() => {
    const visibleClusterIds = new Set(
      clusters.filter((c) => clustersFilter.has(c.id)).map((c) => c.id)
    );
    return filterEdges(edges, visibleClusterIds, {
      searchQuery: '',
      clusters: clustersFilter,
      edgeTypes,
      showClusters: true,
      showCompanies: true,
    });
  }, [edges, clusters, clustersFilter, edgeTypes]);

  const chainTrace = useMemo(() => {
    if (!focusClusterId) return null;
    return traceValueChain(focusClusterId, traceEdges, clusters);
  }, [focusClusterId, traceEdges, clusters]);

  const isChainActive =
    focusClusterId !== null && chainTraceClusterId === focusClusterId;

  const singleNode = selectedNodes.length === 1 ? selectedNodes[0]! : null;
  const inspectorTickers =
    singleNode?.ticker && !singleNode.isCluster ? [singleNode.ticker] : [];
  const inspectorLogos = useCompanyLogos(inspectorTickers);
  const logoUrl =
    singleNode?.ticker &&
    (inspectorLogos.get(singleNode.ticker.toUpperCase()) ??
      getCachedCompanyLogo(singleNode.ticker));

  const navigate = (id: string) => {
    selectNode(id);
    canvasHandle.current?.focusNodeById(id);
  };

  const toggleChainTrace = () => {
    if (!focusClusterId) return;
    if (isChainActive) {
      clearChainTrace();
      return;
    }
    setChainTraceClusterId(focusClusterId);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => canvasHandle.current?.fitChainTrace());
    });
  };

  if (inspectorCollapsed) {
    return (
      <button
        type="button"
        onClick={() => setInspectorCollapsed(false)}
        className="panel absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-l border border-r-0 px-1 py-4 text-[10px]"
        style={{ color: 'var(--text-muted)' }}
      >
        Inspector
      </button>
    );
  }

  if (selectedNodes.length === 0) {
    return (
      <aside className="panel flex w-[360px] shrink-0 flex-col border-l" style={{ background: 'var(--surface)' }}>
        <header className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Inspector
          </span>
          <button type="button" className="btn-ghost" onClick={() => setInspectorCollapsed(true)}>
            ›
          </button>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Select a company or cluster. Edges show how industry groups connect; companies live inside clusters.
          </p>
        </div>
      </aside>
    );
  }

  if (selectedNodes.length > 1) {
    return (
      <aside className="panel flex w-[360px] shrink-0 flex-col border-l" style={{ background: 'var(--surface)' }}>
        <header className="border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Multi-select ({selectedNodes.length})
          </span>
        </header>
        <div className="overflow-y-auto p-4">
          <ul className="space-y-2">
            {selectedNodes.map((n) => (
              <li key={n.id} className="text-sm">
                {n.ticker ? `${n.ticker} · ` : ''}
                {n.label}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    );
  }

  const node = singleNode!;
  const clusterMeta = clusters.find((c) => c.id === focusClusterId);

  return (
    <aside className="panel flex w-[360px] shrink-0 flex-col border-l" style={{ background: 'var(--surface)' }}>
      <header className="flex items-start justify-between gap-2 border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
        <div className="flex min-w-0 items-start gap-2">
          {logoUrl && (
            <img
              src={logoUrl}
              alt=""
              className="mt-0.5 h-9 w-9 shrink-0 rounded-full border object-contain"
              style={{ borderColor: 'var(--border)', background: '#2a2724' }}
            />
          )}
          <div className="min-w-0">
          <h2 className="text-base font-semibold leading-tight">
            {node.ticker ? `${node.label} (${node.ticker})` : node.label}
          </h2>
          <p className="mt-0.5 text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            {node.isCluster ? 'Industry cluster' : 'Company'}
            {clusterMeta && !node.isCluster ? ` · ${clusterMeta.label}` : ''}
          </p>
          </div>
        </div>
        <button type="button" className="btn-ghost shrink-0" onClick={() => setInspectorCollapsed(true)}>
          ›
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {node.description}
        </p>

        {clusterMeta && (
          <section>
            <h3 className="mb-1 text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Cluster role
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
              {clusterMeta.desc}
            </p>
          </section>
        )}

        {node.roles && node.roles.length > 0 && (
          <section>
            <h3 className="mb-1 text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Also exposed to
            </h3>
            <div className="flex flex-wrap gap-1">
              {node.roles.map((role) => (
                <span
                  key={role}
                  className="rounded px-1.5 py-0.5 text-[10px]"
                  style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}
                >
                  {role.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </section>
        )}

        {node.tags?.includes('illustrative') && (
          <p className="text-[10px] italic" style={{ color: 'var(--text-dim)' }}>
            Illustrative node (private or non-listed).
          </p>
        )}

        <section>
          <h3 className="mb-2 text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Scores
          </h3>
          <ScoreBars scores={node.effectiveScores} />
        </section>

        {node.isCluster && clusterMeta?.fundamentals && (
          <section>
            <h3 className="mb-2 text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Fundamentals (cluster avg/sum)
            </h3>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs" style={{ color: 'var(--text-dim)' }}>
              <div>
                <div className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  Avg P/E
                </div>
                <div>{clusterMeta.fundamentals.avgPe != null ? clusterMeta.fundamentals.avgPe.toFixed(1) : '—'}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  Avg revenue (TTM)
                </div>
                <div>
                  {clusterMeta.fundamentals.avgRevenueTTM != null
                    ? fmtCompactUsd(clusterMeta.fundamentals.avgRevenueTTM)
                    : '—'}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  Total revenue (TTM)
                </div>
                <div>
                  {clusterMeta.fundamentals.totalRevenueTTM != null
                    ? fmtCompactUsd(clusterMeta.fundamentals.totalRevenueTTM)
                    : '—'}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  Sample size
                </div>
                <div>{clusterMeta.fundamentals.sampleSize ?? '—'}</div>
              </div>
            </div>
            {clusterMeta.fundamentals.asOf && (
              <p className="mt-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                Source: {clusterMeta.fundamentals.source ?? '—'} · as of {clusterMeta.fundamentals.asOf}
              </p>
            )}
          </section>
        )}

        {!node.isCluster && node.fundamentals && (
          <section>
            <h3 className="mb-2 text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Fundamentals
            </h3>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs" style={{ color: 'var(--text-dim)' }}>
              <div>
                <div className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  P/E (TTM)
                </div>
                <div>{node.fundamentals.pe != null ? node.fundamentals.pe.toFixed(1) : '—'}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  Revenue (TTM)
                </div>
                <div>
                  {node.fundamentals.revenueTTM != null ? fmtCompactUsd(node.fundamentals.revenueTTM) : '—'}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  Market cap
                </div>
                <div>{node.fundamentals.marketCap != null ? fmtCompactUsd(node.fundamentals.marketCap) : '—'}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  Currency
                </div>
                <div>{node.fundamentals.currency ?? '—'}</div>
              </div>
            </div>
            {node.fundamentals.asOf && (
              <p className="mt-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                Source: {node.fundamentals.source ?? '—'} · as of {node.fundamentals.asOf}
              </p>
            )}
          </section>
        )}

        <DependencyLists
          node={node}
          edges={edges}
          clusters={clusters}
          onNavigate={navigate}
        />

        <section className="border-t pt-3" style={{ borderColor: 'var(--border)' }}>
          <h3 className="mb-2 text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Value chain trace
          </h3>
          <p className="mb-2 text-xs leading-relaxed" style={{ color: 'var(--text-dim)' }}>
            DFS upstream and downstream through all cluster links (multi-hop), not just immediate neighbors.
          </p>
          <p className="mb-2 flex flex-wrap gap-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: 'var(--chain-upstream)' }} />
              Upstream
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: 'var(--chain-downstream)' }} />
              Downstream
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full border border-white" style={{ background: 'transparent' }} />
              Focus
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={isChainActive ? 'btn-ghost active' : 'btn-primary'}
              onClick={toggleChainTrace}
            >
              {isChainActive ? 'Clear trace' : 'Trace value chain'}
            </button>
            {isChainActive && (
              <button type="button" className="btn-ghost" onClick={() => canvasHandle.current?.fitChainTrace()}>
                Fit trace to screen
              </button>
            )}
          </div>
          {isChainActive && chainTrace && (
            <div className="mt-3">
              <ChainTraceSummary trace={chainTrace} clusters={clusters} onNavigate={navigate} />
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}
