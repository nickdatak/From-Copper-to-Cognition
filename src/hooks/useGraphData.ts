import { useEffect } from 'react';
import { localJsonAdapter } from '../data/adapters/LocalJsonAdapter';
import { useAppStore } from '../store/appStore';

export function useGraphData(): void {
  const setGraphData = useAppStore((s) => s.setGraphData);
  const setError = useAppStore((s) => s.setError);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      localJsonAdapter.getNodes(),
      localJsonAdapter.getEdges(),
      localJsonAdapter.getClusters(),
    ])
      .then(([nodes, edges, clusters]) => {
        if (!cancelled) setGraphData({ nodes, edges, clusters });
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message ?? 'Failed to load graph data');
      });
    return () => {
      cancelled = true;
    };
  }, [setGraphData, setError]);
}
