import { useAppStore } from '../store/appStore';

export function useGraphFilters() {
  const clustersFilter = useAppStore((s) => s.clustersFilter);
  const edgeTypes = useAppStore((s) => s.edgeTypes);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const showClusters = useAppStore((s) => s.showClusters);
  const showCompanies = useAppStore((s) => s.showCompanies);
  const toggleCluster = useAppStore((s) => s.toggleCluster);
  const toggleEdgeType = useAppStore((s) => s.toggleEdgeType);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const setShowClusters = useAppStore((s) => s.setShowClusters);
  const setShowCompanies = useAppStore((s) => s.setShowCompanies);
  const resetFilters = useAppStore((s) => s.resetFilters);
  return {
    clustersFilter,
    edgeTypes,
    searchQuery,
    showClusters,
    showCompanies,
    toggleCluster,
    toggleEdgeType,
    setSearchQuery,
    setShowClusters,
    setShowCompanies,
    resetFilters,
  };
}
