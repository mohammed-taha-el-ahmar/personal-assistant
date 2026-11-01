// Shared helpers.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

export const params = () => new URLSearchParams(location.search);

export const genPin = () => String(Math.floor(100000 + Math.random() * 900000));

// Answer key used in RTDB paths: gameAnswers/{pin}/q0, q1 …
export const qKey = (index) => `q${index}`;

// How long the question is shown alone before answers open.
export const INTRO_MS = 4000;

// Show the element whose data-view matches, hide the others.
export function showView(name) {
  $$("[data-view]").forEach((el) => { el.hidden = el.dataset.view !== name; });
}

export function toast(message, ms = 2600) {
  const el = document.createElement("div");
  el.className = "toast";
  el.setAttribute("role", "status");
  el.textContent = message;
  document.body.append(el);
  setTimeout(() => el.remove(), ms);
}

// Announce a message to screen readers through a visually hidden live region.
export function announce(message) {
  let live = $("#sr-live");
  if (!live) {
    live = document.createElement("div");
    live.id = "sr-live";
    live.className = "sr-only";
    live.setAttribute("aria-live", "assertive");
    document.body.append(live);
  }
  live.textContent = "";
  setTimeout(() => { live.textContent = message; }, 50);
}

export const vibrate = (pattern) => { try { navigator.vibrate?.(pattern); } catch { /* unsupported */ } };

// Kahoot-style shapes, one per answer slot. Colour is never the only cue.
export const SHAPES = [
  '<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false"><path d="M20 4 37 34H3z" fill="#fff"/></svg>',
  '<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false"><path d="M20 2 38 20 20 38 2 20z" fill="#fff"/></svg>',
  '<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false"><circle cx="20" cy="20" r="17" fill="#fff"/></svg>',
  '<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false"><rect x="4" y="4" width="32" height="32" rx="3" fill="#fff"/></svg>',
];

// Points: full value for an instant answer, half value at the buzzer.
export function computePoints(question, answer, startedAt) {
  if (!answer || !question.correct.includes(answer.choice)) return 0;
  const limit = question.timeLimit;
  const seconds = Math.min(Math.max((answer.at - startedAt) / 1000, 0), limit);
  return Math.round(question.points * (1 - (seconds / limit) / 2));
}

// Streak bonus: +100 per consecutive correct answer after the first, capped at +500.
export const streakBonus = (streak) => (streak >= 2 ? Math.min((streak - 1) * 100, 500) : 0);

export function rankPlayers(players) {
  return Object.entries(players || {})
    .filter(([, p]) => p && p.nickname)
    .map(([uid, p]) => ({ uid, ...p, score: p.score || 0 }))
    .sort((a, b) => b.score - a.score);
}

export function median(values) {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function downloadCSV(filename, rows) {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = rows.map((r) => r.map(esc).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
