"""SQLite storage: one small file, versioned as a GitHub Actions cache or artifact."""

from __future__ import annotations

import sqlite3
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS items (
    id              TEXT PRIMARY KEY,      -- sha1 of the canonical URL
    source_id       TEXT NOT NULL,
    source_kind     TEXT NOT NULL,
    url             TEXT NOT NULL,
    title           TEXT NOT NULL,
    summary_raw     TEXT,
    published_at    TEXT,
    collected_at    TEXT NOT NULL,
    title_key       TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'new',
        -- new | duplicate | filtered_out | prefiltered | triaged | drafted | rejected
    prefilter_score INTEGER,
    pillar_guess    TEXT,
    llm_pillar      TEXT,
    llm_relevance   INTEGER,
    llm_incident    INTEGER,
    llm_reason      TEXT,
    triaged_at      TEXT,
    draft_path      TEXT
);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_collected ON items(collected_at);

CREATE TABLE IF NOT EXISTS watch_pages (
    page_id     TEXT PRIMARY KEY,
    url         TEXT NOT NULL,
    text_hash   TEXT NOT NULL,
    text        TEXT NOT NULL,
    checked_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS llm_calls (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    ts          TEXT NOT NULL,
    task        TEXT NOT NULL,
    provider    TEXT NOT NULL,
    model       TEXT NOT NULL,
    in_tokens   INTEGER,
    out_tokens  INTEGER,
    ok          INTEGER NOT NULL
);
"""


def connect(path: Path) -> sqlite3.Connection:
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    return conn
