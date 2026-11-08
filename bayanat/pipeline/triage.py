"""LLM triage: pillar, relevance and incident flag for pre-filtered items, in batches."""

from __future__ import annotations

import json
import logging
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from .config import Config
from .llm import LLMRouter, NoRouteAvailable

log = logging.getLogger(__name__)
PILLARS = {"governance", "llm", "security", "regulation", "off_topic"}
PROMPT = (Path(__file__).parent / "prompts" / "triage.md").read_text(encoding="utf-8")


def _batch_payload(rows: list[sqlite3.Row]) -> str:
    items = [
        {"id": r["id"], "source": r["source_id"], "title": r["title"], "text": (r["summary_raw"] or "")[:700]}
        for r in rows
    ]
    return json.dumps({"items": items}, ensure_ascii=False)


def run(cfg: Config, conn: sqlite3.Connection, router: LLMRouter) -> dict[str, int]:
    size = cfg.section("triage").get("batch_size", 8)
    rows = conn.execute(
        "SELECT id, source_id, title, summary_raw FROM items WHERE status = 'prefiltered' "
        "ORDER BY prefilter_score DESC"
    ).fetchall()
    done = failed = 0
    for start in range(0, len(rows), size):
        batch = rows[start:start + size]
        try:
            data, route = router.complete_json("triage", PROMPT, _batch_payload(batch), max_tokens=900)
        except NoRouteAvailable as exc:
            log.error("Triage stopped, no model available: %s", exc)
            break  # remaining items stay 'prefiltered' for the next run
        except ValueError as exc:  # unparseable reply: skip this batch, retry next run
            log.warning("Unparseable triage reply: %s", exc)
            failed += len(batch)
            continue
        known = {r["id"] for r in batch}
        for res in data.get("results", []):
            iid = res.get("id")
            pillar = res.get("pillar")
            if iid not in known or pillar not in PILLARS:
                continue
            try:
                relevance = max(0, min(100, int(res.get("relevance", 0))))
            except (TypeError, ValueError):
                continue
            conn.execute(
                """UPDATE items SET status = 'triaged', llm_pillar = ?, llm_relevance = ?,
                       llm_incident = ?, llm_reason = ?, triaged_at = ? WHERE id = ?""",
                (pillar, relevance, int(bool(res.get("named_incident"))), str(res.get("reason", ""))[:200],
                 datetime.now(timezone.utc).isoformat(), iid),
            )
            done += 1
        conn.commit()
        log.info("Triaged batch of %d via %s/%s", len(batch), route.provider, route.model)
    return {"triaged": done, "failed": failed, "remaining": len(rows) - done - failed}
