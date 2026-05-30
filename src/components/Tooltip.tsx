interface TooltipProps {
  x: number;
  y: number;
  title: string;
  layer: string;
  nodeType: string;
  description: string;
}

export function Tooltip({ x, y, title, layer, nodeType, description }: TooltipProps) {
  return (
    <div
      className="pointer-events-none fixed z-50 max-w-xs rounded border px-3 py-2 shadow-lg"
      style={{
        left: x + 12,
        top: y - 8,
        background: 'var(--surface)',
        borderColor: 'var(--border)',
        color: 'var(--text)',
      }}
    >
      <div className="text-sm font-medium">{title}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {layer.replace(/([A-Z])/g, ' $1').trim()} · {nodeType.replace(/_/g, ' ')}
      </div>
      <p className="mt-1.5 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        {description.slice(0, 140)}
        {description.length > 140 ? '…' : ''}
      </p>
    </div>
  );
}
