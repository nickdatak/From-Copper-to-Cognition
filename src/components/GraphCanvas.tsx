import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import cytoscape, { type Core, type ElementDefinition } from 'cytoscape';
import {
  buildCyElements,
  buildEffectiveNodes,
  filterEdges,
  filterNodes,
  getClusterId,
  type FilterState,
} from '../lib/graphTransform';
import { buildStylesheet } from '../lib/graphStyles';
import { applyChainHighlight, clearChainHighlight } from '../lib/chainHighlight';
import { traceValueChain } from '../lib/chainTrace';
import { applyCompanyLogosToCy } from '../lib/companyLogos';
import { applyGraphToCy, focusNode } from '../lib/graphLayouts';
import { useCompanyLogos } from '../hooks/useCompanyLogos';
import { useAppStore } from '../store/appStore';
import { Tooltip } from './Tooltip';

const VIEW_MODE = 'cluster';
import type { EffectiveNode } from '../types/graph';

export interface GraphCanvasHandle {
  cy: Core | null;
  resetLayout: () => void;
  fit: () => void;
  focusSelected: () => void;
  focusNodeById: (id: string) => void;
  fitChainTrace: () => void;
}

interface GraphCanvasProps {
  canvasRef?: React.MutableRefObject<GraphCanvasHandle | null>;
}

function resolveClusterEle(cy: Core, nodeId: string) {
  const n = cy.getElementById(nodeId);
  if (!n.nonempty()) return n;
  if (n.data('nodeType') === 'cluster') return n;
  const cid = n.data('clusterId');
  return cid ? cy.getElementById(String(cid)) : n;
}

export function GraphCanvas({ canvasRef }: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const elementsRef = useRef<ElementDefinition[]>([]);
  const chainTraceRef = useRef<ReturnType<typeof traceValueChain> | null>(null);

  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    node: EffectiveNode;
  } | null>(null);

  const nodes = useAppStore((s) => s.nodes);
  const edges = useAppStore((s) => s.edges);
  const clusters = useAppStore((s) => s.clusters);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const clustersFilter = useAppStore((s) => s.clustersFilter);
  const edgeTypes = useAppStore((s) => s.edgeTypes);
  const showClusters = useAppStore((s) => s.showClusters);
  const showCompanies = useAppStore((s) => s.showCompanies);
  const selectedNodeIds = useAppStore((s) => s.selectedNodeIds);
  const chainTraceClusterId = useAppStore((s) => s.chainTraceClusterId);
  const setCyReady = useAppStore((s) => s.setCyReady);

  const filters: FilterState = useMemo(
    () => ({
      searchQuery,
      clusters: clustersFilter,
      edgeTypes,
      showClusters,
      showCompanies,
    }),
    [searchQuery, clustersFilter, edgeTypes, showClusters, showCompanies]
  );

  const effectiveNodes = useMemo(
    () => buildEffectiveNodes(nodes, undefined),
    [nodes]
  );

  const visibleNodes = useMemo(
    () => filterNodes(effectiveNodes, filters),
    [effectiveNodes, filters]
  );

  const visibleClusterIds = useMemo(
    () => new Set(visibleNodes.filter((n) => n.isCluster).map((n) => n.id)),
    [visibleNodes]
  );

  const visibleEdges = useMemo(
    () => filterEdges(edges, visibleClusterIds, filters),
    [edges, visibleClusterIds, filters]
  );

  const elements = useMemo(
    () => buildCyElements(visibleNodes, visibleEdges, clusters, VIEW_MODE),
    [visibleNodes, visibleEdges, clusters]
  );

  elementsRef.current = elements;

  const companyTickers = useMemo(
    () =>
      [
        ...new Set(
          visibleNodes
            .filter((n) => !n.isCluster && n.ticker)
            .map((n) => n.ticker!.trim().toUpperCase())
        ),
      ],
    [visibleNodes]
  );

  const companyLogos = useCompanyLogos(companyTickers);

  const chainTrace = useMemo(() => {
    if (!chainTraceClusterId) return null;
    return traceValueChain(chainTraceClusterId, visibleEdges, clusters);
  }, [chainTraceClusterId, visibleEdges, clusters]);

  chainTraceRef.current = chainTrace;

  const lookupNode = useCallback(
    (id: string) => effectiveNodes.find((n) => n.id === id),
    [effectiveNodes]
  );

  const pushElementsToCy = useCallback((cy: Core, els: ElementDefinition[]) => {
    cy.batch(() => {
      cy.elements().remove();
      if (els.length > 0) cy.add(els);
    });
    requestAnimationFrame(() => {
      cy.resize();
      if (cy.nodes().length > 0) {
        applyGraphToCy(cy);
      }
    });
  }, []);

  const updateSelectionStyles = useCallback((cy: Core, selectedIds: string[]) => {
    cy.batch(() => {
      cy.elements().removeClass(
        'selected neighbor dimmed hovered highlighted on-path on-chain on-chain-upstream on-chain-downstream'
      );
      if (selectedIds.length === 0) return;

      let highlight = cy.collection();
      selectedIds.forEach((id) => {
        const n = cy.getElementById(id);
        if (!n.nonempty()) return;
        highlight = highlight.merge(n);
        const cluster = resolveClusterEle(cy, id);
        if (cluster.nonempty()) {
          const hood = cluster.closedNeighborhood();
          const peers = cy.nodes().filter(
            (x) => x.data('clusterId') === cluster.id() && x.data('nodeType') === 'company'
          );
          highlight = highlight.merge(hood).merge(peers);
        }
      });

      if (highlight.empty()) return;

      cy.elements().addClass('dimmed');
      highlight.removeClass('dimmed');
      highlight.nodes().addClass('selected');
      highlight.edges().removeClass('dimmed').addClass('highlighted');
    });
  }, []);

  const refreshHighlight = useCallback(
    (cy: Core, trace: ReturnType<typeof traceValueChain> | null, selectedIds: string[]) => {
      if (trace) {
        applyChainHighlight(cy, trace);
        return;
      }
      clearChainHighlight(cy);
      updateSelectionStyles(cy, selectedIds);
    },
    [updateSelectionStyles]
  );

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const cy = cytoscape({
      container,
      style: buildStylesheet(VIEW_MODE),
      minZoom: 0.05,
      maxZoom: 2.5,
      wheelSensitivity: 0.25,
      boxSelectionEnabled: false,
    });

    cyRef.current = cy;
    setCyReady(true);
    pushElementsToCy(cy, elementsRef.current);

    cy.on('mouseover', 'node', (evt) => {
      const node = evt.target;
      const data = lookupNode(node.id());
      if (!data) return;
      const rect = container.getBoundingClientRect();
      const pos = node.renderedPosition();
      setTooltip({
        x: rect.left + pos.x,
        y: rect.top + pos.y,
        node: data,
      });
    });

    cy.on('mouseout', 'node', () => setTooltip(null));

    cy.on('tap', 'node', (evt) => {
      const id = evt.target.id();
      const additive = evt.originalEvent.shiftKey || evt.originalEvent.metaKey;
      useAppStore.getState().selectNode(id, additive);
    });

    cy.on('tap', (evt) => {
      if (evt.target !== cy) return;
      const { clearSelection, clearChainTrace } = useAppStore.getState();
      clearSelection();
      clearChainTrace();
      cy.elements().removeClass(
        'selected neighbor dimmed highlighted on-chain on-chain-upstream on-chain-downstream'
      );
    });

    cy.on('dbltap', 'node', (evt) => {
      focusNode(cy, evt.target.id(), 1.4);
    });

    if (canvasRef) {
      canvasRef.current = {
        cy,
        resetLayout: () => applyGraphToCy(cy),
        fit: () => applyGraphToCy(cy),
        focusSelected: () => {
          const id = useAppStore.getState().selectedNodeIds[0];
          if (id) focusNode(cy, id);
        },
        focusNodeById: (id: string) => focusNode(cy, id),
        fitChainTrace: () => {
          const trace = chainTraceRef.current;
          if (!trace) return;
          const eles = cy.collection();
          trace.clusterIds.forEach((cid) => {
            const cluster = cy.getElementById(cid);
            if (cluster.nonempty()) eles.merge(cluster);
            eles.merge(cy.nodes().filter((n) => n.data('clusterId') === cid));
          });
          trace.edgeIds.forEach((eid) => {
            const edge = cy.getElementById(eid);
            if (edge.nonempty()) eles.merge(edge);
          });
          if (eles.nonempty()) {
            cy.animate({ fit: { eles, padding: 80 }, duration: 400 });
          }
        },
      };
    }

    const ro = new ResizeObserver(() => {
      cy.resize();
      if (cy.nodes().length > 0) applyGraphToCy(cy);
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      cy.destroy();
      cyRef.current = null;
      if (canvasRef) canvasRef.current = null;
      setCyReady(false);
    };
  }, [canvasRef, pushElementsToCy, lookupNode, setCyReady]);

  useEffect(() => {
    const visibleIds = new Set(visibleNodes.map((n) => n.id));
    const pruned = selectedNodeIds.filter((id) => visibleIds.has(id));
    if (pruned.length !== selectedNodeIds.length) {
      useAppStore.setState({ selectedNodeIds: pruned });
    }
  }, [visibleNodes, selectedNodeIds]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    pushElementsToCy(cy, elements);
  }, [elements, pushElementsToCy]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    applyCompanyLogosToCy(cy, companyLogos);
  }, [elements, companyLogos]);

  useEffect(() => {
    if (chainTraceClusterId && !visibleClusterIds.has(chainTraceClusterId)) {
      useAppStore.getState().clearChainTrace();
    }
  }, [chainTraceClusterId, visibleClusterIds]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    requestAnimationFrame(() => {
      if (!cyRef.current) return;
      refreshHighlight(cy, chainTrace, useAppStore.getState().selectedNodeIds);
    });
  }, [chainTrace, chainTraceClusterId, selectedNodeIds, refreshHighlight, elements]);

  const companyCount = nodes.filter((n) => n.nodeType === 'company').length;

  return (
    <div className="relative h-full min-h-[400px] w-full graph-bg">
      <div ref={containerRef} className="absolute inset-0 z-0" style={{ width: '100%', height: '100%' }} />
      {companyCount > 0 && visibleNodes.filter((n) => !n.isCluster).length === 0 && (
        <div
          className="absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded border px-3 py-2 text-xs"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
        >
          No companies visible — adjust cluster filters or enable Show companies.
        </div>
      )}
      {tooltip && (
        <Tooltip
          x={tooltip.x}
          y={tooltip.y}
          title={tooltip.node.label}
          layer={clusters.find((c) => c.id === getClusterId(tooltip.node))?.label ?? getClusterId(tooltip.node)}
          nodeType={tooltip.node.isCluster ? 'industry cluster' : tooltip.node.ticker ?? 'company'}
          description={tooltip.node.description}
        />
      )}
    </div>
  );
}
