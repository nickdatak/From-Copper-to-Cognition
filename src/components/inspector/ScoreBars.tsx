import type { NodeScores } from '../../types/graph';

const METRICS: { key: keyof NodeScores; label: string }[] = [
  { key: 'pricingPowerScore', label: 'Pricing power' },
  { key: 'capitalIntensityScore', label: 'Capital intensity' },
  { key: 'substitutabilityScore', label: 'Substitutability' },
  { key: 'valueCaptureScore', label: 'Value capture' },
];

export function ScoreBars({ scores }: { scores: NodeScores }) {
  return (
    <div className="space-y-2">
      {METRICS.map(({ key, label }) => (
        <div key={key}>
          <div className="mb-0.5 flex justify-between text-[10px]" style={{ color: 'var(--text-muted)' }}>
            <span>{label}</span>
            <span className="mono">{Math.round(scores[key])}</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full" style={{ background: 'var(--border-subtle)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${scores[key]}%`,
                background: 'var(--accent-dim)',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
