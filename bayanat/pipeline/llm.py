"""Provider-agnostic LLM access over the OpenAI-compatible chat API.

Every task (triage, summary, watch...) has an ordered list of routes in
config/settings.yaml. A route is skipped when its API key is missing and the
next one is tried on rate limits or errors, so free tiers come first and a
paid model can sit at the end of the chain.
"""

from __future__ import annotations

import json
import logging
import os
import re
import sqlite3
import time
from collections import deque
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Callable

log = logging.getLogger(__name__)


class NoRouteAvailable(RuntimeError):
    """Raised when every route for a task failed or had no API key."""


@dataclass
class Route:
    provider: str
    model: str


def estimate_tokens(text: str) -> int:
    return max(1, len(text) // 4)


class TokenPacer:
    """Sliding one-minute window so free-tier tokens-per-minute limits hold."""

    def __init__(self, tokens_per_minute: int, clock: Callable[[], float] = time.monotonic,
                 sleep: Callable[[float], None] = time.sleep):
        self.limit = tokens_per_minute
        self.clock = clock
        self.sleep = sleep
        self.window: deque[tuple[float, int]] = deque()

    def wait_for(self, tokens: int) -> None:
        tokens = min(tokens, self.limit)
        while True:
            now = self.clock()
            while self.window and now - self.window[0][0] >= 60:
                self.window.popleft()
            used = sum(t for _, t in self.window)
            if used + tokens <= self.limit:
                self.window.append((now, tokens))
                return
            self.sleep(max(0.5, 60 - (now - self.window[0][0])))


def default_client_factory(base_url: str, api_key: str) -> Any:
    from openai import OpenAI
    return OpenAI(base_url=base_url, api_key=api_key, max_retries=1, timeout=90)


def parse_json(text: str) -> Any:
    """Parse a JSON object from a model reply, tolerating code fences and prose."""
    cleaned = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.MULTILINE).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        start, end = cleaned.find("{"), cleaned.rfind("}")
        if start == -1 or end <= start:
            raise
        return json.loads(cleaned[start:end + 1])


class LLMRouter:
    def __init__(self, settings: dict[str, Any], conn: sqlite3.Connection | None = None,
                 client_factory: Callable[[str, str], Any] = default_client_factory,
                 env: dict[str, str] | None = None, sleep: Callable[[float], None] = time.sleep):
        self.providers = settings.get("providers", {})
        self.routes = {task: [Route(**r) for r in routes] for task, routes in settings.get("routes", {}).items()}
        self.conn = conn
        self.client_factory = client_factory
        self.env = env if env is not None else dict(os.environ)
        self.sleep = sleep
        self._clients: dict[str, Any] = {}
        self._pacers: dict[str, TokenPacer] = {}

    def _client(self, provider: str) -> Any | None:
        spec = self.providers.get(provider)
        if not spec:
            return None
        key = self.env.get(spec["api_key_env"])
        if not key:
            return None
        if provider not in self._clients:
            self._clients[provider] = self.client_factory(spec["base_url"], key)
        return self._clients[provider]

    def _pacer(self, route: Route) -> TokenPacer:
        k = f"{route.provider}:{route.model}"
        if k not in self._pacers:
            tpm = self.providers[route.provider].get("tokens_per_minute", 6000)
            self._pacers[k] = TokenPacer(tpm, sleep=self.sleep)
        return self._pacers[k]

    def _log(self, task: str, route: Route, in_tok: int, out_tok: int, ok: bool) -> None:
        if self.conn is None:
            return
        self.conn.execute(
            "INSERT INTO llm_calls (ts, task, provider, model, in_tokens, out_tokens, ok) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (datetime.now(timezone.utc).isoformat(), task, route.provider, route.model, in_tok, out_tok, int(ok)),
        )
        self.conn.commit()

    def complete(self, task: str, system: str, user: str, *, json_mode: bool = True,
                 max_tokens: int = 1200, temperature: float = 0.2) -> tuple[str, Route]:
        routes = self.routes.get(task)
        if not routes:
            raise NoRouteAvailable(f"No routes configured for task '{task}'")
        messages = [{"role": "system", "content": system}, {"role": "user", "content": user}]
        estimate = estimate_tokens(system + user) + max_tokens
        errors = []
        for route in routes:
            client = self._client(route.provider)
            if client is None:
                errors.append(f"{route.provider}: no API key")
                continue
            self._pacer(route).wait_for(estimate)
            kwargs: dict[str, Any] = dict(model=route.model, messages=messages,
                                          max_tokens=max_tokens, temperature=temperature)
            if json_mode:
                kwargs["response_format"] = {"type": "json_object"}
            try:
                try:
                    resp = client.chat.completions.create(**kwargs)
                except Exception as exc:
                    # Some models reject response_format: retry once without it.
                    if json_mode and "response_format" in str(exc):
                        kwargs.pop("response_format")
                        resp = client.chat.completions.create(**kwargs)
                    else:
                        raise
                text = resp.choices[0].message.content or ""
                usage = getattr(resp, "usage", None)
                self._log(task, route, getattr(usage, "prompt_tokens", 0) or 0,
                          getattr(usage, "completion_tokens", 0) or 0, True)
                return text, route
            except Exception as exc:  # rate limit, quota, outage: try the next route
                log.warning("%s via %s/%s failed: %s", task, route.provider, route.model, exc)
                self._log(task, route, 0, 0, False)
                errors.append(f"{route.provider}/{route.model}: {exc}")
        raise NoRouteAvailable(f"Task '{task}' failed on every route: " + " | ".join(errors))

    def complete_json(self, task: str, system: str, user: str, **kw: Any) -> tuple[Any, Route]:
        text, route = self.complete(task, system, user, json_mode=True, **kw)
        return parse_json(text), route
