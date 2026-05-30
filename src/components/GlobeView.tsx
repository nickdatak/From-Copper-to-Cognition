import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Globe from 'react-globe.gl';
import type { GlobeMethods } from 'react-globe.gl';
import locationsJson from '../data/company_locations.json';
import { useAppStore } from '../store/appStore';
import { clusterColor } from '../lib/graphTransform';
import {
  buildGlobeCompanyPoints,
  loadGlobePolygons,
  polygonMatchesFilter,
} from '../lib/globeGeo';
import type { CompanyLocationsFile, GlobeCompanyPoint, GlobePolygon } from '../types/locations';

export interface GlobeViewHandle {
  focusNodeById: (nodeId: string) => void;
}

interface GlobeViewProps {
  globeRef?: React.MutableRefObject<GlobeViewHandle | null>;
}

const locationsFile = locationsJson as unknown as CompanyLocationsFile;

export function GlobeView({ globeRef: externalRef }: GlobeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [size, setSize] = useState({ width: 800, height: 600 });

  const nodes = useAppStore((s) => s.nodes);
  const clusters = useAppStore((s) => s.clusters);
  const clustersFilter = useAppStore((s) => s.clustersFilter);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const selectedNodeIds = useAppStore((s) => s.selectedNodeIds);
  const hoveredNodeId = useAppStore((s) => s.hoveredNodeId);
  const globeCountryFilter = useAppStore((s) => s.globeCountryFilter);
  const globeUsStateFilter = useAppStore((s) => s.globeUsStateFilter);
  const selectNode = useAppStore((s) => s.selectNode);
  const setHoveredNodeId = useAppStore((s) => s.setHoveredNodeId);
  const setGlobeCountryFilter = useAppStore((s) => s.setGlobeCountryFilter);
  const setGlobeUsStateFilter = useAppStore((s) => s.setGlobeUsStateFilter);
  const clearGlobeFilters = useAppStore((s) => s.clearGlobeFilters);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (cr) setSize({ width: cr.width, height: cr.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const allLocations = useMemo(
    () => Object.values(locationsFile.byNodeId).filter((l) => l.lat != null),
    []
  );

  const polygons = useMemo(() => loadGlobePolygons(allLocations), [allLocations]);

  const basePoints = useMemo(
    () =>
      buildGlobeCompanyPoints(nodes, locationsFile, clusters, {
        searchQuery,
        clusters: clustersFilter,
        globeCountry: globeCountryFilter,
        globeUsState: globeUsStateFilter,
      }),
    [
      nodes,
      clusters,
      searchQuery,
      clustersFilter,
      globeCountryFilter,
      globeUsStateFilter,
    ]
  );

  const pointsData = useMemo(() => {
    const selected = new Set(selectedNodeIds);
    const hovered = hoveredNodeId;
    return basePoints.map((p) => ({
      ...p,
      size:
        selected.has(p.nodeId) ? 0.62 : hovered === p.nodeId ? 0.52 : 0.38,
    }));
  }, [basePoints, selectedNodeIds, hoveredNodeId]);

  const focusNodeById = useCallback((nodeId: string) => {
    const loc = locationsFile.byNodeId[nodeId];
    if (!loc?.lat || !globeRef.current) return;
    globeRef.current.pointOfView(
      { lat: loc.lat, lng: loc.lng, altitude: 1.4 },
      800
    );
  }, []);

  useEffect(() => {
    if (externalRef) externalRef.current = { focusNodeById };
    return () => {
      if (externalRef) externalRef.current = null;
    };
  }, [externalRef, focusNodeById]);

  useEffect(() => {
    if (selectedNodeIds.length === 1) {
      focusNodeById(selectedNodeIds[0]!);
    }
  }, [selectedNodeIds, focusNodeById]);

  const upstream = 'var(--chain-upstream)';

  const polygonCapColor = useCallback(
    (poly: GlobePolygon) => {
      const active = polygonMatchesFilter(poly, globeCountryFilter, globeUsStateFilter);
      if (active) return 'rgba(74, 163, 255, 0.22)';
      if (poly.companyCount > 0) {
        return poly.kind === 'us_state'
          ? 'rgba(214, 178, 94, 0.08)'
          : 'rgba(255, 255, 255, 0.04)';
      }
      return 'rgba(255, 255, 255, 0.015)';
    },
    [globeCountryFilter, globeUsStateFilter]
  );

  const polygonSideColor = useCallback(
    (poly: GlobePolygon) => {
      const active = polygonMatchesFilter(poly, globeCountryFilter, globeUsStateFilter);
      if (active) return 'rgba(74, 163, 255, 0.35)';
      return 'rgba(214, 178, 94, 0.12)';
    },
    [globeCountryFilter, globeUsStateFilter]
  );

  const polygonStrokeColor = useCallback(
    (poly: GlobePolygon) => {
      const active = polygonMatchesFilter(poly, globeCountryFilter, globeUsStateFilter);
      if (active) return upstream;
      if (poly.companyCount > 0) return 'rgba(214, 178, 94, 0.35)';
      return 'rgba(120, 129, 154, 0.2)';
    },
    [globeCountryFilter, globeUsStateFilter, upstream]
  );

  const polygonAltitude = useCallback(
    (poly: GlobePolygon) => {
      const active = polygonMatchesFilter(poly, globeCountryFilter, globeUsStateFilter);
      if (active) return poly.kind === 'us_state' ? 0.03 : 0.025;
      return poly.kind === 'us_state' ? 0.012 : 0.008;
    },
    [globeCountryFilter, globeUsStateFilter]
  );

  const onPolygonClick = useCallback(
    (poly: GlobePolygon) => {
      if (poly.kind === 'us_state') {
        setGlobeUsStateFilter(poly.code);
        setGlobeCountryFilter('US');
      } else {
        setGlobeCountryFilter(poly.code);
        setGlobeUsStateFilter(null);
      }
    },
    [setGlobeCountryFilter, setGlobeUsStateFilter]
  );

  const filterLabel = useMemo(() => {
    if (globeUsStateFilter) return `US · ${globeUsStateFilter}`;
    if (globeCountryFilter) return globeCountryFilter;
    return null;
  }, [globeCountryFilter, globeUsStateFilter]);

  return (
    <div ref={containerRef} className="globe-view relative h-full w-full">
      <Globe
        ref={globeRef}
        width={size.width}
        height={size.height}
        backgroundColor="rgba(10, 12, 16, 0)"
        globeImageUrl={null}
        showGlobe={true}
        showGraticules={true}
        showAtmosphere={true}
        atmosphereColor="#4aa3ff"
        atmosphereAltitude={0.18}
        polygonsData={polygons}
        polygonGeoJsonGeometry={(d) =>
          (d as GlobePolygon).geo as unknown as { type: string; coordinates: number[] }
        }
        polygonCapColor={(d) => polygonCapColor(d as GlobePolygon)}
        polygonSideColor={(d) => polygonSideColor(d as GlobePolygon)}
        polygonStrokeColor={(d) => polygonStrokeColor(d as GlobePolygon)}
        polygonAltitude={(d) => polygonAltitude(d as GlobePolygon)}
        polygonLabel={(d) => {
          const poly = d as GlobePolygon;
          return poly.companyCount > 0
            ? `<div class="globe-tooltip"><strong>${poly.name}</strong><br/>${poly.companyCount} companies</div>`
            : `<div class="globe-tooltip">${poly.name}</div>`;
        }}
        onPolygonClick={(d) => onPolygonClick(d as GlobePolygon)}
        pointsData={pointsData}
        pointLat={(d) => (d as GlobeCompanyPoint).lat}
        pointLng={(d) => (d as GlobeCompanyPoint).lng}
        pointColor={(d) => {
          const p = d as GlobeCompanyPoint;
          return selectedNodeIds.includes(p.nodeId) ? '#d6b25e' : p.color;
        }}
        pointRadius={(d) => (d as GlobeCompanyPoint).size}
        pointAltitude={0.02}
        pointLabel={(d) => {
          const p = d as GlobeCompanyPoint;
          const loc = locationsFile.byNodeId[p.nodeId];
          const place = [loc?.city, loc?.usState, loc?.countryName ?? loc?.country]
            .filter(Boolean)
            .join(', ');
          return `<div class="globe-tooltip"><strong>${p.label}</strong>${
            p.ticker ? `<br/><span class="mono">${p.ticker}</span>` : ''
          }${place ? `<br/>${place}` : ''}</div>`;
        }}
        onPointClick={(p) => selectNode((p as GlobeCompanyPoint).nodeId)}
        onPointHover={(p) => setHoveredNodeId((p as GlobeCompanyPoint | null)?.nodeId ?? null)}
        ringsData={[]}
      />

      <div className="globe-hud pointer-events-none absolute left-3 top-3 z-10 max-w-xs">
        <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
          Global footprint
        </p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {pointsData.length} companies on map · drag to rotate · scroll to zoom
        </p>
        {filterLabel && (
          <p className="mt-1 text-xs" style={{ color: upstream }}>
            Filter: {filterLabel}
          </p>
        )}
      </div>

      <div className="globe-hud absolute bottom-3 left-3 z-10 flex flex-wrap gap-2">
        {filterLabel && (
          <button type="button" className="btn-ghost text-xs" onClick={clearGlobeFilters}>
            Clear region filter
          </button>
        )}
      </div>

      <div className="globe-hud pointer-events-none absolute bottom-3 right-3 z-10 max-w-[200px]">
        <p className="mb-1 text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
          Clusters
        </p>
        <ul className="max-h-32 space-y-0.5 overflow-y-auto text-[10px]">
          {clusters
            .filter((c) => clustersFilter.has(c.id))
            .slice(0, 8)
            .map((c) => (
              <li key={c.id} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ background: clusterColor(c.id, clusters) }}
                />
                <span style={{ color: 'var(--text-muted)' }}>{c.shortLabel}</span>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}
