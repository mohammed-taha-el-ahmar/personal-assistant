// Minimal, XSS-safe Markdown renderer for assistant replies.
// Supports: paragraphs, line breaks, - / * / 1. lists, **bold**, *italic*, `code`,
// [text](url) and bare URLs. Everything is built with DOM nodes — no innerHTML.
import { el } from './common.js';

const INLINE_RE =
  /(\*\*([^*]+)\*\*)|(`([^`]+)`)|(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))|(https?:\/\/[^\s<>"')\]]+)|(\*([^*\s][^*]*)\*)/g;

function link(href, text) {
  // Trailing punctuation is usually sentence punctuation, not part of the URL.
  const clean = href.replace(/[.,;:!?]+$/, '');
  const trailing = href.slice(clean.length);
  const a = el('a', { href: clean, target: '_blank', rel: 'noopener noreferrer' }, text ?? clean);
  return trailing ? [a, document.createTextNode(trailing)] : [a];
}

export function renderInline(text) {
  const out = [];
  let last = 0;
  for (const m of text.matchAll(INLINE_RE)) {
    if (m.index > last) out.push(document.createTextNode(text.slice(last, m.index)));
    if (m[1]) out.push(el('strong', {}, ...renderInline(m[2])));
    else if (m[3]) out.push(el('code', {}, m[4]));
    else if (m[5]) out.push(...link(m[7], m[6]));
    else if (m[8]) out.push(...link(m[8]));
    else if (m[9]) out.push(el('em', {}, m[10]));
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(document.createTextNode(text.slice(last)));
  return out;
}

function withBreaks(lines) {
  const nodes = [];
  lines.forEach((line, i) => {
    if (i) nodes.push(el('br'));
    nodes.push(...renderInline(line));
  });
  return nodes;
}

/** Render Markdown text into a DocumentFragment. */
export function renderMarkdown(text) {
  const frag = document.createDocumentFragment();
  const blocks = text
    .replace(/\r\n/g, '\n')
    .trim()
    .split(/\n{2,}/);

  for (const block of blocks) {
    const lines = block.split('\n');
    const bullet = /^\s*[-*•]\s+/;
    const ordered = /^\s*\d+[.)]\s+/;

    if (lines.every((l) => bullet.test(l) || ordered.test(l))) {
      const list = el(ordered.test(lines[0]) ? 'ol' : 'ul');
      for (const l of lines) list.append(el('li', {}, ...renderInline(l.replace(bullet, '').replace(ordered, ''))));
      frag.append(list);
      continue;
    }

    // A paragraph line followed by list items ("Here's the stack:\n- a\n- b")
    const firstItem = lines.findIndex((l) => bullet.test(l) || ordered.test(l));
    if (firstItem > 0 && lines.slice(firstItem).every((l) => bullet.test(l) || ordered.test(l))) {
      frag.append(el('p', {}, ...withBreaks(lines.slice(0, firstItem))));
      const list = el(ordered.test(lines[firstItem]) ? 'ol' : 'ul');
      for (const l of lines.slice(firstItem)) {
        list.append(el('li', {}, ...renderInline(l.replace(bullet, '').replace(ordered, ''))));
      }
      frag.append(list);
      continue;
    }

    const heading = /^#{1,6}\s+(.*)$/.exec(lines[0]);
    if (heading && lines.length === 1) {
      frag.append(el('p', {}, el('strong', {}, ...renderInline(heading[1]))));
      continue;
    }

    frag.append(el('p', {}, ...withBreaks(lines)));
  }
  return frag;
}
