import type { Core } from 'cytoscape';
import { LAYERS } from '../types/graph';

const LAYER_GAP = 220;
const LAYER_JITTER = 70;

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h << 5) - h + id.charCodeAt(i);
  return Math.abs(h);
}

export function seedPositions(
  nodeIds: { id: string; layer: string }[]
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const layerCounts: Record<string, number> = {};

  for (const node of nodeIds) {
    const layerIndex = Math.max(0, LAYERS.indexOf(node.layer as (typeof LAYERS)[number]));
    const idx = layerCounts[node.layer] ?? 0;
    layerCounts[node.layer] = idx + 1;
    const h = hashId(node.id);
    positions.set(node.id, {
      x: layerIndex * LAYER_GAP + (h % LAYER_JITTER),
      y: idx * 55 + (h % 120),
    });
  }
  return positions;
}

/** Apply seeded positions and fit viewport — no external layout plugins. */
export function applyGraphToCy(cy: Core, onDone?: () => void): void {
  cy.resize();
  if (cy.nodes().length === 0) {
    onDone?.();
    return;
  }
  cy.fit(cy.elements(), 80);
  onDone?.();
}

export function runLayout(cy: Core, _animate = true, onDone?: () => void): void {
  applyGraphToCy(cy, onDone);
}

export function focusNode(cy: Core, nodeId: string, zoom = 1.6): void {
  const node = cy.getElementById(nodeId);
  if (!node.nonempty()) return;
  cy.animate({ center: { eles: node }, zoom, duration: 350 });
}

export function fitGraph(cy: Core): void {
  cy.resize();
  if (cy.nodes().length > 0) cy.fit(cy.elements(), 50);
}
