// Articles: Markdown in docs/articles/ → static pages in articles/, styled like the rest of the site.
// Pure functions live here so they can be unit-tested; scripts/build-articles.mjs does the I/O.
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const FRONT = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
const STATUSES = new Set(['draft', 'published']);

export function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Parse front matter + body; throws with a clear message when a required field is missing. */
export function parseArticle(text, file) {
  const match = FRONT.exec(text);
  if (!match) throw new Error(`${file}: missing front matter (--- … ---)`);
  const meta = yaml.load(match[1]) ?? {};
  const errors = [];
  for (const field of ['title', 'description', 'date']) if (!meta[field]) errors.push(`missing "${field}"`);
  const status = meta.status ?? 'draft';
  if (!STATUSES.has(status)) errors.push(`status must be draft or published, got "${status}"`);
  const date = meta.date instanceof Date ? meta.date : new Date(meta.date);
  if (meta.date && Number.isNaN(date.getTime())) errors.push(`invalid date "${meta.date}"`);
  if (errors.length) throw new Error(`${file}: ${errors.join('; ')}`);
  const body = match[2].trim();
  const words = body.split(/\s+/).filter(Boolean).length;
  return {
    slug: path.basename(file, '.md'),
    title: String(meta.title),
    description: String(meta.description),
    date,
    updated: meta.updated ? new Date(meta.updated) : null,
    tags: (meta.tags ?? []).map(String),
    status,
    minutes: Number(meta.reading_minutes) || Math.max(1, Math.round(words / 220)),
    body,
  };
}

function dedent(text) {
  const lines = text.replace(/^\n+/, '').replace(/\s+$/, '').split('\n');
  const indents = lines.filter((l) => l.trim()).map((l) => /^[ \t]*/.exec(l)[0].length);
  const cut = indents.length ? Math.min(...indents) : 0;
  return lines.map((l) => l.slice(cut)).join('\n');
}

function extractRegion(source, region, rel) {
  const marker = String.raw`^[ \t]*(?:#|//|--)\s*`;
  const re = new RegExp(`${marker}region ${region}\\s*$([\\s\\S]*?)${marker}endregion\\b`, 'm');
  const match = re.exec(source);
  if (!match) throw new Error(`Region "${region}" not found in ${rel}`);
  return match[1];
}

/**
 * Replace fenced blocks that point at a file with the file's content:
 *   ```python file=examples/<slug>/module.py#region
 *   ```
 * Returns the new Markdown and the list of includes (for the "Tested in CI" labels).
 * A missing file or region throws, so the build fails instead of showing stale code.
 */
export function includeCode(markdown, { root, file }) {
  const includes = [];
  const out = markdown.replace(/^```(\S*)[ \t]+file=(\S+)[^\n]*\n([\s\S]*?)^```[ \t]*$/gm, (_all, lang, ref) => {
    const [rel, region] = ref.split('#');
    const abs = path.resolve(root, rel);
    if (!abs.startsWith(root + path.sep)) throw new Error(`${file}: code include outside the repository: ${rel}`);
    if (!fs.existsSync(abs)) throw new Error(`${file}: code include not found: ${rel}`);
    const source = fs.readFileSync(abs, 'utf8');
    const code = dedent(region ? extractRegion(source, region, rel) : source);
    includes.push({ rel, region: region ?? null });
    return `<!--include:${includes.length - 1}-->\n\n\`\`\`${lang}\n${code}\n\`\`\``;
  });
  return { markdown: out, includes };
}

export function formatDate(d) {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}
