import { useEffect, useState } from 'react';
import { resolveCompanyLogos } from '../lib/companyLogos';

/** Fetches and caches company logo URLs by ticker (only entries with a logo). */
export function useCompanyLogos(tickers: string[]): Map<string, string> {
  const [logos, setLogos] = useState<Map<string, string>>(() => new Map());
  const tickersKey = [...tickers].sort().join('\0');

  useEffect(() => {
    if (!tickers.length) {
      setLogos(new Map());
      return;
    }

    let cancelled = false;
    resolveCompanyLogos(tickers).then((map) => {
      if (!cancelled) setLogos(map);
    });

    return () => {
      cancelled = true;
    };
  }, [tickersKey]);

  return logos;
}
