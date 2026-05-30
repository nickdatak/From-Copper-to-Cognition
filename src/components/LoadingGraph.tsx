export function LoadingGraph() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4" style={{ color: 'var(--text-muted)' }}>
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-t-transparent"
        style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}
      />
      <p className="text-sm">Loading knowledge graph…</p>
    </div>
  );
}
