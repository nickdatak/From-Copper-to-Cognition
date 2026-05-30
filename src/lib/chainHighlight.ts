import type { Core } from 'cytoscape';
import type { ChainTraceResult } from './chainTrace';

const CHAIN_CLASSES = [
  'on-chain',
  'on-chain-upstream',
  'on-chain-downstream',
  'selected',
  'neighbor',
  'dimmed',
  'highlighted',
  'on-path',
] as const;

function clusterIdForNode(n: { data: (k: string) => unknown; id: () => string }) {
  const isCluster = n.data('nodeType') === 'cluster';
  return isCluster ? n.id() : String(n.data('clusterId') ?? '');
}

/** Dim graph and highlight upstream vs downstream with distinct colors. */
export function applyChainHighlight(cy: Core, trace: ChainTraceResult): void {
  const { focusClusterId, upstreamClusterIds, downstreamClusterIds, upstreamEdgeIds, downstreamEdgeIds } =
    trace;

  cy.batch(() => {
    cy.elements().removeClass([...CHAIN_CLASSES]);

    const onChain = cy.collection();

    cy.nodes().forEach((n) => {
      const cid = clusterIdForNode(n);
      if (cid === focusClusterId) {
        onChain.merge(n);
        return;
      }
      if (upstreamClusterIds.has(cid)) {
        n.addClass('on-chain-upstream');
        onChain.merge(n);
      } else if (downstreamClusterIds.has(cid)) {
        n.addClass('on-chain-downstream');
        onChain.merge(n);
      }
    });

    cy.edges().forEach((e) => {
      if (upstreamEdgeIds.has(e.id())) {
        e.addClass('on-chain-upstream');
        onChain.merge(e);
      } else if (downstreamEdgeIds.has(e.id())) {
        e.addClass('on-chain-downstream');
        onChain.merge(e);
      }
    });

    if (onChain.empty()) return;

    cy.elements().addClass('dimmed');
    onChain.removeClass('dimmed');

    const focus = cy.getElementById(focusClusterId);
    if (focus.nonempty()) {
      focus.removeClass('on-chain-upstream on-chain-downstream').addClass('selected');
      cy.nodes()
        .filter((x) => x.data('clusterId') === focusClusterId && x.data('nodeType') === 'company')
        .removeClass('on-chain-upstream on-chain-downstream')
        .addClass('selected');
    }
  });
}

export function clearChainHighlight(cy: Core): void {
  cy.batch(() => {
    cy.elements().removeClass([...CHAIN_CLASSES]);
  });
}
