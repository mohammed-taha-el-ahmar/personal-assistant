"""Keyword pre-filter: decides which items are worth an LLM call."""

from __future__ import annotations

import re
import sqlite3
from functools import lru_cache
from typing import Any

from .config import Config


@lru_cache(maxsize=512)
def _pattern(term: str) -> re.Pattern[str]:
    # Short acronyms (mdm, rag, cve, llm) must match as whole words.
    if len(term) <= 4 and term.isalnum():
        return re.compile(rf"\b{re.escape(term)}\b", re.IGNORECASE)
    return re.compile(re.escape(term), re.IGNORECASE)


def score_text(title: str, body: str, pillars: dict[str, Any]) -> tuple[int, str | None]:
    """Return (score, best pillar). Title matches count double."""
    best_pillar, best_score, total = None, 0, 0
    for pillar, spec in pillars.items():
        pillar_score = 0
        for term, weight in (spec.get("terms") or {}).items():
            pat = _pattern(term)
            if pat.search(title):
                pillar_score += 2 * weight
            elif pat.search(body):
                pillar_score += weight
        total += pillar_score
        if pillar_score > best_score:
            best_pillar, best_score = pillar, pillar_score
    return total, best_pillar


def run(cfg: Config, conn: sqlite3.Connection) -> dict[str, int]:
    pf = cfg.section("prefilter")
    min_score = pf.get("min_score", 3)
    cap = pf.get("max_items_per_run", 100)
    bonus = cfg.source_kind_bonus

    rows = conn.execute("SELECT id, title, summary_raw, source_kind FROM items WHERE status = 'new'").fetchall()
    scored = []
    for row in rows:
        score, pillar = score_text(row["title"], row["summary_raw"] or "", cfg.pillars)
        score += bonus.get(row["source_kind"], 0) if score > 0 else 0
        scored.append((score, pillar, row["id"]))

    scored.sort(reverse=True)
    kept = filtered = 0
    for score, pillar, iid in scored:
        if score < min_score:
            status = "filtered_out"
            filtered += 1
        elif kept < cap:
            status = "prefiltered"
            kept += 1
        else:
            continue  # over budget: stays 'new' and is reconsidered next run
        conn.execute(
            "UPDATE items SET status = ?, prefilter_score = ?, pillar_guess = ? WHERE id = ?",
            (status, score, pillar, iid),
        )
    conn.commit()
    return {"kept": kept, "filtered_out": filtered, "deferred": max(0, len(scored) - kept - filtered)}
