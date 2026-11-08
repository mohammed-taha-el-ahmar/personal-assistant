#!/usr/bin/env node
// Builds the articles section from docs/articles/*.md:
//
//   articles/index.html          list, newest first
//   articles/<slug>/index.html   one page per article, code highlighted, "Tested in CI" labels
//   articles/rss.xml             feed (published articles only)
//
//   node scripts/build-articles.mjs            published articles only (what goes live)
//   SHOW_DRAFTS=true node scripts/build-articles.mjs   drafts too, marked "Draft" and noindex
//
// Code shown in an article comes from examples/ through `file=` fences (see scripts/lib/articles.mjs),
// and the deploy runs `pytest examples` first: published code is always code that passed.
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Marked } from 'marked';
import { createHighlighter } from 'shiki';
import { escapeHtml, formatDate, includeCode, parseArticle } from './lib/articles.mjs';
import { ctaBand, pageShell, SITE_URL } from './lib/page-shell.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'docs/articles');
const OUT = path.join(root, 'articles');
const SHOW_DRAFTS = process.env.SHOW_DRAFTS === 'true';
const REPO_URL = (process.env.PUBLIC_REPO_URL || '').replace(/\/$/, ''); // optional: links the labels to the code
const LANGS = ['python', 'sql', 'bash', 'shell', 'yaml', 'json', 'javascript', 'typescript', 'toml', 'hcl', 'text'];

const highlighter = await createHighlighter({ themes: ['github-light', 'github-dark'], langs: LANGS });

function codeLabel(inc) {
  const label = escapeHtml(inc.region ? `${inc.rel} · ${inc.region}` : inc.rel);
  const target = REPO_URL ? `<a href="${REPO_URL}/blob/main/${escapeHtml(inc.rel)}">${label}</a>` : `<span>${label}</span>`;
  return `<p class="code-source"><span class="tested" data-i18n="articles.tested">Tested in CI</span> ${target}</p>`;
}

function render(article) {
  const { markdown, includes } = includeCode(article.body, { root, file: `docs/articles/${article.slug}.md` });
  const marked = new Marked({ gfm: true });
  const tokens = marked.lexer(markdown);
  marked.walkTokens(tokens, (token) => {
    if (token.type === 'code') {
      const lang = LANGS.includes(token.lang) ? token.lang : 'text';
      const html = highlighter.codeToHtml(token.text, {
        lang,
        themes: { light: 'github-light', dark: 'github-dark' },
        defaultColor: 'light',
      });
      Object.assign(token, { type: 'html', text: html, raw: html });
    } else if (token.type === 'html') {
      const inc = /^<!--include:(\d+)-->/.exec(token.text.trim());
      if (inc) Object.assign(token, { text: codeLabel(includes[Number(inc[1])]) });
    }
  });
  return marked.parser(tokens);
}

function articlePage(a) {
  const tags = a.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('');
  const draft = a.status === 'draft' ? '<span class="draft-badge">Draft</span>' : '';
  const body = `      <article lang="en">
        <header class="page-header">
          ${tags ? `<div class="tags">${tags}</div>` : ''}
          <h1>${escapeHtml(a.title)}${draft}</h1>
          <p class="lede">${escapeHtml(a.description)}</p>
          <div class="byline">
            <span>Mohammed Taha EL AHMAR</span>
            <time datetime="${a.date.toISOString()}">${formatDate(a.date)}</time>
            ${a.updated ? `<span>Updated ${formatDate(a.updated)}</span>` : ''}
            <span>${a.minutes} min read</span>
          </div>
        </header>
        <div class="prose">
${render(a)}
        </div>
      </article>
${ctaBand('../../')}`;
  return pageShell({
    pre: '../../',
    path: `/articles/${a.slug}/`,
    title: a.title,
    description: a.description,
    body,
    noindex: a.status === 'draft',
    type: 'article',
  });
}

function indexPage(articles) {
  const list = articles.length
    ? `      <ol class="article-list">
${articles
  .map(
    (a) => `        <li>
          <time datetime="${a.date.toISOString()}">${formatDate(a.date)}</time>
          <div>
            <h2><a href="${a.slug}/">${escapeHtml(a.title)}</a>${a.status === 'draft' ? '<span class="draft-badge">Draft</span>' : ''}</h2>
            <p>${escapeHtml(a.description)}</p>
          </div>
        </li>`,
  )
  .join('\n')}
      </ol>`
    : `      <p class="card empty-state" data-i18n="articles.empty">The first articles are being written. Meanwhile, ask the assistant or browse the projects.</p>`;
  const body = `      <header class="page-header">
        <div class="badge"><span class="badge-dot"></span> <span data-i18n="articles.badge">Writing</span></div>
        <h1 data-i18n="articles.title">Articles</h1>
        <p class="lede" data-i18n="articles.intro">Data engineering, data architecture and AI, written from production work. The code in every article is tested before it is published.</p>
      </header>
${list}
${ctaBand('../')}`;
  return pageShell({
    pre: '../',
    path: '/articles/',
    title: 'Articles',
    description: 'Articles on data engineering, data architecture and AI, with tested code.',
    body,
  });
}

function rss(articles) {
  const items = articles
    .filter((a) => a.status === 'published')
    .map(
      (a) => `  <item>
    <title>${escapeHtml(a.title)}</title>
    <link>${SITE_URL}/articles/${a.slug}/</link>
    <guid>${SITE_URL}/articles/${a.slug}/</guid>
    <pubDate>${a.date.toUTCString()}</pubDate>
    <description>${escapeHtml(a.description)}</description>
  </item>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>Mohammed Taha EL AHMAR — Articles</title>
  <link>${SITE_URL}/articles/</link>
  <description>Data engineering, data architecture and AI, with tested code.</description>
  <language>en</language>
${items}
</channel></rss>
`;
}

async function loadArticles({ includeDrafts }) {
  let files = [];
  try {
    files = (await readdir(SRC)).filter((f) => f.endsWith('.md'));
  } catch {
    /* no articles folder yet */
  }
  const all = await Promise.all(
    files.map(async (f) => parseArticle(await readFile(path.join(SRC, f), 'utf8'), `docs/articles/${f}`)),
  );
  return all
    .filter((a) => includeDrafts || a.status === 'published')
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

const articles = await loadArticles({ includeDrafts: SHOW_DRAFTS });
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
for (const a of articles) {
  await mkdir(path.join(OUT, a.slug), { recursive: true });
  await writeFile(path.join(OUT, a.slug, 'index.html'), articlePage(a));
}
await writeFile(path.join(OUT, 'index.html'), indexPage(articles));
await writeFile(path.join(OUT, 'rss.xml'), rss(articles));
console.log(
  `Wrote articles/: ${articles.length} article(s)${SHOW_DRAFTS ? ' (drafts included)' : ''}, index and RSS feed.`,
);
