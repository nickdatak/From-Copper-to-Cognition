export interface CompanyLocation {
  ticker: string;
  nodeId?: string;
  label?: string;
  clusterId?: string;
  lat: number;
  lng: number;
  country: string;
  countryName?: string;
  usState?: string | null;
  usStateName?: string | null;
  city?: string | null;
  source?: string;
  placement?: string;
  error?: string;
}

export interface CompanyLocationsFile {
  asOf: string;
  source: string;
  ok: number;
  fail: number;
  byTicker: Record<string, CompanyLocation>;
  byNodeId: Record<string, CompanyLocation>;
}

export type GlobePolygonKind = 'country' | 'us_state';

export interface GlobePolygon {
  kind: GlobePolygonKind;
  code: string;
  name: string;
  geo: GeoJSON.Geometry;
  companyCount: number;
}

export interface GlobeCompanyPoint {
  nodeId: string;
  label: string;
  ticker: string;
  clusterId: string;
  lat: number;
  lng: number;
  country: string;
  usState?: string | null;
  city?: string | null;
  color: string;
  size: number;
}
