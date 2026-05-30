"""Shared helpers for research-grade score pipeline."""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "src" / "data"
NODES_PATH = DATA_DIR / "nodes.json"


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def is_illustrative(node: Dict[str, Any]) -> bool:
    return "illustrative" in (node.get("tags") or [])


def safe_float(v: Any) -> Optional[float]:
    try:
        if v is None:
            return None
        if isinstance(v, str) and v.strip() in ("", "None", "null", "NaN"):
            return None
        n = float(v)
        if math.isnan(n) or math.isinf(n):
            return None
        return n
    except (TypeError, ValueError):
        return None


def winsorize(values: List[float], lower: float = 0.01, upper: float = 0.99) -> List[float]:
    if not values:
        return values
    xs = sorted(values)
    lo = xs[int(lower * (len(xs) - 1))]
    hi = xs[int(upper * (len(xs) - 1))]
    return [min(hi, max(lo, x)) for x in values]


def percentile_scores(raw_by_key: Dict[str, Optional[float]], winsor: bool = True) -> Dict[str, float]:
    """Map raw values → 0–100 percentile per key. Keys with None are omitted."""
    items = [(k, v) for k, v in raw_by_key.items() if v is not None]
    if len(items) < 2:
        out: Dict[str, float] = {}
        for k, v in items:
            out[k] = 50.0
        return out

    keys = [k for k, _ in items]
    vals = [float(v) for _, v in items]
    if winsor:
        vals = winsorize(vals)

    order = sorted(range(len(vals)), key=lambda i: vals[i])
    ranks = [0.0] * len(vals)
    for rank, idx in enumerate(order):
        ranks[idx] = rank

    denom = len(vals) - 1
    return {keys[i]: (100.0 * ranks[i] / denom if denom else 50.0) for i in range(len(vals))}


def mean_available(*values: Optional[float]) -> Optional[float]:
    xs = [v for v in values if v is not None]
    if not xs:
        return None
    return sum(xs) / len(xs)


def clamp_score(v: Optional[float]) -> Optional[float]:
    if v is None:
        return None
    return max(0.0, min(100.0, v))


def market_cap_weighted_mean(
    pairs: Iterable[tuple[float, Optional[float]]],
) -> Optional[float]:
    num = 0.0
    den = 0.0
    for weight, score in pairs:
        if score is None or weight <= 0:
            continue
        num += weight * score
        den += weight
    if den <= 0:
        return None
    return num / den
