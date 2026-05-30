#!/usr/bin/env python3

import json
import os
import time
import contextlib
import io
from pathlib import Path
from typing import Any, Dict, Optional

import yfinance as yf


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "src" / "data"
NODES_PATH = DATA_DIR / "nodes.json"
OUT_PATH = DATA_DIR / "fundamentals.json"


def is_illustrative(node: Dict[str, Any]) -> bool:
    return "illustrative" in (node.get("tags") or [])


def normalize_ticker(t: Any) -> str:
    return str(t or "").strip().upper()


def safe_float(v: Any) -> Optional[float]:
    try:
        if v is None:
            return None
        if isinstance(v, str) and v.strip() in ("", "None", "null", "NaN"):
            return None
        n = float(v)
        if n != n:  # NaN
            return None
        return n
    except Exception:
        return None


def pick_first_number(obj: Dict[str, Any], keys: list[str]) -> Optional[float]:
    for k in keys:
        if k in obj:
            n = safe_float(obj.get(k))
            if n is not None:
                return n
    return None


def fetch_one(ticker: str) -> Dict[str, Any]:
    # yfinance uses Yahoo endpoints; some symbols may require exchange suffixes.
    t = yf.Ticker(ticker)

    info: Dict[str, Any] = {}
    try:
        # `fast_info` is cheaper but not always present.
        # We'll use `info` for fundamentals.
        # yfinance/yahoo occasionally prints noisy "HTTP Error 404" lines to stderr
        # even when it returns usable partial data. Silence that noise.
        with contextlib.redirect_stderr(io.StringIO()):
            info = t.info or {}
    except Exception as e:
        return {"error": f"yfinance info error: {e}"}

    # Revenue: prefer trailing 12 months when available.
    revenue_ttm = pick_first_number(
        info,
        keys=[
            "totalRevenue",  # often TTM-ish
            "revenue",  # sometimes present
            "revenueTTM",  # sometimes present
        ],
    )

    pe = pick_first_number(
        info,
        keys=[
            "trailingPE",
            "forwardPE",
            "pegRatio",  # fallback (not P/E, but keeps something non-null if needed)
        ],
    )

    market_cap = pick_first_number(
        info,
        keys=[
            "marketCap",
        ],
    )

    currency = info.get("currency")
    if currency is not None:
        currency = str(currency)

    return {
        "pe": pe,
        "revenueTTM": revenue_ttm,
        "marketCap": market_cap,
        "currency": currency,
        "source": "yfinance",
    }


def main() -> int:
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    nodes = json.loads(NODES_PATH.read_text("utf-8"))
    companies = [n for n in nodes if n.get("nodeType") == "company" and not is_illustrative(n)]
    tickers = sorted({normalize_ticker(n.get("ticker")) for n in companies if normalize_ticker(n.get("ticker"))})

    # Allow limiting for debugging: LIMIT=10 python scripts/fetch_fundamentals_yfinance.py
    limit_raw = os.environ.get("LIMIT", "").strip()
    if limit_raw:
        try:
            limit = int(limit_raw)
            tickers = tickers[: max(0, limit)]
        except Exception:
            pass

    print(f"Fetching fundamentals for {len(tickers)} tickers via yfinance…")

    by_ticker: Dict[str, Any] = {}
    ok = 0
    fail = 0

    # Gentle pacing to reduce Yahoo throttling.
    delay_s = float(os.environ.get("DELAY_S", "0.25"))

    for ticker in tickers:
        try:
            res = fetch_one(ticker)
            by_ticker[ticker] = res
            if "error" in res:
                fail += 1
            else:
                ok += 1
        except Exception as e:
            by_ticker[ticker] = {"error": str(e)}
            fail += 1
        time.sleep(delay_s)

    payload = {
        "asOf": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "source": "yfinance",
        "ok": ok,
        "fail": fail,
        "byTicker": by_ticker,
    }

    OUT_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote fundamentals to {OUT_PATH} (ok={ok}, fail={fail})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

