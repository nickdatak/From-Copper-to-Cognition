import { useRef } from 'react';
import { GraphCanvas, type GraphCanvasHandle } from '../components/GraphCanvas';
import { GlobeView, type GlobeViewHandle } from '../components/GlobeView';
import { TopBar } from '../components/TopBar';
import { SidebarFilters } from '../components/SidebarFilters';
import { InspectorPanel } from '../components/InspectorPanel';
import { LoadingGraph } from '../components/LoadingGraph';
import { useAppStore } from '../store/appStore';
import { useGraphData } from '../hooks/useGraphData';
import { useUrlState } from '../hooks/useUrlState';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

export function AppLayout() {
  const canvasHandle = useRef<GraphCanvasHandle | null>(null);
  const globeHandle = useRef<GlobeViewHandle | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const loading = useAppStore((s) => s.loading);
  const error = useAppStore((s) => s.error);
  const activeView = useAppStore((s) => s.activeView);

  useGraphData();
  useUrlState();

  useKeyboardShortcuts({
    onFocusSearch: () => searchInputRef.current?.focus(),
    onResetLayout: () => canvasHandle.current?.resetLayout(),
    onFocusNode: () => canvasHandle.current?.focusSelected(),
  });

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8" style={{ color: 'var(--danger)' }}>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <TopBar searchInputRef={searchInputRef} canvasHandle={canvasHandle} globeHandle={globeHandle} />
      <div className="relative flex min-h-0 flex-1">
        {activeView === 'graph' && <SidebarFilters canvasHandle={canvasHandle} />}
        <main className="relative min-h-0 min-w-0 flex-1">
          {activeView === 'graph' ? (
            <>
              <GraphCanvas canvasRef={canvasHandle} />
              {loading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ background: 'var(--bg)' }}>
                  <LoadingGraph />
                </div>
              )}
            </>
          ) : (
            <GlobeView globeRef={globeHandle} />
          )}
        </main>
        <InspectorPanel canvasHandle={canvasHandle} />
      </div>
    </div>
  );
}
