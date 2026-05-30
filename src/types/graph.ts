export const CLUSTERS = [
  'raw_materials',
  'utilities_power',
  'power_electrical',
  'cooling_thermal',
  'data_center_infra',
  'semi_fabrication',
  'semi_equipment',
  'packaging_osat',
  'memory_storage',
  'ai_accel_compute',
  'networking_optical',
  'contract_manufacturing',
  'hyperscaler_cloud',
  'ai_model_labs',
  'enterprise_software',
  'digital_advertising',
  'industrial_automation',
] as const;

export type ClusterId = (typeof CLUSTERS)[number];

/** @deprecated use clusterId — kept for migration */
export const LAYERS = CLUSTERS;
export type Layer = ClusterId;

export const NODE_TYPES = ['company', 'cluster'] as const;
export type NodeType = (typeof NODE_TYPES)[number];

export const EDGE_TYPES = [
  'physical_dependency',
  'capacity_translation',
  'commercial_flow',
  'revenue_capture',
  'bottleneck_constraint',
  'competitive_dependency',
  'data_flow',
  'power_flow',
] as const;

export type EdgeType = (typeof EDGE_TYPES)[number];

export const VIEW_MODES = ['cluster', 'valueCapture', 'capitalIntensity', 'concentrationRisk'] as const;

export type ViewMode = (typeof VIEW_MODES)[number];

export const SCENARIO_IDS = ['base'] as const;

export type ScenarioId = (typeof SCENARIO_IDS)[number];

export type Year = 2024 | 2025 | 2026 | 2027 | 2028 | 2029 | 2030;

/** Fixed scoring year (time-horizon UI removed). */
export const DEFAULT_YEAR: Year = 2026;

export interface NodeScores {
  importanceScore: number;
  pricingPowerScore: number;
  substitutabilityScore: number;
  capitalIntensityScore: number;
  valueCaptureScore: number;
  centralityScore: number;
}

export interface GraphNode extends NodeScores {
  id: string;
  label: string;
  shortLabel: string;
  nodeType: NodeType;
  /** Industry cluster (what they do) */
  clusterId: ClusterId;
  /** @deprecated use clusterId */
  layer?: ClusterId;
  description: string;
  timeToScale: string;
  capacityUnit?: string;
  geography?: string;
  ticker?: string;
  exampleCompanies: string[];
  companyExposure?: Record<string, number>;
  evidence: string[];
  tags: string[];
  /** Additional value-chain roles beyond primary clusterId (for dual-exposure companies). */
  roles?: string[];
  relatedMetrics: Record<string, string | number>;
  isCluster?: boolean;
  metricsByYear?: Partial<Record<Year, Partial<NodeScores>>>;

  /** Optional financial fundamentals pulled via offline API enrichment. */
  fundamentals?: {
    /** Price/Earnings ratio (TTM). */
    pe?: number;
    /** Revenue trailing twelve months (USD if available). */
    revenueTTM?: number;
    /** Market cap (USD if available). */
    marketCap?: number;
    /** Currency code if provider returns it. */
    currency?: string;
    /** Data provenance. */
    source?: string;
    /** ISO timestamp when fetched. */
    asOf?: string;
  };
}

/** Edges connect clusters (cluster-to-cluster) in v1 */
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  edgeType: EdgeType;
  strength: number;
  directionality: 'directed' | 'bidirectional';
  lag?: string;
  description: string;
  flowType: string;
  scenarioSensitivity?: Partial<Record<ScenarioId, number>>;
  evidence?: string[];
}

export interface ClusterMeta {
  id: ClusterId;
  label: string;
  shortLabel: string;
  order: number;
  desc: string;

  /** Aggregated fundamentals across companies in this cluster (if enriched). */
  fundamentals?: {
    /** Average P/E across companies with P/E. */
    avgPe?: number;
    /** Average revenue (TTM) across companies with revenue. */
    avgRevenueTTM?: number;
    /** Sum of revenue (TTM) across companies with revenue. */
    totalRevenueTTM?: number;
    /** Number of companies included in aggregates. */
    sampleSize?: number;
    source?: string;
    asOf?: string;
  };
}

export interface Scenario {
  id: ScenarioId;
  label: string;
  description: string;
  nodeScoreOverrides?: Record<string, Partial<NodeScores>>;
  edgeStrengthMultipliers?: Partial<Record<EdgeType, number>>;
  highlightNodeIds?: string[];
  highlightEdgeTypes?: EdgeType[];
}

export interface CuratedPath {
  id: string;
  label: string;
  startNodeId: string;
  endNodeId: string;
  description: string;
}

export interface EffectiveNode extends GraphNode {
  effectiveScores: NodeScores;
}
