import cytoscape from 'cytoscape';
// @ts-expect-error no types
import fcose from 'cytoscape-fcose';

let registered = false;

export function registerCytoscapeExtensions(): void {
  if (registered) return;
  cytoscape.use(fcose);
  registered = true;
}
