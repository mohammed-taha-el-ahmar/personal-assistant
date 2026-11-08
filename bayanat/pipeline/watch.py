"""Regulation tracker: detect changes on official pages and draft 'what changed' notes."""

from __future__ import annotations

import difflib
import hashlib
import json
import logging
import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

from bs4 import BeautifulSoup

from .config import Config
from .content import unique_path, write_markdown
from .llm import LLMRouter, NoRouteAvailable

log = logging.getLogger(__name__)
PROMPT = (Path(__file__).parent / "prompts" / "watch.md").read_text(encoding="utf-8")


def page_text(html: bytes) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header", "noscript", "form"]):
        tag.decompose()
    lines = [re.sub(r"\s+", " ", ln).strip() for ln in soup.get_text("\n").splitlines()]
    return "\n".join(ln for ln in lines if ln)


def text_diff(old: str, new: str, limit: int = 4000) -> str:
    diff = difflib.unified_diff(old.splitlines(), new.splitlines(), lineterm="", n=0)
    body = "\n".join(ln for ln in diff if not ln.startswith(("---", "+++", "@@")))
    return body[:limit]


def run(cfg: Config, conn: sqlite3.Connection, router: LLMRouter,
        fetch: Callable[[str], bytes]) -> dict[str, int]:
    out_dir = cfg.path("content") / "en" / "tracker-updates"
    stats = {"checked": 0, "baseline": 0, "unchanged": 0, "cosmetic": 0, "drafts": 0, "failed": 0}
    for page in cfg.watch_pages:
        try:
            text = page_text(fetch(page["url"]))
        except Exception as exc:
            log.warning("Watch %s failed: %s", page["id"], exc)
            stats["failed"] += 1
            continue
        stats["checked"] += 1
        digest = hashlib.sha256(text.encode()).hexdigest()
        now = datetime.now(timezone.utc).isoformat()
        prev = conn.execute("SELECT text_hash, text FROM watch_pages WHERE page_id = ?", (page["id"],)).fetchone()

        def save() -> None:
            conn.execute(
                "INSERT OR REPLACE INTO watch_pages (page_id, url, text_hash, text, checked_at) VALUES (?, ?, ?, ?, ?)",
                (page["id"], page["url"], digest, text, now),
            )
            conn.commit()

        if prev is None:
            save()
            stats["baseline"] += 1
            continue
        if prev["text_hash"] == digest:
            stats["unchanged"] += 1
            continue

        payload = json.dumps({"page": page["name"], "jurisdiction": page.get("jurisdiction"),
                              "diff": text_diff(prev["text"], text)}, ensure_ascii=False)
        try:
            data, route = router.complete_json("watch", PROMPT, payload, max_tokens=500)
        except (NoRouteAvailable, ValueError) as exc:
            log.error("Watch analysis failed for %s: %s", page["id"], exc)
            stats["failed"] += 1
            continue  # baseline not updated: the change is re-examined next run
        save()
        if not data.get("material"):
            stats["cosmetic"] += 1
            continue
        day = now[:10]
        meta = {
            "title": data.get("headline", page["name"]),
            "date": day,
            "status": "draft",
            "page": page["name"],
            "jurisdiction": page.get("jurisdiction"),
            "source_url": page["url"],
            "what_changed": data.get("what_changed", ""),
            "facts_to_check": [str(f) for f in data.get("facts_to_check", [])][:8],
            "drafted_with": f"{route.provider}/{route.model}",
        }
        write_markdown(unique_path(out_dir, f"{day}-{page['id']}"), meta,
                       "Update content/tracker.yaml if this change moves a date or a status.")
        stats["drafts"] += 1
    return stats
