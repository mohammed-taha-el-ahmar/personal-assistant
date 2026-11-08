"""Command line: python -m pipeline <command>.

  run                      collect, prefilter, triage, draft and watch in one go
  collect | prefilter | triage | draft | watch
  newsletter draft|render  [--date YYYY-MM-DD]  (default: today)
  check                    editorial checks on content/ (used in pull requests)
  stats                    item counts and LLM usage
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
from datetime import date
from pathlib import Path

from . import check, collect, drafts, newsletter, prefilter, triage, watch
from .config import load_config
from .db import connect
from .llm import LLMRouter


def load_dotenv(path: Path) -> None:
    """Read KEY=VALUE lines from a local .env without overriding real env vars."""
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            if value.strip():
                os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="pipeline", description="Bayanat editorial pipeline")
    parser.add_argument("command", choices=["run", "collect", "prefilter", "triage", "draft", "watch",
                                            "newsletter", "check", "stats"])
    parser.add_argument("action", nargs="?", choices=["draft", "render"], help="newsletter action")
    parser.add_argument("--date", type=date.fromisoformat, default=date.today())
    parser.add_argument("--fetch-pages", action="store_true", help="fetch article pages for richer drafts")
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args(argv)

    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.INFO,
                        format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    cfg = load_config()
    load_dotenv(cfg.root / ".env")

    if args.command == "check":
        problems = check.run(cfg)
        for path, errs in problems.items():
            for err in errs:
                print(f"::error file={path}::{err}")
        print("All content checks passed." if not problems else f"{len(problems)} file(s) need attention.")
        return 1 if problems else 0

    if args.command == "newsletter":
        if args.action == "render":
            print(newsletter.render(cfg, args.date))
        else:
            print(newsletter.draft(cfg, args.date))
        return 0

    conn = connect(cfg.path("database"))
    if args.command == "stats":
        by_status = dict(conn.execute("SELECT status, COUNT(*) FROM items GROUP BY status").fetchall())
        usage = conn.execute(
            "SELECT provider, model, COUNT(*), SUM(in_tokens), SUM(out_tokens), SUM(ok) FROM llm_calls "
            "GROUP BY provider, model").fetchall()
        print(json.dumps({"items": by_status,
                          "llm": [dict(zip(["provider", "model", "calls", "in", "out", "ok"], r)) for r in usage]},
                         indent=2))
        return 0

    if args.command in ("run", "triage", "draft", "watch"):
        providers = cfg.settings.get("providers", {})
        if not any(os.environ.get(p.get("api_key_env", "")) for p in providers.values()):
            names = ", ".join(p["api_key_env"] for p in providers.values() if p.get("api_key_env"))
            print(f"::error::No LLM API key found. Set at least one of: {names} "
                  "(GitHub: Settings → Secrets and variables → Actions → Repository secrets).")
            return 1

    router = LLMRouter(cfg.settings, conn)
    fetch = collect.http_fetcher(cfg)
    steps = {
        "collect": lambda: collect.run(cfg, conn, fetch),
        "prefilter": lambda: prefilter.run(cfg, conn),
        "triage": lambda: triage.run(cfg, conn, router),
        "draft": lambda: drafts.run(cfg, conn, router, fetch if args.fetch_pages else None),
        "watch": lambda: watch.run(cfg, conn, router, fetch),
    }
    order = list(steps) if args.command == "run" else [args.command]
    results = {}
    for name in order:
        results[name] = steps[name]()
        print(f"{name}: {json.dumps(results[name])}")
    write_summary(results)
    return 0


def write_summary(results: dict) -> None:
    """On GitHub Actions, show what each step did on the run's summary page."""
    path = os.environ.get("GITHUB_STEP_SUMMARY")
    if not path:
        return
    lines = ["### Bayanat pipeline", "", "| Step | Result |", "|---|---|"]
    lines += [f"| {name} | `{json.dumps(r)}` |" for name, r in results.items()]
    if results.get("draft", {}).get("drafts") == 0:
        lines += ["", "No new drafts this run, so no pull request is opened or updated. "
                  "Check the counts above: nothing collected, nothing passing the prefilter, "
                  "or nothing scored high enough in triage (`min_relevance_for_draft`)."]
    with open(path, "a", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")


if __name__ == "__main__":
    sys.exit(main())
