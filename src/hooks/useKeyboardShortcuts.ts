import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';

export function useKeyboardShortcuts(opts: {
  onFocusSearch: () => void;
  onResetLayout: () => void;
  onFocusNode: () => void;
}): void {
  const clearSelection = useAppStore((s) => s.clearSelection);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        if (e.key !== 'Escape') return;
      }

      switch (e.key) {
        case '/':
          e.preventDefault();
          opts.onFocusSearch();
          break;
        case 'Escape':
          clearSelection();
          break;
        case 'f':
        case 'F':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            opts.onFocusNode();
          }
          break;
        case 'r':
        case 'R':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            opts.onResetLayout();
          }
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [opts, clearSelection]);
}
