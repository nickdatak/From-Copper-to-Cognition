import { useAppStore } from '../store/appStore';

export function useGraphSelection() {
  const selectedNodeIds = useAppStore((s) => s.selectedNodeIds);
  const hoveredNodeId = useAppStore((s) => s.hoveredNodeId);
  const selectNode = useAppStore((s) => s.selectNode);
  const clearSelection = useAppStore((s) => s.clearSelection);
  const setHoveredNodeId = useAppStore((s) => s.setHoveredNodeId);
  return { selectedNodeIds, hoveredNodeId, selectNode, clearSelection, setHoveredNodeId };
}
