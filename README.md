# Copper to Cognition

<img width="1470" height="831" alt="Screenshot 2026-05-30 at 13 18 16" src="https://github.com/user-attachments/assets/d0f24de4-11ca-4ae0-bc3d-589a62ffeb2f" />
<img width="1470" height="830" alt="Screenshot 2026-05-30 at 13 17 48" src="https://github.com/user-attachments/assets/c93ca042-d73f-4536-8221-187bfd8c3e04" />

**An interactive map of the AI infrastructure value chain** — from raw materials and grid power through semiconductors, hyperscale cloud, model labs, and monetization. The product is **exploration and sense-making**, not a finished research report.

Think Obsidian-meets-capital-markets: a **graph-first** canvas where you pan, filter, trace dependencies, and inspect companies — plus a **3D globe** for geographic footprint. The numbers and topology are **curated scaffolding** meant to be swapped for your own data later.

---

## What this is (and is not)

| This project **is** | This project **is not** |
|---------------------|-------------------------|
| A **smart visualization** prototype for how an AI value-chain atlas could feel | A peer-reviewed or investable research product |
| A **hypothesis layout** of 17 industry clusters and ~105 public (plus a few private) names | A complete or authoritative supply-chain model |
| A UI for **navigating** cluster links, company placement, scores, and HQ geography | Trading advice, valuation, or forecast output |
| Bundled JSON + optional scripts to refresh market fields from **Yahoo Finance (`yfinance`)** | Audited fundamentals, SEC point-in-time data, or proprietary warehouse feeds |

**Use it to explore structure and tell a story.** Do not treat bar charts, edge strengths, or percentile scores as ground truth without your own validation.

---

## Views

### Graph (default)

- **17 industry cluster** regions (dashed boxes) laid out along a value-chain order.
- **~105 company** nodes grouped inside one primary cluster each.
- **32 directed cluster → cluster edges** only (companies do not link to each other in v1).
- **Inspector**: scores, fundamentals (when available), upstream/downstream cluster lists, **value-chain trace** (multi-hop highlight on the cluster graph).
- **Filters**: cluster chips, edge-type toggles, search.

### Globe

- Same companies plotted by **HQ location** (country + **US states** as separate polygons).
- Click a **country or state** to filter markers; click a **company** to open the inspector.
- Coordinates come from `yfinance` when available, otherwise **city / state / country centroids** with small per-ticker jitter so markers do not stack.

Switch views with **Graph | Globe** in the top bar.

---

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

```bash
npm run build     # production build
npm run preview   # preview production build
```

### Optional: refresh bundled data

```bash
# Regenerate nodes, edges, clusters from the generator script
npm run data:generate

# HQ coordinates for the globe (~105 tickers, uses yfinance + fallbacks)
npm run data:locations

# P/E, revenue TTM, market cap (yfinance) → fundamentals.json
npm run data:fundamentals

# Research-style percentile scores (yfinance + graph centrality) → node_scores.json
npm run data:research-scores

# All of the above in one pass
npm run data:refresh
```

Python deps (for location / fundamentals / scores scripts):

```bash
python3 -m pip install -r requirements.txt
```

---

## Conceptual model

```
[Company nodes]  —belong to→  [Cluster node]
                                    ↓
                         [Cluster → Cluster edges]
```

- **Clusters** = segments of the AI buildout story (e.g. `memory_storage`, `hyperscaler_cloud`).
- **Companies** = visual anchors; dependency logic lives at **cluster** level.
- **Edges** = typed, directed links between clusters (`physical_dependency`, `bottleneck_constraint`, `commercial_flow`, etc.).
- **Scores** (0–100 bars in the inspector) = comparative hints for coloring and comparison — see [Placeholder vs computed](#placeholder-vs-computed) below.

Detailed topology, company lists, and edge inventory: [`docs/graph-structure.md`](docs/graph-structure.md).

Score formulas (when you run the research pipeline): [`docs/score-methodology.md`](docs/score-methodology.md).

---

## Methodology (high level)

### 1. Topology — editorial, not econometric

Cluster definitions, company membership, and the **32 backbone edges** are **hand-authored** in `scripts/generate-company-data.mjs`. They reflect a readable value-chain narrative (with starter citation URLs on edges — BVP atlas, OECD, McKinsey — not per-link primary research).

- Edge **strength** (0–1) and **lag** strings are **fixed template values**, not estimated from shipments, revenue flows, or input-output tables.
- Some directions are **debateable by design** (e.g. fab ↔ equipment loop, cooling → accelerators skipping DC infra). The graph is a **conversation starter**.
- Companies with **dual economic roles** (e.g. hyperscaler + ads) are assigned to **one** primary cluster; optional `roles[]` metadata does not create extra edges.

### 2. Scores — three tiers

| Tier | When | Meaning |
|------|------|---------|
| **A. Research pipeline** | After `npm run data:research-scores` and `node_scores.json` is merged | Percentile ranks within ~99 **listed** tickers from `yfinance` ratios + NetworkX **centrality on the cluster graph** (see methodology doc) |
| **B. Cluster baselines + jitter** | Default if `node_scores.json` missing for a node | Hand-set cluster priors ± random jitter on each `data:generate` |
| **C. Scenario overrides** | In `scenarios.json` | Thematic **score bumps** on selected clusters (no edge add/remove) — data exists; not all scenario UI may be exposed |

**Important:** Even tier A is **relative ranking within a small universe**, not industry truth. **Substitutability** means *replaceability / commodity pressure*, not ESG sustainability. **Centrality** is **graph topology**, not empirical supply-chain concentration.

### 3. Fundamentals — market snapshots

`fundamentals.json` (optional) supplies P/E, revenue TTM, market cap from `yfinance`. Patchy for ADRs, private names, and stale fields. Shown in the inspector when present; cluster aggregates are simple averages in `clusters.json`.

### 4. Geography — approximate HQ

`company_locations.json` from `data:locations`:

1. `yfinance` HQ lat/lng when returned (often **missing**).
2. Else known **city** lookup table.
3. Else **US state** or **country** centroid + deterministic jitter.

Globe placement is for **visualization**, not facility-level capex maps.

### 5. Value-chain trace — graph math only

Selecting a cluster and tracing upstream/downstream runs **DFS on cluster edges** with hop limits. It highlights **model paths**, not verified bill-of-materials or contractual flows.

---

## Placeholder vs computed

Use this table before citing any number in a deck or memo.

| Data | Status | Notes |
|------|--------|--------|
| **Cluster labels & descriptions** | Curated placeholder | Editorial copy; refine in generator `CLUSTERS` |
| **Company ↔ cluster assignment** | Curated placeholder | Manual lists in `COMPANIES_BY_CLUSTER`; dedup keeps first cluster in order |
| **Private / illustrative tickers** (`OPENAI`, `ANTHROPIC`, `MISTRAL`, `XAI`, `COHERE`, `CONE`, …) | Placeholder | Tagged `illustrative`; excluded from financial score percentiles; HQ often **manual** |
| **32 cluster edges** | Curated placeholder | No random edge generator in current script; strengths are **not calibrated** to data |
| **Edge `evidence` URLs** | Starter references only | Generic industry reports, not edge-specific diligence |
| **Node scores (default)** | Placeholder | `CLUSTER_SCORE_BASELINES` + ±6 **random jitter** on each generate |
| **Node scores (with `node_scores.json`)** | Computed (limited) | yfinance percentiles + graph centrality; see limitations in methodology doc |
| **Inspector score bars** | Display only | Same scores; no statistical confidence or time series in UI |
| **`metricsByYear` on nodes** | Mostly unused | Schema supports year patches; UI uses fixed year **2026** internally |
| **Scenarios** | Placeholder shocks | Score overrides only; do not rewire the graph |
| **Fundamentals** | Optional computed | yfinance TTM; can be missing or wrong for many tickers |
| **Company logos** | Best-effort | Probed CDN URLs; many nodes have no logo |
| **Globe coordinates** | Approximate | Centroid fallbacks common; not datacenter/building locations |
| **Chain trace paths** | Derived from placeholder graph | Shortest/multi-hop on **cluster** edges only |
| **Concentration / exposure views** | Heuristic | e.g. concentration uses substitutability + centrality formula in code — not HHI or revenue share |

**Rule of thumb:** If you did not run `data:research-scores` and commit `node_scores.json`, treat all six score dimensions as **illustrative**. If you did run it, treat them as **informative but still not investment research**.

---

## Data files (bundled at build time)

| File | Contents |
|------|----------|
| [`src/data/nodes.json`](src/data/nodes.json) | Cluster + company nodes, scores, optional fundamentals |
| [`src/data/edges.json`](src/data/edges.json) | 32 cluster → cluster edges |
| [`src/data/clusters.json`](src/data/clusters.json) | Cluster metadata, optional aggregate fundamentals |
| [`src/data/scenarios.json`](src/data/scenarios.json) | Scenario score presets |
| [`src/data/curatedPaths.json`](src/data/curatedPaths.json) | Example cluster paths for exploration |
| [`src/data/fundamentals.json`](src/data/fundamentals.json) | Optional yfinance fundamentals by ticker |
| [`src/data/node_scores.json`](src/data/node_scores.json) | Optional research pipeline scores by node id |
| [`src/data/company_metrics.json`](src/data/company_metrics.json) | Raw metrics audit trail for scores |
| [`src/data/company_locations.json`](src/data/company_locations.json) | HQ fields + lat/lng for globe |

Loaded via [`src/store/graphData.ts`](src/store/graphData.ts) — no runtime API in v1.

---

## Architecture

```
src/data/*.json  →  graphData.ts
        ↓
scoring + graphTransform  →  Cytoscape elements / globe points
        ↓
GraphCanvas | GlobeView  +  Zustand (filters, selection, URL)
        ↓
TopBar / SidebarFilters / InspectorPanel
```

| Layer | Role |
|-------|------|
| [`src/types/graph.ts`](src/types/graph.ts) | Nodes, edges, clusters, scores |
| [`src/lib/graphTransform.ts`](src/lib/graphTransform.ts) | Filters, Cytoscape payload, colors |
| [`src/lib/graphStyles.ts`](src/lib/graphStyles.ts) | Cytoscape stylesheet |
| [`src/lib/chainTrace.ts`](src/lib/chainTrace.ts) | Upstream/downstream trace on cluster graph |
| [`src/lib/globeGeo.ts`](src/lib/globeGeo.ts) | World + US state polygons, map points |
| [`src/store/appStore.ts`](src/store/appStore.ts) | UI state, URL sync |
| [`src/data/adapters/`](src/data/adapters/) | `GraphDataSource` interface for future API/Neo4j |

To plug in a backend later, implement `GraphDataSource` and inject it where the local JSON adapter is used (`useGraphData.ts`). Graph and globe layers can stay unchanged.

---

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `/` | Focus search |
| `Esc` | Clear selection (and chain trace when applicable) |
| `f` | Focus selected node (graph view) |
| `r` | Reset graph layout (graph view) |

---

## URL parameters

Synced to app state (shareable links):

| Param | Example | Meaning |
|-------|---------|---------|
| `view` | `globe` | Active tab: `graph` (default) or `globe` |
| `node` | `nvda,amd` | Selected node id(s) |
| `country` | `US` | Globe country filter (ISO-2) |
| `state` | `CA` | Globe US state filter |
| `theme` | `light` | `dark` (default) or `light` |

Example: `?view=globe&country=US&state=CA&node=nvda`

---

## How to improve the model (after your own research)

| Goal | Where to edit |
|------|----------------|
| Clusters, copy, order | `CLUSTERS` in `scripts/generate-company-data.mjs` |
| Company membership | `COMPANIES_BY_CLUSTER` in same file |
| Backbone edges | `clusterEdgeTemplates` in same file |
| Pin scores to research pipeline | Run `npm run data:research-scores`, commit `node_scores.json` |
| HQ map | Run `npm run data:locations` |
| Regenerate all JSON | `npm run data:generate` |

Hand-editing `src/data/*.json` works but is overwritten on regenerate unless you change the script.

---

## Roadmap (ideas, not commitments)

- Company-level or multi-cluster membership edges
- Evidence per edge (filings, dates) and calibrated strengths
- Live data adapters (Neo4j, warehouse, FMP/SEC)
- Scenario shocks that alter topology, not only scores
- Globe: datacenter / fab site layers vs HQ-only today

---

## License

MIT
