"""Editorial checks run on every pull request: nothing unvetted gets published."""

from __future__ import annotations

from pathlib import Path

from .config import Config
from .content import read_markdown

BRIEF_REQUIRED = ["title", "date", "pillar", "status", "source_name", "source_url", "summary"]
STATUSES = {"draft", "approved"}


def check_brief(path: Path) -> list[str]:
    meta, _ = read_markdown(path)
    errors = [f"missing '{k}'" for k in BRIEF_REQUIRED if not meta.get(k)]
    status = meta.get("status")
    if status not in STATUSES:
        errors.append(f"status must be one of {sorted(STATUSES)}, got {status!r}")
    if status == "approved":
        if not str(meta.get("my_take", "")).strip():
            errors.append("approved brief needs your 'my_take'")
        if meta.get("needs_primary_source"):
            errors.append("named incident from a secondary source: add a primary source, "
                          "then set needs_primary_source: false")
    return errors


def check_analysis(path: Path) -> list[str]:
    meta, body = read_markdown(path)
    required = ["title", "date", "pillar", "description"]
    if meta.get("type") != "editorial":  # editorials (about us, notes) may have no sources
        required.append("sources")
    errors = [f"missing '{k}'" for k in required if not meta.get(k)]
    if meta.get("status", "published") == "published" and "TODO" in body:
        errors.append("published analysis still contains TODO placeholders")
    return errors


def run(cfg: Config) -> dict[str, list[str]]:
    content = cfg.path("content")
    problems: dict[str, list[str]] = {}
    for path in sorted((content / "en" / "brief").glob("*.md")):
        if errs := check_brief(path):
            problems[str(path.relative_to(cfg.root))] = errs
    for lang in ("en", "ar"):
        for path in sorted((content / lang / "analysis").glob("*.md")):
            if errs := check_analysis(path):
                problems[str(path.relative_to(cfg.root))] = errs
    return problems
