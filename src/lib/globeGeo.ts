import { feature } from 'topojson-client';
import type { Feature, FeatureCollection } from 'geojson';
import type { Topology } from 'topojson-specification';
import worldTopo from 'world-atlas/countries-110m.json';
import usTopo from 'us-atlas/states-10m.json';
import type { GlobePolygon } from '../types/locations';
import type { GraphNode } from '../types/graph';
import type { CompanyLocation, CompanyLocationsFile, GlobeCompanyPoint } from '../types/locations';
import { clusterColor } from './graphTransform';
import type { ClusterMeta } from '../types/graph';

/** ISO 3166-1 numeric codes used by world-atlas country ids. */
export const COUNTRY_ISO2_TO_NUMERIC: Record<string, number> = {
  US: 840,
  GB: 826,
  TW: 158,
  CA: 124,
  IE: 372,
  KR: 410,
  FR: 250,
  DE: 276,
  NL: 528,
  HK: 344,
  AU: 36,
  IL: 376,
  CH: 756,
  SG: 702,
  CN: 156,
};

export const US_STATE_TO_FIPS: Record<string, string> = {
  AL: '01', AK: '02', AZ: '04', AR: '05', CA: '06', CO: '08', CT: '09', DE: '10',
  FL: '12', GA: '13', HI: '15', ID: '16', IL: '17', IN: '18', IA: '19', KS: '20',
  KY: '21', LA: '22', ME: '23', MD: '24', MA: '25', MI: '26', MN: '27', MS: '28',
  MO: '29', MT: '30', NE: '31', NV: '32', NH: '33', NJ: '34', NM: '35', NY: '36',
  NC: '37', ND: '38', OH: '39', OK: '40', OR: '41', PA: '42', RI: '44', SC: '45',
  SD: '46', TN: '47', TX: '48', UT: '49', VT: '50', VA: '51', WA: '53', WV: '54',
  WI: '55', WY: '56', DC: '11',
};

export const US_FIPS_TO_STATE: Record<string, string> = Object.fromEntries(
  Object.entries(US_STATE_TO_FIPS).map(([abbr, fips]) => [fips, abbr])
);

function countByCountry(locations: CompanyLocation[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const loc of locations) {
    const c = loc.country || 'XX';
    m.set(c, (m.get(c) ?? 0) + 1);
  }
  return m;
}

function countByUsState(locations: CompanyLocation[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const loc of locations) {
    if (loc.country !== 'US' || !loc.usState) continue;
    m.set(loc.usState, (m.get(loc.usState) ?? 0) + 1);
  }
  return m;
}

export function loadGlobePolygons(locations: CompanyLocation[]): GlobePolygon[] {
  const byCountry = countByCountry(locations);
  const byState = countByUsState(locations);

  const world = worldTopo as unknown as Topology;
  const countriesFc = feature(
    world,
    world.objects.countries as Parameters<typeof feature>[1]
  ) as FeatureCollection;
  const countries = countriesFc.features;

  const countryPolys: GlobePolygon[] = countries
    .filter((f: Feature) => Number(f.id) !== COUNTRY_ISO2_TO_NUMERIC.US)
    .map((f: Feature) => {
      const numeric = Number(f.id);
      const iso2 =
        Object.entries(COUNTRY_ISO2_TO_NUMERIC).find(([, n]) => n === numeric)?.[0] ?? String(f.id);
      const name = (f.properties as { name?: string })?.name ?? iso2;
      return {
        kind: 'country' as const,
        code: iso2,
        name,
        geo: f.geometry as GeoJSON.Geometry,
        companyCount: byCountry.get(iso2) ?? 0,
      };
    });

  const us = usTopo as unknown as Topology;
  const statesFc = feature(
    us,
    us.objects.states as Parameters<typeof feature>[1]
  ) as FeatureCollection;
  const states = statesFc.features;

  const statePolys: GlobePolygon[] = states.map((f: Feature) => {
    const fips = String(f.id).padStart(2, '0');
    const abbr = US_FIPS_TO_STATE[fips] ?? fips;
    const name = (f.properties as { name?: string })?.name ?? abbr;
    return {
      kind: 'us_state' as const,
      code: abbr,
      name,
      geo: f.geometry as GeoJSON.Geometry,
      companyCount: byState.get(abbr) ?? 0,
    };
  });

  return [...countryPolys, ...statePolys];
}

export function buildGlobeCompanyPoints(
  nodes: GraphNode[],
  locationsFile: CompanyLocationsFile,
  clusters: ClusterMeta[],
  filters: {
    searchQuery: string;
    clusters: Set<string>;
    globeCountry: string | null;
    globeUsState: string | null;
  }
): GlobeCompanyPoint[] {
  const q = filters.searchQuery.trim().toLowerCase();
  const points: GlobeCompanyPoint[] = [];

  for (const node of nodes) {
    if (node.nodeType !== 'company') continue;
    const cid = node.clusterId;
    if (!filters.clusters.has(cid)) continue;

    const loc = locationsFile.byNodeId[node.id] ?? locationsFile.byTicker[node.ticker ?? ''];
    if (!loc?.lat || loc.lng == null) continue;

    if (filters.globeCountry && loc.country !== filters.globeCountry) continue;
    if (filters.globeUsState && loc.usState !== filters.globeUsState) continue;

    if (q) {
      const hay = `${node.label} ${node.shortLabel} ${node.ticker ?? ''}`.toLowerCase();
      if (!hay.includes(q)) continue;
    }

    const selected = false;
    points.push({
      nodeId: node.id,
      label: node.label,
      ticker: node.ticker ?? '',
      clusterId: cid,
      lat: loc.lat,
      lng: loc.lng,
      country: loc.country,
      usState: loc.usState,
      city: loc.city,
      color: clusterColor(cid, clusters),
      size: selected ? 0.55 : 0.38,
    });
  }

  return points;
}

export function polygonMatchesFilter(
  poly: GlobePolygon,
  globeCountry: string | null,
  globeUsState: string | null
): boolean {
  if (!globeCountry && !globeUsState) return false;
  if (poly.kind === 'us_state') {
    if (globeUsState) return poly.code === globeUsState;
    if (globeCountry === 'US') return true;
    return false;
  }
  if (globeUsState) return false;
  return globeCountry === poly.code;
}
