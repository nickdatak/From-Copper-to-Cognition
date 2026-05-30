# Research-grade node scores — methodology

This document defines how to replace illustrative cluster baselines + jitter with **computable scores** (0–100) backed by public market data and the cluster graph.

**Pipeline**

```text
fetch_company_metrics.py  →  src/data/company_metrics.json   (raw inputs)
compute_research_scores.py →  src/data/node_scores.json         (0–100 scores)
generate-company-data.mjs  →  src/data/nodes.json               (merged into app)
```

Run:

```bash
python3 -m pip install -r requirements.txt
npm run data:research-scores
```

---

## 1. Score definitions

All scores are **percentile ranks (0–100)** within the **listed-company universe** (illustrative/private tickers excluded), unless noted. Higher = more of that trait.

| Score | Question it approximates | Higher means |
|-------|--------------------------|--------------|
| **Pricing power** | Can the business sustain margins / pricing? | Stronger margins and returns |
| **Capital intensity** | How asset- and capex-heavy is the model? | More capex and fixed assets per dollar of revenue |
| **Substitutability** | How easy is it to switch suppliers? (commodity risk) | *Easier* to replace (lower moat) — **not ESG sustainability** |
| **Value capture** | Who keeps operating economics? | Higher operating returns and margin quality |
| **Importance** | Scale and relevance in the investable set | Larger revenue and market cap |
| **Centrality** | Structural position in the **cluster graph** | More exposed on critical paths between clusters |

### 1.1 Pricing power

**Intent:** Margin and return profile vs peers (pricing / mix / cost advantage proxy).

**Inputs (yfinance `info`, annual statements fallback):**

| Field | Source |
|-------|--------|
| Gross margin | `grossMargins` or `Gross Profit / Total Revenue` |
| Operating margin | `operatingMargins` or `Operating Income / Total Revenue` |
| Return on equity | `returnOnEquity` |

**Formula**

```text
pricing_power = mean( pct(gross_margin), pct(operating_margin), pct(ROE) )
```

Winsorize each input at 1st/99th percentile before ranking to limit outliers.

### 1.2 Capital intensity

**Intent:** Capex and asset base required per unit of revenue.

**Inputs:**

| Field | Source |
|-------|--------|
| Capex / revenue | `abs(Capital Expenditure) / Total Revenue` (cash flow, latest FY) |
| PP&E / revenue | `Property Plant Equipment / Total Revenue` (balance sheet) |
| Asset turnover (inverse) | `Total Revenue / Total Assets` → use `pct(1 / asset_turnover)` |

**Formula**

```text
capital_intensity = mean( pct(capex_to_revenue), pct(ppe_to_revenue), pct(1/asset_turnover) )
```

### 1.3 Substitutability (replaceability)

**Intent:** Commodity / competitive pressure proxy — **inverse of moat**, not environmental sustainability.

**Inputs:**

| Field | Source |
|-------|--------|
| Beta | `beta` (higher → more market-like / replaceable) |
| Low gross margin | `100 - pct(gross_margin)` |
| Low ROIC proxy | `100 - pct(ROE)` (until we add proper ROIC from statements) |

**Formula**

```text
substitutability = mean( pct(beta), 100 - pct(gross_margin), 100 - pct(ROE) )
```

### 1.4 Value capture

**Intent:** Operating economics retained by the firm.

**Inputs:**

| Field | Source |
|-------|--------|
| Operating margin | same as pricing power |
| ROE | same as pricing power |
| EBITDA margin | `ebitda / revenue` from info or statements |

**Formula**

```text
value_capture = mean( pct(operating_margin), pct(ROE), pct(ebitda_margin) )
```

### 1.5 Importance (company scale)

**Intent:** How large the name is in the public-company universe (not AI exposure yet — see §4).

**Inputs:**

| Field | Source |
|-------|--------|
| Revenue | `totalRevenue` |
| Market cap | `marketCap` |

**Formula**

```text
importance = mean( pct(log(revenue)), pct(log(market_cap)) )
```

### 1.6 Centrality (graph-derived)

**Intent:** Position in the **directed cluster backbone** (`src/data/edges.json`).

**Method**

1. Build directed graph `G` on 17 cluster IDs; edge weight = `strength` (0–1).
2. Compute per cluster:
   - **In-strength:** sum of incoming edge weights
   - **Out-strength:** sum of outgoing edge weights
   - **Betweenness** (normalized): NetworkX `betweenness_centrality(G, weight="weight")`
3. Combine:

```text
centrality_raw = 0.4 * pct(in_strength) + 0.3 * pct(out_strength) + 0.3 * pct(betweenness)
```

Assign cluster `centralityScore = centrality_raw`. Companies inherit their **primary cluster’s** centrality (optional: average with `roles[]` clusters later).

---

## 2. Company vs cluster scores

| Layer | How scores are produced |
|-------|-------------------------|
| **Company** | Percentiles from yfinance metrics for that ticker |
| **Cluster** | Market-cap-weighted mean of company scores in the cluster (listed names only). If no listed names, use graph-only centrality + leave financial scores empty / fall back to legacy baseline |

---

## 3. Data sources

### Tier 1 — implemented now (free, scriptable)

| Provider | What we pull | Used for |
|----------|----------------|----------|
| **Yahoo Finance via `yfinance`** | Margins, ROE, beta, revenue, market cap, capex, PP&E | Pricing power, capital intensity, substitutability, value capture, importance |

**Pros:** No API key, same stack as logos/fundamentals.  
**Cons:** ADR/foreign tickers patchy; ratios can be missing; not point-in-time SEC-audited.

### Tier 2 — recommended upgrades

| Provider | What to add | Why |
|----------|-------------|-----|
| **SEC EDGAR / `sec-edgar-downloader`** | 10-K/10-Q XBRL: revenue, capex, PP&E, R&D | Audited, US names |
| **Financial Modeling Prep** (paid tiers) | Key metrics TTM, ratios bulk | Cleaner ratios if legacy endpoints available on your plan |
| **Refinitiv / FactSet / Bloomberg** | Institutional-grade | Production research |

### Tier 3 — “AI exposure” overlay (future)

Not in v1. Could blend:

- % revenue from data center / AI keywords (10-K NLP)
- CapEx guides mentioning AI
- Segment revenue (cloud, datacenter, etc.)

into a separate `aiExposureScore` without polluting pure financial ratios.

---

## 4. Normalization rules

1. **Universe:** All companies in `nodes.json` with `nodeType === "company"` and not tagged `illustrative`.
2. **Percentile:** `pct(x) = 100 * rank(x) / (n - 1)` with `scipy.stats.rankdata` or equivalent.
3. **Winsorize** each raw metric at 1%/99% before percentile (reduce NVDA-style outliers dominating).
4. **Missing data:** If &lt; 2 of 3 components exist for a composite, use mean of available; if none, omit score (generator may fall back to baseline for that field only).
5. **Clamp** final scores to `[0, 100]`.

---

## 5. Output files

### `src/data/company_metrics.json`

Raw pulled metrics per ticker (audit trail).

```json
{
  "asOf": "ISO-8601",
  "source": "yfinance",
  "byTicker": {
    "NVDA": {
      "grossMargin": 0.72,
      "operatingMargin": 0.55,
      "returnOnEquity": 1.2,
      "capexToRevenue": 0.08,
      ...
    }
  }
}
```

### `src/data/node_scores.json`

Final scores keyed by **node id** (company id + cluster id).

```json
{
  "asOf": "ISO-8601",
  "methodologyVersion": 1,
  "source": "yfinance+graph",
  "byNodeId": {
    "nvda": {
      "pricingPowerScore": 94,
      "capitalIntensityScore": 41,
      "substitutabilityScore": 12,
      "valueCaptureScore": 91,
      "importanceScore": 88,
      "centralityScore": 76
    },
    "semi_fabrication": { ... }
  }
}
```

---

## 6. Limitations (read before trading on this)

- Scores are **relative ranks** within ~99 listed names, not absolute industry truth.
- **Cluster assignment is manual** — a high-margin name in a “low margin” cluster still affects cluster aggregates.
- **Substitutability ≠ sustainability** (ESG).
- **Centrality** is model topology, not empirical supply-chain concentration.
- Re-run scripts when you want fresh market data; commit JSON if you want stable UI.

---

## 7. Changelog

| Version | Change |
|--------:|--------|
| 1 | Initial yfinance percentiles + NetworkX cluster centrality |
