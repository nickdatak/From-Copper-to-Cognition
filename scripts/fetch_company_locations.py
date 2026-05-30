#!/usr/bin/env python3
"""Fetch HQ country/state/coordinates per company ticker via yfinance."""

from __future__ import annotations

import contextlib
import hashlib
import io
import json
import os
import time
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import yfinance as yf

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "src" / "data"
NODES_PATH = DATA_DIR / "nodes.json"
OUT_PATH = DATA_DIR / "company_locations.json"

# Illustrative / private — approximate HQ for map placement
MANUAL: Dict[str, Dict[str, Any]] = {
    "OPENAI": {"city": "San Francisco", "usState": "CA", "country": "US", "countryName": "United States", "lat": 37.7749, "lng": -122.4194},
    "ANTHROPIC": {"city": "San Francisco", "usState": "CA", "country": "US", "countryName": "United States", "lat": 37.79, "lng": -122.4},
    "MISTRAL": {"city": "Paris", "country": "FR", "countryName": "France", "lat": 48.8566, "lng": 2.3522},
    "XAI": {"city": "Palo Alto", "usState": "CA", "country": "US", "countryName": "United States", "lat": 37.44, "lng": -122.14},
    "COHERE": {"city": "Toronto", "country": "CA", "countryName": "Canada", "lat": 43.6532, "lng": -79.3832},
    "CONE": {"city": "Dallas", "usState": "TX", "country": "US", "countryName": "United States", "lat": 32.7767, "lng": -96.797},
}

# Approximate centroids for fallback placement when yfinance omits lat/lng
US_STATE_CENTROIDS: Dict[str, Tuple[float, float]] = {
    "AL": (32.8, -86.8), "AK": (64.2, -153.5), "AZ": (34.3, -111.7), "AR": (34.8, -92.4),
    "CA": (36.8, -119.4), "CO": (39.0, -105.5), "CT": (41.6, -72.7), "DE": (39.0, -75.5),
    "FL": (28.6, -81.5), "GA": (32.7, -83.4), "HI": (20.8, -156.3), "ID": (44.2, -114.5),
    "IL": (40.0, -89.0), "IN": (39.8, -86.1), "IA": (42.0, -93.5), "KS": (38.5, -98.4),
    "KY": (37.8, -84.9), "LA": (31.0, -92.0), "ME": (45.3, -69.4), "MD": (39.0, -76.7),
    "MA": (42.4, -71.4), "MI": (43.3, -84.5), "MN": (46.3, -94.3), "MS": (32.7, -89.7),
    "MO": (38.5, -92.4), "MT": (47.0, -110.4), "NE": (41.5, -99.8), "NV": (39.3, -116.6),
    "NH": (43.2, -71.5), "NJ": (40.1, -74.7), "NM": (34.5, -106.0), "NY": (43.0, -75.5),
    "NC": (35.6, -79.8), "ND": (47.5, -100.5), "OH": (40.4, -82.8), "OK": (35.5, -97.5),
    "OR": (44.0, -120.5), "PA": (40.9, -77.8), "RI": (41.7, -71.5), "SC": (33.9, -80.9),
    "SD": (44.4, -100.2), "TN": (35.8, -86.3), "TX": (31.5, -99.3), "UT": (39.3, -111.7),
    "VT": (44.0, -72.7), "VA": (37.5, -78.7), "WA": (47.4, -120.5), "WV": (38.6, -80.6),
    "WI": (44.6, -89.8), "WY": (43.0, -107.5), "DC": (38.9, -77.0),
}

COUNTRY_CENTROIDS: Dict[str, Tuple[float, float]] = {
    "US": (39.8, -98.6), "CA": (56.1, -106.3), "GB": (55.4, -3.4), "DE": (51.2, 10.4),
    "FR": (46.2, 2.2), "NL": (52.1, 5.3), "CH": (46.8, 8.2), "IE": (53.4, -8.2),
    "IL": (31.0, 34.8), "JP": (36.2, 138.3), "KR": (36.5, 127.8), "TW": (23.7, 121.0),
    "CN": (35.9, 104.2), "SG": (1.35, 103.8), "AU": (-25.3, 133.8), "HK": (22.3, 114.2),
    "IN": (20.6, 78.9), "IT": (41.9, 12.6), "ES": (40.5, -3.7), "SE": (60.1, 18.6),
    "FI": (61.9, 25.7), "NO": (60.5, 8.5), "DK": (56.3, 9.5), "BE": (50.5, 4.5),
    "AT": (47.5, 14.5), "LU": (49.8, 6.1), "BR": (-14.2, -51.9), "MX": (23.6, -102.5),
}

# City, state (US) or city, country — HQ approximations
CITY_COORDS: Dict[Tuple[str, str], Tuple[float, float]] = {
    ("Santa Clara", "US"): (37.3541, -121.9552),
    ("San Jose", "US"): (37.3382, -121.8863),
    ("San Francisco", "US"): (37.7749, -122.4194),
    ("Palo Alto", "US"): (37.4419, -122.143),
    ("Redwood City", "US"): (37.4852, -122.2364),
    ("Mountain View", "US"): (37.3861, -122.0839),
    ("Fremont", "US"): (37.5485, -121.9886),
    ("Milpitas", "US"): (37.4323, -121.8996),
    ("Menlo Park", "US"): (37.453, -122.1817),
    ("Charlotte", "US"): (35.2271, -80.8431),
    ("Austin", "US"): (30.2672, -97.7431),
    ("Phoenix", "US"): (33.4484, -112.074),
    ("Tempe", "US"): (33.4255, -111.94),
    ("Boston", "US"): (42.3601, -71.0589),
    ("Cambridge", "US"): (42.3736, -71.1097),
    ("Seattle", "US"): (47.6062, -122.3321),
    ("Arlington", "US"): (38.8816, -77.091),
    ("Pittsburgh", "US"): (40.4406, -79.9959),
    ("Dallas", "US"): (32.7767, -96.797),
    ("Saint Louis", "US"): (38.627, -90.1994),
    ("Baltimore", "US"): (39.2904, -76.6122),
    ("Hanover", "US"): (39.1929, -76.7241),
    ("Saxonburg", "US"): (40.752, -79.8109),
    ("Wallingford", "US"): (41.457, -72.8232),
    ("Shelton", "US"): (41.3165, -73.0932),
    ("Portsmouth", "US"): (43.0718, -70.7626),
    ("Malta", "US"): (42.9712, -73.7929),
    ("Armonk", "US"): (41.1265, -73.714),
    ("New York", "US"): (40.7128, -74.006),
    ("Toronto", "CA"): (43.6532, -79.3832),
    ("London", "GB"): (51.5074, -0.1278),
    ("Cambridge", "GB"): (52.2053, 0.1218),
    ("Dublin", "IE"): (53.3498, -6.2603),
    ("Paris", "FR"): (48.8566, 2.3522),
    ("Veldhoven", "NL"): (51.4181, 5.4075),
    ("Hsinchu City", "TW"): (24.8138, 120.9675),
    ("Kaohsiung", "TW"): (22.6273, 120.3014),
    ("Icheon-si", "KR"): (37.272, 127.435),
    ("Melbourne", "AU"): (-37.8136, 144.9631),
    ("Migdal Haemek", "IL"): (32.676, 35.239),
    ("Causeway Bay", "HK"): (22.2809, 114.1849),
}


def ticker_jitter(ticker: str) -> Tuple[float, float]:
    """Spread markers that share the same fallback centroid."""
    digest = hashlib.md5(ticker.encode()).hexdigest()
    a = int(digest[:8], 16) / 0xFFFFFFFF - 0.5
    b = int(digest[8:16], 16) / 0xFFFFFFFF - 0.5
    return a * 0.55, b * 0.55


def resolve_coordinates(
    ticker: str,
    country: str,
    us_state: Optional[str],
    city: Optional[str],
) -> Tuple[float, float, str]:
    """Return lat, lng, placement source."""
    city_key_us = (str(city or "").strip(), country) if city and country == "US" else None
    city_key = (str(city or "").strip(), country) if city else None
    for key in (city_key_us, city_key):
        if key and key in CITY_COORDS:
            lat, lng = CITY_COORDS[key]
            jlat, jlng = ticker_jitter(ticker)
            return lat + jlat * 0.08, lng + jlng * 0.08, "city"

    if country == "US" and us_state and us_state in US_STATE_CENTROIDS:
        lat, lng = US_STATE_CENTROIDS[us_state]
        jlat, jlng = ticker_jitter(ticker)
        return lat + jlat, lng + jlng, "us_state"

    if country in COUNTRY_CENTROIDS:
        lat, lng = COUNTRY_CENTROIDS[country]
        jlat, jlng = ticker_jitter(ticker)
        return lat + jlat * 2, lng + jlng * 2, "country"

    lat, lng = COUNTRY_CENTROIDS.get("US", (20.0, 0.0))
    jlat, jlng = ticker_jitter(ticker)
    return lat + jlat * 3, lng + jlng * 3, "default"


US_STATE_NAMES = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas", "CA": "California",
    "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware", "FL": "Florida", "GA": "Georgia",
    "HI": "Hawaii", "ID": "Idaho", "IL": "Illinois", "IN": "Indiana", "IA": "Iowa",
    "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland",
    "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi", "MO": "Missouri",
    "MT": "Montana", "NE": "Nebraska", "NV": "Nevada", "NH": "New Hampshire", "NJ": "New Jersey",
    "NM": "New Mexico", "NY": "New York", "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio",
    "OK": "Oklahoma", "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina",
    "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah", "VT": "Vermont",
    "VA": "Virginia", "WA": "Washington", "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming",
    "DC": "District of Columbia",
}


def is_illustrative(node: Dict[str, Any]) -> bool:
    return "illustrative" in (node.get("tags") or [])


def normalize_ticker(t: Any) -> str:
    return str(t or "").strip().upper()


def parse_us_state(state_raw: Any, country: str) -> Optional[str]:
    if not state_raw or country != "US":
        return None
    s = str(state_raw).strip().upper()
    if len(s) == 2 and s in US_STATE_NAMES:
        return s
    # "California" -> CA
    for abbr, name in US_STATE_NAMES.items():
        if s == name.upper():
            return abbr
    return None


def country_code(info: Dict[str, Any]) -> tuple[str, str]:
    c = str(info.get("country") or info.get("countryCode") or "").strip()
    if not c:
        return "US", "United States"
    if len(c) == 2:
        return c.upper(), c.upper()
    # common full names
    mapping = {
        "UNITED STATES": ("US", "United States"),
        "USA": ("US", "United States"),
        "TAIWAN": ("TW", "Taiwan"),
        "SOUTH KOREA": ("KR", "South Korea"),
        "KOREA": ("KR", "South Korea"),
        "CHINA": ("CN", "China"),
        "NETHERLANDS": ("NL", "Netherlands"),
        "GERMANY": ("DE", "Germany"),
        "FRANCE": ("FR", "France"),
        "UNITED KINGDOM": ("GB", "United Kingdom"),
        "JAPAN": ("JP", "Japan"),
        "ISRAEL": ("IL", "Israel"),
        "SWITZERLAND": ("CH", "Switzerland"),
        "IRELAND": ("IE", "Ireland"),
        "CANADA": ("CA", "Canada"),
        "SINGAPORE": ("SG", "Singapore"),
        "HONG KONG": ("HK", "Hong Kong"),
        "AUSTRALIA": ("AU", "Australia"),
    }
    key = c.upper()
    if key in mapping:
        return mapping[key]
    if key in ("HO", "HK"):
        return "HK", "Hong Kong"
    return key[:2] if len(key) >= 2 else "XX", c


def fetch_location(ticker: str, node: Dict[str, Any]) -> Dict[str, Any]:
    if ticker in MANUAL:
        return {
            **MANUAL[ticker],
            "ticker": ticker,
            "nodeId": node.get("id"),
            "label": node.get("label"),
            "clusterId": node.get("clusterId"),
            "source": "manual",
            "placement": "manual",
        }

    t = yf.Ticker(ticker)
    with contextlib.redirect_stderr(io.StringIO()):
        try:
            info = t.info or {}
        except Exception as e:
            return {"ticker": ticker, "error": str(e)}

    country, country_name = country_code(info)
    us_state = parse_us_state(info.get("state") or info.get("region"), country)
    lat = info.get("latitude")
    lng = info.get("longitude")
    city = info.get("city")

    placement = "yfinance"
    if lat is None or lng is None:
        lat, lng, placement = resolve_coordinates(ticker, country, us_state, city)

    return {
        "ticker": ticker,
        "nodeId": node.get("id"),
        "label": node.get("label"),
        "clusterId": node.get("clusterId"),
        "city": city,
        "country": country,
        "countryName": country_name,
        "usState": us_state,
        "usStateName": US_STATE_NAMES.get(us_state) if us_state else None,
        "lat": float(lat),
        "lng": float(lng),
        "source": placement if placement != "yfinance" else "yfinance",
        "placement": placement,
    }


def main() -> int:
    nodes = json.loads(NODES_PATH.read_text("utf-8"))
    companies = [n for n in nodes if n.get("nodeType") == "company"]
    tickers = sorted({normalize_ticker(n.get("ticker")) for n in companies if normalize_ticker(n.get("ticker"))})

    limit = os.environ.get("LIMIT", "").strip()
    if limit:
        tickers = tickers[: max(0, int(limit))]

    by_ticker: Dict[str, Any] = {}
    by_node_id: Dict[str, Any] = {}
    ok = fail = 0
    delay = float(os.environ.get("DELAY_S", "0.2"))

    print(f"Fetching locations for {len(tickers)} tickers…")
    ticker_to_node = {normalize_ticker(n.get("ticker")): n for n in companies if normalize_ticker(n.get("ticker"))}

    for ticker in tickers:
        node = ticker_to_node.get(ticker, {})
        try:
            row = fetch_location(ticker, node)
            by_ticker[ticker] = row
            if node.get("id"):
                by_node_id[node["id"]] = row
            if row.get("error"):
                fail += 1
            else:
                ok += 1
        except Exception as e:
            by_ticker[ticker] = {"ticker": ticker, "error": str(e)}
            fail += 1
        time.sleep(delay)

    OUT_PATH.write_text(
        json.dumps(
            {
                "asOf": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "source": "yfinance+manual",
                "ok": ok,
                "fail": fail,
                "byTicker": by_ticker,
                "byNodeId": by_node_id,
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"Wrote {OUT_PATH} (ok={ok}, fail={fail})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
