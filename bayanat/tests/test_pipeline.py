"""End-to-end and unit tests. No network, no API keys: feeds and models are faked."""

from __future__ import annotations

import json
import shutil
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace

import pytest
import yaml

from pipeline import check, collect, drafts, newsletter, prefilter, triage, watch
from pipeline.config import load_config
from pipeline.content import read_markdown, write_markdown
from pipeline.db import connect
from pipeline.llm import LLMRouter, NoRouteAvailable, TokenPacer, parse_json

REPO = Path(__file__).resolve().parent.parent
TODAY = datetime.now(timezone.utc)


def rss(entries: list[tuple[str, str, str]]) -> bytes:
    stamp = TODAY.strftime("%a, %d %b %Y %H:%M:%S +0000")
    items = "".join(
        f"<item><title>{t}</title><link>{u}</link><description>{d}</description><pubDate>{stamp}</pubDate></item>"
        for t, u, d in entries
    )
    return f'<?xml version="1.0"?><rss version="2.0"><channel><title>t</title>{items}</channel></rss>'.encode()


FEEDS = {
    "https://feed.test/gov": rss([
        ("Data contracts and lineage in Unity Catalog", "https://feed.test/a?utm_source=x", "A release adds data contract checks and lineage for governance teams."),
        ("Data contracts & lineage in Unity Catalog!", "https://feed.test/a-copy", "Same story, different URL."),
        ("Office party photos", "https://feed.test/party", "Nothing relevant here."),
    ]),
    "https://feed.test/sec": rss([
        ("Prompt injection exfiltration through a data catalog", "https://feed.test/b", "Researchers show prompt injection leading to data exfiltration."),
    ]),
    "https://feed.test/kev": json.dumps({"vulnerabilities": [
        {"cveID": "CVE-2026-0001", "vendorProject": "DataCo", "product": "Catalog", "vulnerabilityName": "Access control bypass",
         "dateAdded": TODAY.strftime("%Y-%m-%d"), "shortDescription": "Improper access control allows data exfiltration."},
        {"cveID": "CVE-2019-0001", "vendorProject": "Old", "product": "Thing", "vulnerabilityName": "Old bug",
         "dateAdded": "2019-01-01", "shortDescription": "Too old."},
    ]}).encode(),
    "https://watch.test/page": b"<html><body><nav>menu</nav><p>Status: bill in Parliament</p></body></html>",
}


def fake_fetch(url: str) -> bytes:
    return FEEDS[url]


@pytest.fixture()
def cfg(tmp_path, monkeypatch):
    shutil.copytree(REPO / "config", tmp_path / "config")
    (tmp_path / "config" / "sources.yaml").write_text(yaml.safe_dump({"sources": [
        {"id": "gov", "name": "Gov feed", "type": "rss", "kind": "open_source", "url": "https://feed.test/gov"},
        {"id": "sec", "name": "Sec feed", "type": "rss", "kind": "research", "url": "https://feed.test/sec"},
        {"id": "kev", "name": "KEV", "type": "cisa_kev", "kind": "advisory", "url": "https://feed.test/kev"},
        {"id": "broken", "name": "Broken", "type": "rss", "kind": "media", "url": "https://feed.test/missing"},
    ]}))
    (tmp_path / "config" / "watch.yaml").write_text(yaml.safe_dump({"pages": [
        {"id": "nis2", "name": "NIS2 status", "jurisdiction": "FR", "url": "https://watch.test/page"}]}))
    monkeypatch.setenv("BAYANAT_ROOT", str(tmp_path))
    return load_config()


class FakeCompletions:
    def __init__(self, behaviour):
        self.behaviour = behaviour
        self.calls = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        content = self.behaviour(kwargs)
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=content))],
                               usage=SimpleNamespace(prompt_tokens=100, completion_tokens=50))


def smart_model(kwargs):
    system, user = kwargs["messages"][0]["content"], kwargs["messages"][1]["content"]
    if "triage editor" in system:
        items = json.loads(user)["items"]
        return json.dumps({"results": [
            {"id": it["id"], "pillar": "security" if "injection" in it["title"].lower() or "CVE" in it["title"] else "governance",
             "relevance": 85, "named_incident": "CVE" in it["title"], "reason": "on topic"} for it in items]})
    if "draft newsletter items" in system:
        title = json.loads(user)["title"]
        return "```json\n" + json.dumps({"usable": True, "headline": f"Rewritten: {title}"[:90],
                                         "summary": "A short factual summary.", "why_it_matters": "It matters.",
                                         "facts_to_check": ["version number"]}) + "\n```"
    if "monitor official pages" in system:
        return json.dumps({"material": True, "headline": "NIS2 France: bill moves to the Senate",
                           "what_changed": "Status changed.", "facts_to_check": ["date"]})
    raise AssertionError("unexpected prompt")


def make_router(cfg, conn, behaviour=smart_model, env=None):
    clients = {}

    def factory(base_url, key):
        clients[base_url] = SimpleNamespace(chat=SimpleNamespace(completions=FakeCompletions(behaviour)))
        return clients[base_url]

    router = LLMRouter(cfg.settings, conn, client_factory=factory,
                       env=env if env is not None else {"GROQ_API_KEY": "k", "GEMINI_API_KEY": "k"},
                       sleep=lambda s: None)
    return router, clients


def test_full_flow(cfg):
    conn = connect(cfg.path("database"))
    totals = collect.run(cfg, conn, fake_fetch)
    assert totals == {"sources": 3, "failed": 1, "new": 4, "duplicates": 1}

    pf = prefilter.run(cfg, conn)
    assert pf["kept"] == 3 and pf["filtered_out"] == 1  # the party photos are dropped

    router, _ = make_router(cfg, conn)
    tr = triage.run(cfg, conn, router)
    assert tr["triaged"] == 3

    dr = drafts.run(cfg, conn, router)
    assert dr["drafts"] == 3
    brief_dir = cfg.path("content") / "en" / "brief"
    files = sorted(brief_dir.glob("*.md"))
    metas = [read_markdown(p)[0] for p in files]
    assert all(m["status"] == "draft" and m["my_take"] == "" for m in metas)
    cve = next(m for m in metas if "CVE" in m["title"])
    assert cve["named_incident"] is True and cve["needs_primary_source"] is False  # advisory = primary

    # Drafts pass checks; approving without a take fails; with a take passes.
    assert check.run(cfg) == {}
    meta, body = read_markdown(files[0])
    meta["status"] = "approved"
    write_markdown(files[0], meta, body)
    assert "approved brief needs your 'my_take'" in next(iter(check.run(cfg).values()))
    meta["my_take"] = "Worth a look for catalog owners."
    write_markdown(files[0], meta, body)
    assert check.run(cfg) == {}

    issue = newsletter.draft(cfg, date.today())
    issue_meta, _ = read_markdown(issue)
    assert issue_meta["items"] == [files[0].stem] and issue_meta["issue"] == 1
    issue_meta["editor_note"] = "Hello <readers> & friends"
    write_markdown(issue, issue_meta)
    html_out = newsletter.render(cfg, date.today()).read_text()
    assert "Worth a look for catalog owners." in html_out
    assert "Hello &lt;readers&gt; &amp; friends" in html_out  # escaped
    assert "Georgia" in html_out and "Inter" not in html_out   # email-safe fonts


def test_lost_database_does_not_redraft(cfg):
    for attempt in range(2):  # second pass simulates an evicted cache: fresh database
        db = cfg.root / f"data/run{attempt}.db"
        conn = connect(db)
        collect.run(cfg, conn, fake_fetch)
        prefilter.run(cfg, conn)
        router, _ = make_router(cfg, conn)
        triage.run(cfg, conn, router)
        result = drafts.run(cfg, conn, router)
        assert result["drafts"] == (3 if attempt == 0 else 0)


def test_cli_check_and_dotenv(cfg, monkeypatch):
    from pipeline.__main__ import load_dotenv, main
    (cfg.root / ".env").write_text("GROQ_API_KEY=abc\nEMPTY=\n# comment\n")
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    load_dotenv(cfg.root / ".env")
    import os
    assert os.environ["GROQ_API_KEY"] == "abc" and "EMPTY" not in os.environ
    assert main(["check"]) == 0


def test_canonical_url_and_dedupe():
    assert collect.canonical_url("HTTPS://Feed.test/a/?utm_source=x&id=2#top") == "https://feed.test/a?id=2"
    assert collect.item_id("https://feed.test/a?utm_medium=y") == collect.item_id("https://feed.test/a")


def test_prefilter_whole_word_acronyms():
    pillars = {"llm": {"terms": {"rag": 2}}}
    assert prefilter.score_text("RAG on governed data", "", pillars) == (4, "llm")
    assert prefilter.score_text("Storage upgrade", "a dragon appears", pillars) == (0, None)


def test_router_falls_back_and_skips_missing_keys(cfg):
    conn = connect(cfg.path("database"))

    def flaky(kwargs):
        if kwargs["model"].startswith("openai/"):
            raise RuntimeError("429 rate limit")
        return '{"ok": true}'

    router, _ = make_router(cfg, conn, flaky)
    data, route = router.complete_json("triage", "s", "u")
    assert data == {"ok": True} and route.provider == "gemini"

    router, _ = make_router(cfg, conn, flaky, env={})  # no keys at all
    with pytest.raises(NoRouteAvailable):
        router.complete("triage", "s", "u")
    failures = conn.execute("SELECT COUNT(*) FROM llm_calls WHERE ok = 0").fetchone()[0]
    assert failures == 1


def test_router_retries_without_response_format(cfg):
    conn = connect(cfg.path("database"))

    def picky(kwargs):
        if "response_format" in kwargs:
            raise RuntimeError("response_format is not supported by this model")
        return '{"ok": 1}'

    router, _ = make_router(cfg, conn, picky)
    assert router.complete_json("summary", "s", "u")[0] == {"ok": 1}


def test_token_pacer_waits_when_budget_exhausted():
    clock = [0.0]
    slept = []
    pacer = TokenPacer(1000, clock=lambda: clock[0], sleep=lambda s: (slept.append(s), clock.__setitem__(0, clock[0] + s)))
    pacer.wait_for(800)
    pacer.wait_for(300)  # exceeds the minute budget: must wait
    assert slept and sum(slept) >= 59


def test_parse_json_tolerates_prose():
    assert parse_json('Sure! Here it is: {"a": 1} hope that helps') == {"a": 1}


def test_watch_baseline_then_change(cfg):
    conn = connect(cfg.path("database"))
    router, _ = make_router(cfg, conn)
    first = watch.run(cfg, conn, router, fake_fetch)
    assert first["baseline"] == 1 and first["drafts"] == 0
    assert watch.run(cfg, conn, router, fake_fetch)["unchanged"] == 1
    FEEDS["https://watch.test/page"] = b"<html><body><p>Status: bill in the Senate</p></body></html>"
    third = watch.run(cfg, conn, router, fake_fetch)
    assert third["drafts"] == 1
    note = next((cfg.path("content") / "en" / "tracker-updates").glob("*.md"))
    assert read_markdown(note)[0]["status"] == "draft"
    assert "nav" not in watch.page_text(b"<nav>menu</nav><p>x</p>")
