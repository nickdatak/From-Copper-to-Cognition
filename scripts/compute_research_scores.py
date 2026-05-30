#!/usr/bin/env python3
"""Compute 0–100 research scores from company_metrics.json + cluster graph."""

from __future__ import annotations

import math
import time
from collections import defaultdict
from typing import Any, Dict, List, Optional

import networkx as nx

from scorelib import (
    DATA_DIR,
    clamp_score,
    is_illustrative,
    load_json,
    market_cap_weighted_mean,
    mean_available,
    percentile_scores,
    write_json,
)

METRICS_PATH = DATA_DIR / "company_metrics.json"
NODES_PATH = DATA_DIR / "nodes.json"
EDGES_PATH = DATA_DIR / "edges.json"
OUT_PATH = DATA_DIR / "node_scores.json"

METHODOLOGY_VERSION = 1


def invert_pct(pct: Dict[str, float]) -> Dict[str, float]:
    return {k: 100.0 - v for k, v in pct.items()}


def build_cluster_graph(edges: List[Dict[str, Any]]) -> nx.DiGraph:
    g = nx.DiGraph()
    for e in edges:
        src, tgt = e["source"], e["target"]
        w = float(e.get("strength") or 1.0)
        if not g.has_edge(src, tgt):
            g.add_edge(src, tgt, weight=w)
        else:
            g[src][tgt]["weight"] = max(g[src][tgt]["weight"], w)
    return g


def cluster_centrality_scores(edges: List[Dict[str, Any]]) -> Dict[str, float]:
    g = build_cluster_graph(edges)
    nodes = list(g.nodes())
    if len(nodes) < 2:
        return {n: 50.0 for n in nodes}

    in_strength = {n: 0.0 for n in nodes}
    out_strength = {n: 0.0 for n in nodes}
    for u, v, d in g.edges(data=True):
        w = float(d.get("weight", 1.0))
        out_strength[u] += w
        in_strength[v] += w

    try:
        between = nx.betweenness_centrality(g, weight="weight", normalized=True)
    except Exception:
        between = {n: 0.0 for n in nodes}

    pct_in = percentile_scores(in_strength, winsor=False)
    pct_out = percentile_scores(out_strength, winsor=False)
    pct_bt = percentile_scores(between, winsor=False)

    out: Dict[str, float] = {}
    for n in nodes:
        raw = 0.4 * pct_in.get(n, 50.0) + 0.3 * pct_out.get(n, 50.0) + 0.3 * pct_bt.get(n, 50.0)
        out[n] = clamp_score(raw) or 50.0
    return out


def main() -> int:
    metrics_doc = load_json(METRICS_PATH)
    nodes = load_json(NODES_PATH)
    edges = load_json(EDGES_PATH)

    by_ticker: Dict[str, Dict[str, Any]] = metrics_doc.get("byTicker") or {}
    companies = [n for n in nodes if n.get("nodeType") == "company" and not is_illustrative(n)]

    # ticker -> node id (first wins)
    ticker_to_id: Dict[str, str] = {}
    for n in companies:
        t = str(n.get("ticker", "")).strip().upper()
        if t:
            ticker_to_id.setdefault(t, n["id"])

    # Raw vectors for percentiles (keyed by ticker)
    gross: Dict[str, Optional[float]] = {}
    op: Dict[str, Optional[float]] = {}
    roe: Dict[str, Optional[float]] = {}
    beta: Dict[str, Optional[float]] = {}
    capex_rev: Dict[str, Optional[float]] = {}
    ppe_rev: Dict[str, Optional[float]] = {}
    inv_turn: Dict[str, Optional[float]] = {}
    ebitda_m: Dict[str, Optional[float]] = {}
    log_rev: Dict[str, Optional[float]] = {}
    log_mcap: Dict[str, Optional[float]] = {}

    for t, row in by_ticker.items():
        if row.get("error"):
            continue
        gross[t] = row.get("grossMargin")
        op[t] = row.get("operatingMargin")
        roe[t] = row.get("returnOnEquity")
        beta[t] = row.get("beta")
        capex_rev[t] = row.get("capexToRevenue")
        ppe_rev[t] = row.get("ppeToRevenue")
        at = row.get("assetTurnover")
        inv_turn[t] = (1.0 / at) if at and at > 0 else None
        ebitda_m[t] = row.get("ebitdaMargin")
        rev = row.get("revenue")
        mcap = row.get("marketCap")
        log_rev[t] = math.log(rev) if rev and rev > 0 else None
        log_mcap[t] = math.log(mcap) if mcap and mcap > 0 else None

    pct_gross = percentile_scores(gross)
    pct_op = percentile_scores(op)
    pct_roe = percentile_scores(roe)
    pct_beta = percentile_scores(beta)
    pct_capex = percentile_scores(capex_rev)
    pct_ppe = percentile_scores(ppe_rev)
    pct_inv_turn = percentile_scores(inv_turn)
    pct_ebitda = percentile_scores(ebitda_m)
    pct_log_rev = percentile_scores(log_rev)
    pct_log_mcap = percentile_scores(log_mcap)

    pct_low_gross = invert_pct(pct_gross)
    pct_low_roe = invert_pct(pct_roe)

    cluster_central = cluster_centrality_scores(edges)

    by_node_id: Dict[str, Dict[str, Any]] = {}

    # Company scores
    for n in companies:
        t = str(n.get("ticker", "")).strip().upper()
        if not t or t not in by_ticker or by_ticker[t].get("error"):
            continue
        cid = n.get("clusterId")
        scores = {
            "pricingPowerScore": clamp_score(
                mean_available(pct_gross.get(t), pct_op.get(t), pct_roe.get(t))
            ),
            "capitalIntensityScore": clamp_score(
                mean_available(pct_capex.get(t), pct_ppe.get(t), pct_inv_turn.get(t))
            ),
            "substitutabilityScore": clamp_score(
                mean_available(pct_beta.get(t), pct_low_gross.get(t), pct_low_roe.get(t))
            ),
            "valueCaptureScore": clamp_score(
                mean_available(pct_op.get(t), pct_roe.get(t), pct_ebitda.get(t))
            ),
            "importanceScore": clamp_score(
                mean_available(pct_log_rev.get(t), pct_log_mcap.get(t))
            ),
            "centralityScore": clamp_score(cluster_central.get(cid)) if cid else None,
        }
        by_node_id[n["id"]] = {k: v for k, v in scores.items() if v is not None}

    # Cluster aggregates (cap-weighted companies)
    cluster_companies: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for n in companies:
        cluster_companies[n["clusterId"]].append(n)

    cluster_nodes = [n for n in nodes if n.get("isCluster") or n.get("nodeType") == "cluster"]
    score_keys = [
        "pricingPowerScore",
        "capitalIntensityScore",
        "substitutabilityScore",
        "valueCaptureScore",
        "importanceScore",
        "centralityScore",
    ]

    for cn in cluster_nodes:
        cid = cn["id"]
        members = cluster_companies.get(cid, [])
        weights_scores: Dict[str, List[tuple[float, float]]] = {k: [] for k in score_keys}

        for m in members:
            nid = m["id"]
            if nid not in by_node_id:
                continue
            t = str(m.get("ticker", "")).strip().upper()
            mrow = by_ticker.get(t) or {}
            w = mrow.get("marketCap") or mrow.get("revenue") or 0
            w = float(w) if w else 0
            for k in score_keys:
                v = by_node_id[nid].get(k)
                if v is not None:
                    weights_scores[k].append((w, float(v)))

        agg: Dict[str, float] = {}
        for k in score_keys:
            v = market_cap_weighted_mean(weights_scores[k])
            if v is not None:
                agg[k] = clamp_score(v)

        if cid in cluster_central:
            agg["centralityScore"] = clamp_score(cluster_central[cid])

        if agg:
            by_node_id[cid] = agg

    write_json(
        OUT_PATH,
        {
            "asOf": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "methodologyVersion": METHODOLOGY_VERSION,
            "source": "yfinance+graph",
            "methodologyDoc": "docs/score-methodology.md",
            "byNodeId": by_node_id,
        },
    )

    print(f"Wrote {OUT_PATH} ({len(by_node_id)} nodes with scores)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
