/** In-memory cache: ticker → resolved URL, or null if no logo found. */
const logoCache = new Map<string, string | null>();

/** Skip API probes for illustrative / private placeholders. */
const NON_LISTED_TICKER = /^(OPENAI|ANTHROPIC|MISTRAL|XAI|COHERE|FII)$/i;

function tickerVariants(ticker: string): string[] {
  const t = ticker.trim().toUpperCase();
  if (!t) return [];
  const out = [t];
  const dot = t.lastIndexOf('.');
  if (dot > 0) out.push(t.slice(0, dot));
  return [...new Set(out)];
}

function logoUrlsForSymbol(symbol: string): string[] {
  const s = encodeURIComponent(symbol);
  return [
    `https://financialmodelingprep.com/image-stock/${s}.png`,
    `https://assets.parqet.com/logos/symbol/${s}?format=png`,
  ];
}

function probeImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    const done = (ok: boolean) => {
      img.onload = null;
      img.onerror = null;
      resolve(ok);
    };
    img.onload = () => done(img.naturalWidth >= 16 && img.naturalHeight >= 16);
    img.onerror = () => done(false);
    img.src = url;
  });
}

async function resolveOneTicker(ticker: string): Promise<string | null> {
  const key = ticker.trim().toUpperCase();
  if (!key || NON_LISTED_TICKER.test(key)) {
    logoCache.set(key, null);
    return null;
  }
  if (logoCache.has(key)) return logoCache.get(key) ?? null;

  for (const variant of tickerVariants(key)) {
    for (const url of logoUrlsForSymbol(variant)) {
      if (await probeImage(url)) {
        logoCache.set(key, url);
        return url;
      }
    }
  }

  logoCache.set(key, null);
  return null;
}

async function forEachConcurrent<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  const queue = [...items];
  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift()!;
      await fn(item);
    }
  }
  const workers = Math.min(limit, items.length);
  if (workers === 0) return;
  await Promise.all(Array.from({ length: workers }, () => worker()));
}

/** Resolve logo URLs for tickers (cached). Missing logos are omitted from the map. */
export async function resolveCompanyLogos(tickers: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean))];
  const out = new Map<string, string>();

  await forEachConcurrent(unique, 8, async (ticker) => {
    const url = await resolveOneTicker(ticker);
    if (url) out.set(ticker, url);
  });

  return out;
}

export function getCachedCompanyLogo(ticker: string): string | undefined {
  const key = ticker.trim().toUpperCase();
  const v = logoCache.get(key);
  return v ?? undefined;
}

/** Apply resolved logos to Cytoscape company nodes (ticker label when no logo). */
export function applyCompanyLogosToCy(
  cy: import('cytoscape').Core,
  logos: Map<string, string>
): void {
  cy.batch(() => {
    cy.nodes('[nodeType = "company"]').forEach((n) => {
      const ticker = String(n.data('ticker') ?? '').toUpperCase();
      const shortLabel = String(n.data('shortLabel') ?? ticker);
      const url = logos.get(ticker) ?? getCachedCompanyLogo(ticker);

      if (url) {
        n.data({ logoUrl: url, hasLogo: true, displayLabel: '' });
      } else {
        n.data({ logoUrl: '', hasLogo: false, displayLabel: shortLabel });
      }
    });
  });
}
