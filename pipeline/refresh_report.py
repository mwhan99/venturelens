#!/usr/bin/env python3
"""Write the pull-request text for a quarterly refresh: what changed, and what to retype by hand.

Compares the website data committed on the current branch (git HEAD) with the
freshly built files, and prints Markdown. The quarterly GitHub job uses it as
the pull request description; it can also be run by hand after a local rebuild.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SUMMARY = "src/data/formd/summary.json"
BENCHMARKS = "src/data/formd/benchmarks.json"
# Files where numbers are typed by hand and won't update themselves.
HAND_TYPED = ("README.md", "pipeline/FINDINGS.md", "CLAUDE.md")


def pct(value: float) -> str:
    return f"{value * 100:.1f}%"


def money(value: float) -> str:
    if value >= 1_000_000:
        return f"${value / 1_000_000:.2f}M".replace(".00M", "M")
    return f"${value:,.0f}"


def headline(summary: dict, benchmarks: dict) -> dict[str, str]:
    """The numbers a visitor sees first, formatted the way the site and README write them."""
    head = summary["headline"]
    odds = benchmarks["overall"]["probability_another_filing_by_month"]
    return {
        "Data through": summary["dataset_end_date"],
        "Startups in the benchmark": f"{head['companies']:,}",
        "Rounds": f"{head['rounds']:,}",
        "Median round size": money(head["median_amount_sold"]),
        "Raised again within 12 months": pct(odds["12"]),
        "Raised again within 24 months": pct(odds["24"]),
        "Median months to the next round (when there is one)": f"{benchmarks['overall']['conditional_median_months']}",
    }


def changed_values(before: dict[str, str], after: dict[str, str]) -> list[str]:
    """Old values that changed, longest first, to search for in hand-typed files."""
    old = {before[k] for k in before if before[k] != after.get(k)}
    # Very short values like "14.52" can match unrelated text; keep the distinctive ones.
    return sorted((v for v in old if len(v) >= 5), key=len, reverse=True)


def stale_mentions(values: list[str]) -> list[str]:
    lines = []
    for name in HAND_TYPED:
        path = ROOT / name
        if not path.exists():
            continue
        for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
            found = [v for v in values if v in line]
            if found:
                lines.append(f"- `{name}:{number}` still says {', '.join(f'**{v}**' for v in found)}")
    return lines


def report(before: dict[str, str], after: dict[str, str], stale: list[str]) -> str:
    rows = ["| | Before | After |", "|---|---|---|"]
    for key, new in after.items():
        old = before.get(key, "—")
        mark = "" if old == new else " ✱"
        rows.append(f"| {key} | {old} | {new}{mark} |")
    parts = [
        f"New SEC Form D data, through **{after['Data through']}**. Built by the quarterly refresh job.",
        "",
        "\n".join(rows),
        "",
        "✱ = changed.",
        "",
        "**What merging does:** Vercel redeploys the site with these numbers, and the "
        "*Supabase sync* workflow then rebuilds the same data and updates the company lookup.",
        "",
        "**Before merging:**",
        "- Open the Vercel preview and look at the home page and Explore odds.",
        "- Run `npm test`: `src/lib/formd/benchmarks.test.ts` checks one real lookup "
        "(FinTech, $1–5M, 16 months) and needs its numbers updated after a refresh.",
    ]
    if stale:
        parts += ["- Numbers typed by hand that still show the old value (update them in this pull request):", *stale]
    else:
        parts.append("- No hand-typed numbers in README, FINDINGS or CLAUDE.md need changing.")
    return "\n".join(parts) + "\n"


def load_committed(path: str) -> dict:
    text = subprocess.run(
        ["git", "show", f"HEAD:{path}"], cwd=ROOT, check=True, capture_output=True, text=True
    ).stdout
    return json.loads(text)


def load_current(path: str) -> dict:
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def main() -> int:
    before = headline(load_committed(SUMMARY), load_committed(BENCHMARKS))
    after = headline(load_current(SUMMARY), load_current(BENCHMARKS))
    sys.stdout.write(report(before, after, stale_mentions(changed_values(before, after))))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
