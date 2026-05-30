import type { EffectiveNode, GraphNode, NodeScores, Scenario } from '../types/graph';
import { DEFAULT_YEAR, type Year } from '../types/graph';

export function applyYearScores(node: GraphNode, year: Year): NodeScores {
  const base: NodeScores = {
    importanceScore: node.importanceScore,
    pricingPowerScore: node.pricingPowerScore,
    substitutabilityScore: node.substitutabilityScore,
    capitalIntensityScore: node.capitalIntensityScore,
    valueCaptureScore: node.valueCaptureScore,
    centralityScore: node.centralityScore,
  };
  const yearPatch = node.metricsByYear?.[year];
  if (!yearPatch) return base;
  return { ...base, ...yearPatch };
}

export function applyScenarioScores(
  scores: NodeScores,
  nodeId: string,
  scenario: Scenario | undefined
): NodeScores {
  if (!scenario?.nodeScoreOverrides?.[nodeId]) return scores;
  return { ...scores, ...scenario.nodeScoreOverrides[nodeId] };
}

export function toEffectiveNode(
  node: GraphNode,
  scenario: Scenario | undefined,
  year: Year = DEFAULT_YEAR
): EffectiveNode {
  const yearScores = applyYearScores(node, year);
  const scenarioKey = node.isCluster ? node.id : (node.clusterId ?? node.id);
  const effectiveScores = applyScenarioScores(yearScores, scenarioKey, scenario);
  return { ...node, ...effectiveScores, effectiveScores };
}

export function scoreForMode(scores: NodeScores, mode: string): number {
  switch (mode) {
    case 'valueCapture':
      return scores.valueCaptureScore;
    case 'capitalIntensity':
      return scores.capitalIntensityScore;
    case 'companyExposure': {
      return scores.importanceScore;
    }
    case 'concentrationRisk':
      return 100 - scores.substitutabilityScore + scores.centralityScore * 0.5;
    default:
      return scores.importanceScore;
  }
}

export function companyExposureMax(node: GraphNode, ticker?: string): number {
  if (!node.companyExposure) return 0;
  if (ticker && node.companyExposure[ticker] != null) {
    return node.companyExposure[ticker];
  }
  return Math.max(...Object.values(node.companyExposure), 0);
}

export function normalizeScore(value: number, min = 0, max = 100): number {
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}
