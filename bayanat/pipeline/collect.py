"""Collect items from RSS/Atom feeds and the CISA KEV catalogue into SQLite."""

from __future__ import annotations

import hashlib
import json
import logging
import re
import sqlite3
from datetime import datetime, timedelta, timezone
from difflib import SequenceMatcher
from typing import Any, Callable
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import feedparser
import httpx
from bs4 import BeautifulSoup

from .config import Config

log = logging.getLogger(__name__)

Fetcher = Callable[[str], bytes]
TRACKING_PARAMS = re.compile(r"^(utm_|fbclid|gclid|mc_cid|mc_eid)")


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def canonical_url(url: str) -> str:
    """Drop tracking parameters and fragments so the same story hashes the same."""
    parts = urlsplit(url.strip())
    query = [(k, v) for k, v in parse_qsl(parts.query) if not TRACKING_PARAMS.match(k)]
    return urlunsplit((parts.scheme.lower(), parts.netloc.lower(), parts.path.rstrip("/"), urlencode(query), ""))


def item_id(url: str) -> str:
    return hashlib.sha1(canonical_url(url).encode()).hexdigest()


def title_key(title: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", title.lower()).strip()


def clean_text(html: str | None, limit: int = 1500) -> str:
    if not html:
        return ""
    text = BeautifulSoup(html, "html.parser").get_text(" ", strip=True)
    return re.sub(r"\s+", " ", text)[:limit]


def http_fetcher(cfg: Config) -> Fetcher:
    collect = cfg.section("collect")
    client = httpx.Client(
        timeout=collect.get("timeout_seconds", 20),
        follow_redirects=True,
        headers={"User-Agent": cfg.settings["site"]["user_agent"]},
    )

    def fetch(url: str) -> bytes:
        resp = client.get(url)
        resp.raise_for_status()
        return resp.content

    return fetch


def parse_rss(content: bytes, source: dict[str, Any], max_age_days: int) -> list[dict[str, Any]]:
    feed = feedparser.parse(content)
    cutoff = now_utc() - timedelta(days=max_age_days)
    items = []
    for entry in feed.entries:
        link = entry.get("link")
        title = (entry.get("title") or "").strip()
        if not link or not title:
            continue
        stamp = entry.get("published_parsed") or entry.get("updated_parsed")
        published = datetime(*stamp[:6], tzinfo=timezone.utc) if stamp else None
        if published and published < cutoff:
            continue
        items.append({
            "url": link,
            "title": title,
            "summary_raw": clean_text(entry.get("summary") or entry.get("description")),
            "published_at": published.isoformat() if published else None,
        })
    return items


def parse_cisa_kev(content: bytes, source: dict[str, Any], max_age_days: int) -> list[dict[str, Any]]:
    data = json.loads(content)
    cutoff = (now_utc() - timedelta(days=max_age_days)).date()
    items = []
    for vuln in data.get("vulnerabilities", []):
        try:
            added = datetime.strptime(vuln["dateAdded"], "%Y-%m-%d").date()
        except (KeyError, ValueError):
            continue
        if added < cutoff:
            continue
        cve = vuln.get("cveID", "")
        items.append({
            "url": f"https://nvd.nist.gov/vuln/detail/{cve}",
            "title": f"{cve}: {vuln.get('vendorProject', '')} {vuln.get('product', '')} – {vuln.get('vulnerabilityName', '')}".strip(),
            "summary_raw": vuln.get("shortDescription", ""),
            "published_at": datetime.combine(added, datetime.min.time(), tzinfo=timezone.utc).isoformat(),
        })
    return items


PARSERS = {"rss": parse_rss, "cisa_kev": parse_cisa_kev}


def is_near_duplicate(conn: sqlite3.Connection, key: str, window_days: int, threshold: float) -> bool:
    since = (now_utc() - timedelta(days=window_days)).isoformat()
    for row in conn.execute("SELECT title_key FROM items WHERE collected_at >= ?", (since,)):
        if SequenceMatcher(None, key, row["title_key"]).ratio() >= threshold:
            return True
    return False


def store_items(conn: sqlite3.Connection, source: dict[str, Any], items: list[dict[str, Any]], cfg: Config) -> tuple[int, int]:
    collect = cfg.section("collect")
    window = collect.get("dedupe_window_days", 14)
    threshold = collect.get("title_similarity", 0.9)
    new = dupes = 0
    for it in items:
        iid = item_id(it["url"])
        if conn.execute("SELECT 1 FROM items WHERE id = ?", (iid,)).fetchone():
            continue
        key = title_key(it["title"])
        status = "duplicate" if is_near_duplicate(conn, key, window, threshold) else "new"
        conn.execute(
            """INSERT INTO items (id, source_id, source_kind, url, title, summary_raw,
                                  published_at, collected_at, title_key, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (iid, source["id"], source.get("kind", "media"), canonical_url(it["url"]), it["title"],
             it.get("summary_raw", ""), it.get("published_at"), now_utc().isoformat(), key, status),
        )
        if status == "new":
            new += 1
        else:
            dupes += 1
    conn.commit()
    return new, dupes


def run(cfg: Config, conn: sqlite3.Connection, fetch: Fetcher | None = None) -> dict[str, int]:
    fetch = fetch or http_fetcher(cfg)
    max_age = cfg.section("collect").get("max_age_days", 10)
    totals = {"sources": 0, "failed": 0, "new": 0, "duplicates": 0}
    for source in cfg.sources:
        parser = PARSERS.get(source.get("type", "rss"))
        if parser is None:
            log.warning("Unknown source type %s for %s", source.get("type"), source["id"])
            continue
        try:
            items = parser(fetch(source["url"]), source, max_age)
        except Exception as exc:  # one broken feed must not stop the run
            log.warning("Source %s failed: %s", source["id"], exc)
            totals["failed"] += 1
            continue
        new, dupes = store_items(conn, source, items, cfg)
        totals["sources"] += 1
        totals["new"] += new
        totals["duplicates"] += dupes
        log.info("%s: %d new, %d duplicates", source["id"], new, dupes)
    return totals
