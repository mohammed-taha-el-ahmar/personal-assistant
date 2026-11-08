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

// Free plan player cap shown on the pricing page. Not enforced yet: reaching it logs an
// upgrade signal (Firestore upgradeSignals) and shows the host a note about paid plans.
export const FREE_PLAYER_LIMIT = 25;

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

// Answer shapes, one per slot: drop, star, moon, bolt. Colour is never the only cue.
const svg = (d) => `<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false"><path d="${d}" fill="#fff"/></svg>`;
export const SHAPES = [
  svg("M20 3C16 9 8 17.5 8 25a12 12 0 0 0 24 0C32 17.5 24 9 20 3z"),
  svg("M20 3.5 24.5 14.9 36.6 15.6 27.2 23.3 30.3 35.2 20 28.6 9.7 35.2 12.8 23.3 3.4 15.6 15.5 14.9z"),
  svg("M25.5 4.5A16 16 0 1 0 35.5 27 13 13 0 0 1 25.5 4.5z"),
  svg("M24 3 8 23h10l-4 14 18-21H21.5z"),
];

// Scoring lives with the question types.
export { computePoints } from "./questions.js";

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
