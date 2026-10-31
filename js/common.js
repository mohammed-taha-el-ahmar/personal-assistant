// Shared helpers used by every page: DOM builder, config-driven links, theme toggle.
import { LINKS, EMAIL } from './config.js';
import { applyI18n, initLangToggle } from './i18n.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Tiny DOM builder. Text is always set via textContent (never innerHTML).
 *   el('a', { class: 'x', href: '/' }, 'label', otherNode)
 */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2), value);
    } else if (key in node && typeof value !== 'string') node[key] = value;
    else node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

/**
 * Build an inline SVG icon from trusted, hard-coded path markup (see icons.js).
 */
export function svgIcon(inner, { size = 16, cls = '', fill = 'none' } = {}) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', fill);
  if (fill === 'none') {
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
  }
  svg.setAttribute('aria-hidden', 'true');
  if (cls) svg.setAttribute('class', cls);
  svg.innerHTML = inner; // trusted constant markup only
  return svg;
}

let calNotes = '';

/** Booking URL, with the chat context pre-filled in Cal.com's "notes" field when available. */
export function calLink() {
  if (!calNotes) return LINKS.cal;
  const url = new URL(LINKS.cal);
  url.searchParams.set('notes', calNotes);
  return url.toString();
}

/** Update every booking link on the page with new notes (called by the chat). */
export function setCalNotes(notes) {
  calNotes = notes;
  for (const node of document.querySelectorAll('[data-link="cal"], a[data-cal]')) node.href = calLink();
}

/** Rewrite every [data-link] element from config so links live in one place. */
export function applyLinks(root = document) {
  for (const node of root.querySelectorAll('[data-link]')) {
    const href = node.dataset.link === 'cal' ? calLink() : LINKS[node.dataset.link];
    if (!href) continue; // e.g. CV not published yet → stays hidden
    node.href = href;
    node.hidden = false;
    if (node.hasAttribute('data-link-text')) node.textContent = EMAIL;
  }
}

/** Header theme toggle: cycles light ↔ dark and remembers the choice. */
export function initThemeToggle() {
  const btn = document.querySelector('.theme-toggle');
  if (!btn) return;
  const root = document.documentElement;
  const isDark = () =>
    root.dataset.theme ? root.dataset.theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;

  const sync = () => btn.setAttribute('aria-pressed', String(isDark()));
  sync();

  btn.addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    root.dataset.theme = next;
    try {
      localStorage.setItem('theme', next);
    } catch {
      /* private mode — theme still applies for this visit */
    }
    sync();
  });
}

export async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

export function initPage() {
  applyI18n();
  initLangToggle();
  applyLinks();
  initThemeToggle();
}
