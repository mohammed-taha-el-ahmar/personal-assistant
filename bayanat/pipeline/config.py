"""Configuration loading. All settings live in YAML files under config/."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml


def repo_root() -> Path:
    """Repository root; override with BAYANAT_ROOT (used by tests)."""
    env = os.environ.get("BAYANAT_ROOT")
    return Path(env) if env else Path(__file__).resolve().parent.parent


def _load(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    with path.open(encoding="utf-8") as fh:
        return yaml.safe_load(fh) or {}


@dataclass
class Config:
    root: Path
    settings: dict[str, Any]
    sources: list[dict[str, Any]]
    pillars: dict[str, Any]
    source_kind_bonus: dict[str, int]
    watch_pages: list[dict[str, Any]]
    extra: dict[str, Any] = field(default_factory=dict)

    def path(self, key: str) -> Path:
        """Resolve a path from settings.paths relative to the repository root."""
        return self.root / self.settings["paths"][key]

    def section(self, name: str) -> dict[str, Any]:
        return self.settings.get(name, {})


def load_config(root: Path | None = None) -> Config:
    root = root or repo_root()
    cfg_dir = root / "config"
    settings = _load(cfg_dir / "settings.yaml")
    sources = _load(cfg_dir / "sources.yaml").get("sources", [])
    pillars_doc = _load(cfg_dir / "pillars.yaml")
    watch = _load(cfg_dir / "watch.yaml").get("pages", [])
    return Config(
        root=root,
        settings=settings,
        sources=[s for s in sources if s.get("enabled", True)],
        pillars=pillars_doc.get("pillars", {}),
        source_kind_bonus=pillars_doc.get("source_kind_bonus", {}),
        watch_pages=[p for p in watch if p.get("enabled", True)],
    )
