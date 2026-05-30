import { useAppStore } from '../store/appStore';
import type { GraphCanvasHandle } from './GraphCanvas';
import type { GlobeViewHandle } from './GlobeView';

interface TopBarProps {
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  canvasHandle: React.MutableRefObject<GraphCanvasHandle | null>;
  globeHandle: React.MutableRefObject<GlobeViewHandle | null>;
}

export function TopBar({ searchInputRef, canvasHandle, globeHandle }: TopBarProps) {
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const activeView = useAppStore((s) => s.activeView);
  const setActiveView = useAppStore((s) => s.setActiveView);
  const nodes = useAppStore((s) => s.nodes);
  const edges = useAppStore((s) => s.edges);
  const selectNode = useAppStore((s) => s.selectNode);

  const companyCount = nodes.filter((n) => n.nodeType === 'company').length;
  const clusterCount = nodes.filter((n) => n.isCluster).length;

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    const q = searchQuery.trim().toLowerCase();
    const match = nodes.find(
      (n) =>
        n.label.toLowerCase().includes(q) ||
        n.shortLabel.toLowerCase().includes(q) ||
        (n.ticker?.toLowerCase().includes(q) ?? false)
    );
    if (match) {
      selectNode(match.id);
      if (activeView === 'globe') {
        globeHandle.current?.focusNodeById(match.id);
      } else {
        canvasHandle.current?.focusNodeById(match.id);
      }
    }
  };

  return (
    <header
      className="flex shrink-0 flex-wrap items-center gap-3 border-b px-4 py-2.5"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
    >
      <div className="mr-2 min-w-0">
        <h1 className="text-sm font-semibold tracking-tight">Copper to Cognition</h1>
        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          Company graph · industry clusters
          {companyCount > 0 && (
            <span className="mono ml-2" style={{ color: 'var(--accent-dim)' }}>
              · {companyCount} companies · {clusterCount} clusters · {edges.length} cluster links
            </span>
          )}
        </p>
      </div>

      <nav className="view-tabs flex shrink-0 gap-0.5 rounded-md p-0.5" style={{ background: 'var(--bg-elevated)' }}>
        <button
          type="button"
          className={`view-tab ${activeView === 'graph' ? 'view-tab-active' : ''}`}
          onClick={() => setActiveView('graph')}
        >
          Graph
        </button>
        <button
          type="button"
          className={`view-tab ${activeView === 'globe' ? 'view-tab-active' : ''}`}
          onClick={() => setActiveView('globe')}
        >
          Globe
        </button>
      </nav>

      <div className="flex flex-1 items-center gap-2 min-w-[200px] max-w-md">
        <input
          ref={searchInputRef}
          type="search"
          placeholder="Search companies… (/)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          className="w-full px-3 py-1.5 text-xs"
        />
      </div>

      <button type="button" className="btn-ghost" onClick={toggleTheme} title="Toggle theme">
        {theme === 'dark' ? '◐' : '◑'}
      </button>
    </header>
  );
}
