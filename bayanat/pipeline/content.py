"""Markdown files with YAML front matter: the shared format of the pipeline and the site."""

from __future__ import annotations

import re
import unicodedata
from pathlib import Path
from typing import Any

import yaml

FRONT = re.compile(r"^---\n(.*?)\n---\n?(.*)$", re.DOTALL)
PRIMARY_KINDS = {"official", "vendor", "advisory"}


def slugify(text: str, max_len: int = 60) -> str:
    ascii_text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_text.lower()).strip("-")
    return slug[:max_len].rstrip("-") or "item"


def write_markdown(path: Path, meta: dict[str, Any], body: str = "") -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    front = yaml.safe_dump(meta, allow_unicode=True, sort_keys=False, width=1000).strip()
    path.write_text(f"---\n{front}\n---\n\n{body.strip()}\n", encoding="utf-8")
    return path


def read_markdown(path: Path) -> tuple[dict[str, Any], str]:
    text = path.read_text(encoding="utf-8")
    match = FRONT.match(text)
    if not match:
        return {}, text
    return yaml.safe_load(match.group(1)) or {}, match.group(2).strip()


def unique_path(directory: Path, stem: str) -> Path:
    path = directory / f"{stem}.md"
    n = 2
    while path.exists():
        path = directory / f"{stem}-{n}.md"
        n += 1
    return path
