"""Turn the most relevant triaged items into brief drafts (markdown) for editor review.

Each draft lands in content/en/brief/ with status: draft. The scheduled workflow
opens a pull request; the editor fills `my_take`, sets status: approved (or deletes
the file) and merges. Nothing is published without that merge.
"""

from __future__ import annotations

import json
import logging
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

from .collect import clean_text
from .config import Config
from .content import PRIMARY_KINDS, read_markdown, slugify, unique_path, write_markdown
from .llm import LLMRouter, NoRouteAvailable

log = logging.getLogger(__name__)
PROMPT = (Path(__file__).parent / "prompts" / "summary.md").read_text(encoding="utf-8")


def _source_names(cfg: Config) -> dict[str, str]:
    return {s["id"]: s.get("name", s["id"]) for s in cfg.sources}


def run(cfg: Config, conn: sqlite3.Connection, router: LLMRouter,
        fetch_page: Callable[[str], bytes] | None = None) -> dict[str, int]:
    tri = cfg.section("triage")
    rows = conn.execute(
        """SELECT * FROM items WHERE status = 'triaged' AND llm_pillar != 'off_topic'
           AND llm_relevance >= ? ORDER BY llm_relevance DESC LIMIT ?""",
        (tri.get("min_relevance_for_draft", 60), tri.get("max_drafts_per_run", 12)),
    ).fetchall()
    out_dir = cfg.path("content") / "en" / "brief"
    names = _source_names(cfg)
    written = skipped = 0
    # Stories already in Git (drafted on an earlier run) are never drafted twice,
    # even if the database was lost and the item was collected again.
    already = {read_markdown(p)[0].get("source_url") for p in out_dir.glob("*.md")}

    for row in rows:
        if row["url"] in already:
            conn.execute("UPDATE items SET status = 'drafted' WHERE id = ?", (row["id"],))
            continue
        text = row["summary_raw"] or ""
        if fetch_page is not None:  # optional: richer context from the article page
            try:
                text = clean_text(fetch_page(row["url"]).decode("utf-8", "ignore"), limit=6000) or text
            except Exception as exc:
                log.info("Page fetch failed for %s: %s", row["url"], exc)
        payload = json.dumps({"source": names.get(row["source_id"], row["source_id"]),
                              "title": row["title"], "url": row["url"], "text": text}, ensure_ascii=False)
        try:
            data, route = router.complete_json("summary", PROMPT, payload, max_tokens=700)
        except NoRouteAvailable as exc:
            log.error("Drafting stopped, no model available: %s", exc)
            break
        except ValueError:
            skipped += 1
            continue

        if not data.get("usable", True) or not data.get("headline"):
            conn.execute("UPDATE items SET status = 'rejected' WHERE id = ?", (row["id"],))
            skipped += 1
            continue

        today = datetime.now(timezone.utc).date().isoformat()
        incident = bool(row["llm_incident"])
        meta = {
            "title": data["headline"].strip(),
            "date": today,
            "pillar": row["llm_pillar"],
            "status": "draft",
            "relevance": row["llm_relevance"],
            "source_name": names.get(row["source_id"], row["source_id"]),
            "source_url": row["url"],
            "source_kind": row["source_kind"],
            "named_incident": incident,
            "needs_primary_source": incident and row["source_kind"] not in PRIMARY_KINDS,
            "summary": data.get("summary", "").strip(),
            "why_it_matters": data.get("why_it_matters", "").strip(),
            "my_take": "",
            "facts_to_check": [str(f) for f in data.get("facts_to_check", [])][:8],
            "drafted_with": f"{route.provider}/{route.model}",
        }
        path = unique_path(out_dir, f"{today}-{slugify(meta['title'])}")
        write_markdown(path, meta, "")
        conn.execute("UPDATE items SET status = 'drafted', draft_path = ? WHERE id = ?",
                     (str(path.relative_to(cfg.root)), row["id"]))
        conn.commit()
        written += 1
    return {"drafts": written, "skipped": skipped}
