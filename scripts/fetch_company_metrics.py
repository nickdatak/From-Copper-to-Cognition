#!/usr/bin/env python3
"""Pull raw financial metrics per ticker (yfinance) for research-grade scores."""

from __future__ import annotations

import contextlib
import io
import os
import time
from typing import Any, Dict, Optional

import yfinance as yf

from scorelib import DATA_DIR, NODES_PATH, is_illustrative, load_json, safe_float, write_json

OUT_PATH = DATA_DIR / "company_metrics.json"


def latest_row_value(df, row_names: list[str]) -> Optional[float]:
    if df is None or df.empty:
        return None
    for name in row_names:
        if name in df.index:
            col = df.columns[0]
            return safe_float(df.loc[name, col])
    return None


def fetch_metrics(ticker: str) -> Dict[str, Any]:
    t = yf.Ticker(ticker)
    info: Dict[str, Any] = {}
    with contextlib.redirect_stderr(io.StringIO()):
        try:
            info = t.info or {}
        except Exception as e:
            return {"error": f"info: {e}"}

    revenue = safe_float(info.get("totalRevenue"))
    market_cap = safe_float(info.get("marketCap"))

    gross_margin = safe_float(info.get("grossMargins"))
    operating_margin = safe_float(info.get("operatingMargins"))
    roe = safe_float(info.get("returnOnEquity"))
    beta = safe_float(info.get("beta"))
    ebitda = safe_float(info.get("ebitda"))

    total_assets = safe_float(info.get("totalAssets"))

    capex_to_revenue: Optional[float] = None
    ppe_to_revenue: Optional[float] = None

    with contextlib.redirect_stderr(io.StringIO()):
        try:
            cf = t.cashflow
            bs = t.balance_sheet
            inc = t.financials

            if revenue is None:
                revenue = latest_row_value(inc, ["Total Revenue", "Total Revenue"])

            capex = latest_row_value(cf, ["Capital Expenditure", "Capital Expenditures"])
            if capex is not None and revenue and revenue > 0:
                capex_to_revenue = abs(capex) / revenue

            ppe = latest_row_value(
                bs,
                [
                    "Property Plant Equipment",
                    "Net PPE",
                    "Property Plant And Equipment Net",
                ],
            )
            if ppe is not None and revenue and revenue > 0:
                ppe_to_revenue = ppe / revenue

            if gross_margin is None and inc is not None:
                gp = latest_row_value(inc, ["Gross Profit"])
                rev = latest_row_value(inc, ["Total Revenue"])
                if gp is not None and rev and rev > 0:
                    gross_margin = gp / rev

            if operating_margin is None and inc is not None:
                op = latest_row_value(inc, ["Operating Income"])
                rev = latest_row_value(inc, ["Total Revenue"])
                if op is not None and rev and rev > 0:
                    operating_margin = op / rev

        except Exception:
            pass

    asset_turnover: Optional[float] = None
    if revenue and total_assets and total_assets > 0:
        asset_turnover = revenue / total_assets

    ebitda_margin: Optional[float] = None
    if ebitda is not None and revenue and revenue > 0:
        ebitda_margin = ebitda / revenue

    return {
        "ticker": ticker,
        "currency": info.get("currency"),
        "revenue": revenue,
        "marketCap": market_cap,
        "grossMargin": gross_margin,
        "operatingMargin": operating_margin,
        "returnOnEquity": roe,
        "beta": beta,
        "ebitdaMargin": ebitda_margin,
        "capexToRevenue": capex_to_revenue,
        "ppeToRevenue": ppe_to_revenue,
        "assetTurnover": asset_turnover,
        "source": "yfinance",
    }


def main() -> int:
    nodes = load_json(NODES_PATH)
    companies = [n for n in nodes if n.get("nodeType") == "company" and not is_illustrative(n)]
    tickers = sorted({str(n.get("ticker", "")).strip().upper() for n in companies if n.get("ticker")})

    limit = os.environ.get("LIMIT", "").strip()
    if limit:
        tickers = tickers[: max(0, int(limit))]

    delay = float(os.environ.get("DELAY_S", "0.25"))
    by_ticker: Dict[str, Any] = {}
    ok = fail = 0

    print(f"Fetching company metrics for {len(tickers)} tickers…")
    for ticker in tickers:
        try:
            row = fetch_metrics(ticker)
            by_ticker[ticker] = row
            if "error" in row:
                fail += 1
            else:
                ok += 1
        except Exception as e:
            by_ticker[ticker] = {"error": str(e)}
            fail += 1
        time.sleep(delay)

    write_json(
        OUT_PATH,
        {
            "asOf": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "source": "yfinance",
            "ok": ok,
            "fail": fail,
            "byTicker": by_ticker,
        },
    )
    print(f"Wrote {OUT_PATH} (ok={ok}, fail={fail})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
