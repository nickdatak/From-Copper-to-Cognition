import { useEffect } from 'react';
import { debounce } from '../utils/debounce';
import { useAppStore } from '../store/appStore';

export function useUrlState(): void {
  const hydrateFromUrl = useAppStore((s) => s.hydrateFromUrl);

  useEffect(() => {
    hydrateFromUrl(new URLSearchParams(window.location.search));
  }, [hydrateFromUrl]);

  useEffect(() => {
    const sync = debounce(() => {
      const params = useAppStore.getState().toUrlParams();
      const url = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState(null, '', url);
    }, 400);

    const unsub = useAppStore.subscribe(sync);
    return unsub;
  }, []);
}
