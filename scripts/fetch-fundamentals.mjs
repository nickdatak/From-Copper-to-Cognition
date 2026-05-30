import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '../src/data');
const nodesPath = join(dataDir, 'nodes.json');
const outPath = join(dataDir, 'fundamentals.json');

function isIllustrative(node) {
  return Array.isArray(node.tags) && node.tags.includes('illustrative');
}

function normalizeTicker(t) {
  return String(t ?? '').trim().toUpperCase();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function readEnvFromDotenvLike(path) {
  try {
    const txt = readFileSync(path, 'utf8');
    const out = {};
    for (const line of txt.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      out[key] = val;
    }
    return out;
  } catch {
    return {};
  }
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} for ${url}${body ? ` :: ${body.slice(0, 240)}` : ''}`);
  }
  return res.json();
}

async function fetchJsonWithApiKeyHeader(url, apiKey) {
  const res = await fetch(url, {
    headers: {
      accept: 'application/json',
      apikey: apiKey,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} for ${url}${body ? ` :: ${body.slice(0, 240)}` : ''}`);
  }
  return res.json();
}

async function fetchFmpFundamentals(ticker, apiKey) {
  const base = 'https://financialmodelingprep.com/api/v3';
  // Never embed API keys into persisted error logs.
  const profileUrl = `${base}/profile/${encodeURIComponent(ticker)}?apikey=${encodeURIComponent(apiKey)}`;
  const incomeUrl = `${base}/income-statement/${encodeURIComponent(ticker)}?period=annual&limit=1&apikey=${encodeURIComponent(apiKey)}`;
  const profileUrlHeader = `${base}/profile/${encodeURIComponent(ticker)}`;
  const incomeUrlHeader = `${base}/income-statement/${encodeURIComponent(ticker)}?period=annual&limit=1`;

  let profileArr;
  let incomeArr;
  try {
    [profileArr, incomeArr] = await Promise.all([fetchJson(profileUrl), fetchJson(incomeUrl)]);
  } catch (e) {
    const msg = String(e?.message ?? e);
    // If query-param auth is rejected, retry with `apikey` header.
    if (msg.includes('Invalid API KEY') || msg.includes('Invalid API KEY.')) {
      [profileArr, incomeArr] = await Promise.all([
        fetchJsonWithApiKeyHeader(profileUrlHeader, apiKey),
        fetchJsonWithApiKeyHeader(incomeUrlHeader, apiKey),
      ]);
    } else {
      throw e;
    }
  }
  const profile = Array.isArray(profileArr) ? profileArr[0] : null;
  const income = Array.isArray(incomeArr) ? incomeArr[0] : null;

  const pe = Number(profile?.pe ?? profile?.peRatio);
  const marketCap = Number(profile?.mktCap ?? profile?.marketCap);
  const revenue = Number(income?.revenue);

  return {
    pe: Number.isFinite(pe) ? pe : undefined,
    marketCap: Number.isFinite(marketCap) ? marketCap : undefined,
    revenueTTM: Number.isFinite(revenue) ? revenue : undefined,
    currency: profile?.currency ? String(profile.currency) : undefined,
    source: 'financialmodelingprep',
  };
}

function parseMaybeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

async function fetchAlphaVantageFundamentals(ticker, apiKey) {
  // Alpha Vantage free plan supports COMPANY_OVERVIEW with RevenueTTM, MarketCapitalization, PERatio.
  const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${encodeURIComponent(
    ticker
  )}&apikey=${encodeURIComponent(apiKey)}`;
  const j = await fetchJson(url);

  if (j?.Note) throw new Error(`Rate limited :: ${String(j.Note).slice(0, 200)}`);
  if (j?.Information) throw new Error(`Error :: ${String(j.Information).slice(0, 200)}`);
  if (j?.['Error Message']) throw new Error(`Error :: ${String(j['Error Message']).slice(0, 200)}`);

  // When a symbol is not found, AV often returns {} (empty object).
  if (!j || Object.keys(j).length === 0) throw new Error('Not found');

  return {
    pe: parseMaybeNumber(j.PERatio),
    marketCap: parseMaybeNumber(j.MarketCapitalization),
    revenueTTM: parseMaybeNumber(j.RevenueTTM),
    currency: j.Currency ? String(j.Currency) : undefined,
    source: 'alphavantage',
  };
}

async function main() {
  // Allow `.env.local` without extra dependencies.
  const envLocal = readEnvFromDotenvLike(join(__dirname, '../.env.local'));
  const provider = (process.env.FUNDAMENTALS_PROVIDER ?? envLocal.FUNDAMENTALS_PROVIDER ?? 'alphavantage')
    .trim()
    .toLowerCase();
  const fmpKey = process.env.FMP_API_KEY ?? envLocal.FMP_API_KEY ?? '';
  const avKey = process.env.ALPHAVANTAGE_API_KEY ?? envLocal.ALPHAVANTAGE_API_KEY ?? '';
  mkdirSync(dataDir, { recursive: true });

  const activeKey = provider === 'financialmodelingprep' ? fmpKey : avKey;

  if (!activeKey) {
    writeFileSync(
      outPath,
      JSON.stringify(
        {
          asOf: new Date().toISOString(),
          source: provider,
          note:
            provider === 'financialmodelingprep'
              ? 'No FMP_API_KEY set; fundamentals not fetched.'
              : 'No ALPHAVANTAGE_API_KEY set; fundamentals not fetched.',
          byTicker: {},
        },
        null,
        2
      )
    );
    console.log(`Wrote empty fundamentals to ${outPath}`);
    return;
  }

  const nodes = JSON.parse(readFileSync(nodesPath, 'utf8'));
  const companies = nodes.filter((n) => n.nodeType === 'company' && !isIllustrative(n));
  const tickers = [...new Set(companies.map((n) => normalizeTicker(n.ticker)).filter(Boolean))];

  console.log(`Fetching fundamentals for ${tickers.length} tickers...`);

  const byTicker = {};
  let ok = 0;
  let fail = 0;

  // Keep this conservative to avoid rate limits.
  for (const ticker of tickers) {
    try {
      const f =
        provider === 'financialmodelingprep'
          ? await fetchFmpFundamentals(ticker, activeKey)
          : await fetchAlphaVantageFundamentals(ticker, activeKey);
      byTicker[ticker] = { ...f };
      ok++;
    } catch (e) {
      // Don't persist sensitive URLs/API keys.
      const msg = String(e?.message ?? e);
      byTicker[ticker] = { error: msg.replace(/apikey=[^&\s]+/gi, 'apikey=REDACTED') };
      fail++;
      // Back off a bit on errors.
      await sleep(provider === 'alphavantage' ? 1500 : 250);
    }
    // Gentle pacing.
    // Alpha Vantage free plan is ~5 requests/minute; enforce ~13s/ticker.
    await sleep(provider === 'alphavantage' ? 13_000 : 120);
  }

  const payload = {
    asOf: new Date().toISOString(),
    source: provider,
    ok,
    fail,
    byTicker,
  };

  writeFileSync(outPath, JSON.stringify(payload, null, 2));
  console.log(`Wrote fundamentals to ${outPath} (ok=${ok}, fail=${fail})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

