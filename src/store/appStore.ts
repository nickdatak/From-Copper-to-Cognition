import { create } from 'zustand';
import type {
  ClusterId,
  ClusterMeta,
  EdgeType,
  GraphEdge,
  GraphNode,
} from '../types/graph';
import { CLUSTERS, EDGE_TYPES } from '../types/graph';
import { bundledGraphData } from './graphData';

export type AppView = 'graph' | 'globe';

interface AppState {
  nodes: GraphNode[];
  edges: GraphEdge[];
  clusters: ClusterMeta[];
  loading: boolean;
  error: string | null;

  activeView: AppView;
  globeCountryFilter: string | null;
  globeUsStateFilter: string | null;

  theme: 'dark' | 'light';
  sidebarCollapsed: boolean;
  inspectorCollapsed: boolean;

  searchQuery: string;

  clustersFilter: Set<ClusterId>;
  edgeTypes: Set<EdgeType>;
  showClusters: boolean;
  showCompanies: boolean;

  selectedNodeIds: string[];
  hoveredNodeId: string | null;

  /** Cluster id for active multi-hop value-chain trace (null = off). */
  chainTraceClusterId: string | null;

  cyReady: boolean;
  setCyReady: (ready: boolean) => void;

  setGraphData: (data: {
    nodes: GraphNode[];
    edges: GraphEdge[];
    clusters: ClusterMeta[];
  }) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  setActiveView: (view: AppView) => void;
  setGlobeCountryFilter: (code: string | null) => void;
  setGlobeUsStateFilter: (code: string | null) => void;
  clearGlobeFilters: () => void;

  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  setInspectorCollapsed: (v: boolean) => void;

  setSearchQuery: (q: string) => void;

  toggleCluster: (id: ClusterId) => void;
  toggleEdgeType: (type: EdgeType) => void;
  setShowClusters: (v: boolean) => void;
  setShowCompanies: (v: boolean) => void;
  resetFilters: () => void;

  selectNode: (id: string, additive?: boolean) => void;
  clearSelection: () => void;
  setHoveredNodeId: (id: string | null) => void;

  setChainTraceClusterId: (id: string | null) => void;
  clearChainTrace: () => void;

  hydrateFromUrl: (params: URLSearchParams) => void;
  toUrlParams: () => URLSearchParams;
}

const defaultClusters = new Set(CLUSTERS);
const defaultEdgeTypes = new Set(EDGE_TYPES);

export const useAppStore = create<AppState>((set, get) => ({
  nodes: bundledGraphData.nodes,
  edges: bundledGraphData.edges,
  clusters: bundledGraphData.clusters,
  loading: false,
  error: null,

  activeView: 'graph',
  globeCountryFilter: null,
  globeUsStateFilter: null,

  theme: 'dark',
  sidebarCollapsed: false,
  inspectorCollapsed: false,

  searchQuery: '',

  clustersFilter: defaultClusters,
  edgeTypes: defaultEdgeTypes,
  showClusters: true,
  showCompanies: true,

  selectedNodeIds: [],
  hoveredNodeId: null,

  chainTraceClusterId: null,

  cyReady: false,
  setCyReady: (ready) => set({ cyReady: ready }),

  setGraphData: (data) =>
    set({
      nodes: data.nodes,
      edges: data.edges,
      clusters: data.clusters,
      loading: false,
    }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),

  setActiveView: (activeView) => set({ activeView }),
  setGlobeCountryFilter: (globeCountryFilter) => set({ globeCountryFilter }),
  setGlobeUsStateFilter: (globeUsStateFilter) => set({ globeUsStateFilter }),
  clearGlobeFilters: () => set({ globeCountryFilter: null, globeUsStateFilter: null }),

  setTheme: (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  setInspectorCollapsed: (inspectorCollapsed) => set({ inspectorCollapsed }),

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  toggleCluster: (id) => {
    const clustersFilter = new Set(get().clustersFilter);
    if (clustersFilter.has(id)) clustersFilter.delete(id);
    else clustersFilter.add(id);
    set({ clustersFilter });
  },
  toggleEdgeType: (type) => {
    const edgeTypes = new Set(get().edgeTypes);
    if (edgeTypes.has(type)) edgeTypes.delete(type);
    else edgeTypes.add(type);
    set({ edgeTypes });
  },
  setShowClusters: (showClusters) => set({ showClusters }),
  setShowCompanies: (showCompanies) => set({ showCompanies }),
  resetFilters: () =>
    set({
      clustersFilter: new Set(CLUSTERS),
      edgeTypes: new Set(EDGE_TYPES),
      showClusters: true,
      showCompanies: true,
      searchQuery: '',
    }),

  selectNode: (id, additive) => {
    if (additive) {
      const current = get().selectedNodeIds;
      if (current.includes(id)) {
        set({ selectedNodeIds: current.filter((x) => x !== id) });
      } else {
        set({ selectedNodeIds: [...current, id] });
      }
    } else {
      set({ selectedNodeIds: [id] });
    }
  },
  clearSelection: () => set({ selectedNodeIds: [], chainTraceClusterId: null }),
  setHoveredNodeId: (hoveredNodeId) => set({ hoveredNodeId }),

  setChainTraceClusterId: (chainTraceClusterId) => set({ chainTraceClusterId }),
  clearChainTrace: () => set({ chainTraceClusterId: null }),

  hydrateFromUrl: (params) => {
    const node = params.get('node');
    if (node) set({ selectedNodeIds: node.split(',') });
    const theme = params.get('theme');
    if (theme === 'light' || theme === 'dark') get().setTheme(theme);
    const view = params.get('view');
    if (view === 'globe' || view === 'graph') set({ activeView: view });
    const country = params.get('country');
    if (country) set({ globeCountryFilter: country.toUpperCase() });
    const state = params.get('state');
    if (state) set({ globeUsStateFilter: state.toUpperCase() });
  },

  toUrlParams: () => {
    const s = get();
    const p = new URLSearchParams();
    if (s.selectedNodeIds.length) p.set('node', s.selectedNodeIds.join(','));
    if (s.theme !== 'dark') p.set('theme', s.theme);
    if (s.activeView === 'globe') p.set('view', 'globe');
    if (s.globeCountryFilter) p.set('country', s.globeCountryFilter);
    if (s.globeUsStateFilter) p.set('state', s.globeUsStateFilter);
    return p;
  },
}));
