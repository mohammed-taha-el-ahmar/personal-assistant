"""Weekly newsletter: assemble an issue from approved briefs, then render email HTML.

1. `python -m pipeline newsletter draft`  -> content/newsletter/<date>.md (status: draft)
   The editor writes the note, fills the sponsor block, reorders or removes items.
2. `python -m pipeline newsletter render` -> dist/newsletter/<date>.html, ready to paste
   into the newsletter platform. Fonts are email-safe (Georgia, Arial).
"""

from __future__ import annotations

import html
import logging
from datetime import date, timedelta
from pathlib import Path
from typing import Any

from .config import Config
from .content import read_markdown, write_markdown

log = logging.getLogger(__name__)
MAX_ITEMS = 8


def _approved_briefs(cfg: Config, start: date, end: date) -> list[tuple[str, dict[str, Any]]]:
    out = []
    for path in sorted((cfg.path("content") / "en" / "brief").glob("*.md")):
        meta, _ = read_markdown(path)
        d = meta.get("date")
        d = date.fromisoformat(str(d)) if d else None
        if meta.get("status") == "approved" and d and start <= d <= end:
            out.append((path.stem, meta))
    out.sort(key=lambda x: x[1].get("relevance", 0), reverse=True)
    return out


def _approved_tracker_updates(cfg: Config, start: date, end: date) -> list[dict[str, Any]]:
    out = []
    for path in sorted((cfg.path("content") / "en" / "tracker-updates").glob("*.md")):
        meta, _ = read_markdown(path)
        d = meta.get("date")
        if meta.get("status") == "approved" and d and start <= date.fromisoformat(str(d)) <= end:
            out.append(meta)
    return out


def draft(cfg: Config, issue_date: date) -> Path:
    nl_dir = cfg.path("content") / "newsletter"
    nl_dir.mkdir(parents=True, exist_ok=True)
    path = nl_dir / f"{issue_date.isoformat()}.md"
    if path.exists():
        raise FileExistsError(f"{path} already exists; edit it or delete it first")
    start = issue_date - timedelta(days=7)
    briefs = _approved_briefs(cfg, start, issue_date)
    missing_take = [slug for slug, m in briefs if not str(m.get("my_take", "")).strip()]
    if missing_take:
        log.warning("Approved briefs without 'my_take': %s", ", ".join(missing_take))
    issue_no = len(list(nl_dir.glob("*.md"))) + 1
    meta = {
        "title": f"The Governance Brief #{issue_no}",
        "issue": issue_no,
        "date": issue_date.isoformat(),
        "status": "draft",
        "editor_note": "",
        "one_thing": "",
        "sponsor": {"name": "", "headline": "", "copy": "", "url": "", "cta": ""},
        "items": [slug for slug, _ in briefs[:MAX_ITEMS]],
    }
    return write_markdown(path, meta, "")


def _esc(value: Any) -> str:
    return html.escape(str(value or ""))


def render(cfg: Config, issue_date: date) -> Path:
    path = cfg.path("content") / "newsletter" / f"{issue_date.isoformat()}.md"
    meta, _ = read_markdown(path)
    brief_dir = cfg.path("content") / "en" / "brief"
    labels = {k: v.get("label", k) for k, v in cfg.pillars.items()}
    site = cfg.settings["site"]
    accent = "#0B6F6A"

    blocks = []
    for slug in meta.get("items", []):
        bpath = brief_dir / f"{slug}.md"
        if not bpath.exists():
            log.warning("Brief %s listed in the issue but not found", slug)
            continue
        b, _ = read_markdown(bpath)
        take = str(b.get("my_take", "")).strip()
        take_html = f' <strong style="color:#0E1B2C">My take:</strong> {_esc(take)}' if take else ""
        blocks.append(f"""
<tr><td style="padding:16px 0;border-bottom:1px solid #E1E6EB">
<p style="margin:0;font:700 12px Arial,Helvetica,sans-serif;letter-spacing:.06em;color:{accent}">{_esc(labels.get(b.get('pillar'), b.get('pillar', '')).upper())}</p>
<p style="margin:6px 0 0;font:700 17px/1.35 Arial,Helvetica,sans-serif"><a href="{_esc(b.get('source_url'))}" style="color:#0E1B2C;text-decoration:none">{_esc(b.get('title'))}</a></p>
<p style="margin:6px 0 0;font:15px/1.55 Arial,Helvetica,sans-serif;color:#3A4756">{_esc(b.get('summary'))}{take_html}</p>
<p style="margin:6px 0 0;font:12px Arial,Helvetica,sans-serif;color:#56626F">Source: <a href="{_esc(b.get('source_url'))}" style="color:#3A4756">{_esc(b.get('source_name'))}</a></p>
</td></tr>""")

    updates = _approved_tracker_updates(cfg, issue_date - timedelta(days=7), issue_date)
    tracker_html = "".join(
        f'<p style="margin:8px 0 0;font:15px/1.55 Arial,Helvetica,sans-serif">'
        f'<strong>{_esc(u.get("title"))}</strong> · {_esc(u.get("what_changed"))}</p>' for u in updates
    )
    sp = meta.get("sponsor") or {}
    sponsor_html = ""
    if sp.get("name"):
        sponsor_html = f"""
<tr><td style="padding:0 32px"><table role="presentation" width="100%" style="border:1px solid #D9DFE5;border-radius:6px;background:#F7F9FA"><tr><td style="padding:16px 18px">
<p style="margin:0;font:700 11px Arial,Helvetica,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#56626F">Sponsored · {_esc(sp.get('name'))}</p>
<p style="margin:8px 0 0;font:600 16px Arial,Helvetica,sans-serif">{_esc(sp.get('headline'))}</p>
<p style="margin:6px 0 0;font:14px/1.55 Arial,Helvetica,sans-serif;color:#3A4756">{_esc(sp.get('copy'))}</p>
<p style="margin:8px 0 0"><a href="{_esc(sp.get('url'))}" style="font:600 14px Arial,Helvetica,sans-serif;color:{accent}">{_esc(sp.get('cta') or 'Learn more')}</a></p>
</td></tr></table></td></tr>"""

    one_thing = ""
    if str(meta.get("one_thing", "")).strip():
        one_thing = f"""
<tr><td style="padding:24px 32px 0"><table role="presentation" width="100%" style="background:#0E1B2C;border-radius:6px"><tr><td style="padding:18px 20px">
<p style="margin:0;font:700 12px Arial,Helvetica,sans-serif;letter-spacing:.06em;color:#8FD3CC">ONE THING TO DO THIS WEEK</p>
<p style="margin:8px 0 0;font:16px/1.55 Arial,Helvetica,sans-serif;color:#FFFFFF">{_esc(meta.get('one_thing'))}</p>
</td></tr></table></td></tr>"""

    doc = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{_esc(meta.get('title'))}</title></head>
<body style="margin:0;padding:0;background:#E9EDF1">
<table role="presentation" width="100%" style="background:#E9EDF1"><tr><td align="center" style="padding:32px 12px">
<table role="presentation" width="600" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:8px;color:#0E1B2C">
<tr><td style="padding:28px 32px 22px;border-bottom:1px solid #E1E6EB">
<p style="margin:0;font:700 22px Georgia,'Times New Roman',serif">{_esc(site['name'])}</p>
<h1 style="margin:14px 0 0;font:700 28px/1.2 Georgia,'Times New Roman',serif">{_esc(meta.get('title'))}</h1>
<p style="margin:6px 0 0;font:14px Arial,Helvetica,sans-serif;color:#56626F">{_esc(meta.get('date'))} · Data governance, data &amp; AI security and regulation.</p>
</td></tr>
<tr><td style="padding:24px 32px">
<p style="margin:0;font:700 12px Arial,Helvetica,sans-serif;letter-spacing:.06em;color:{accent}">EDITOR'S NOTE</p>
<p style="margin:10px 0 0;font:16px/1.6 Arial,Helvetica,sans-serif;color:#22303F">{_esc(meta.get('editor_note')) or '[Write your note]'}</p>
</td></tr>
{sponsor_html}
<tr><td style="padding:16px 32px 0"><p style="margin:0;font:700 13px Arial,Helvetica,sans-serif;letter-spacing:.08em;text-transform:uppercase">This week</p>
<table role="presentation" width="100%">{''.join(blocks)}</table></td></tr>
{one_thing}
{f'<tr><td style="padding:24px 32px 0"><p style="margin:0;font:700 13px Arial,Helvetica,sans-serif;letter-spacing:.08em;text-transform:uppercase">Tracker updates</p>{tracker_html}</td></tr>' if tracker_html else ''}
<tr><td style="padding:24px 32px 28px;background:#F3F6F8;font:12px/1.7 Arial,Helvetica,sans-serif;color:#56626F">
<p style="margin:0">Researched and drafted with AI assistance, edited and signed by the editor. Sponsors never buy editorial opinion.</p>
<p style="margin:6px 0 0">You receive this email because you subscribed at {_esc(site['base_url'])}. {{{{unsubscribe_link}}}}</p>
</td></tr>
</table></td></tr></table></body></html>"""
    out_dir = cfg.path("newsletter_html")
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / f"{issue_date.isoformat()}.html"
    out.write_text(doc, encoding="utf-8")
    return out
