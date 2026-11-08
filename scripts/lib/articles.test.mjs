import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { escapeHtml, includeCode, parseArticle } from './articles.mjs';

const ARTICLE = `---
title: "A title"
description: Short description
date: 2026-11-07
tags: [data quality]
---

Body text with enough words.`;

test('parseArticle reads front matter, defaults to draft and estimates reading time', () => {
  const a = parseArticle(ARTICLE, 'docs/articles/a-title.md');
  assert.equal(a.slug, 'a-title');
  assert.equal(a.status, 'draft');
  assert.deepEqual(a.tags, ['data quality']);
  assert.equal(a.minutes, 1);
  assert.equal(a.date.toISOString().slice(0, 10), '2026-11-07');
});

test('parseArticle rejects missing fields and unknown statuses', () => {
  assert.throws(() => parseArticle('no front matter', 'x.md'), /missing front matter/);
  assert.throws(() => parseArticle('---\ntitle: T\n---\nbody', 'x.md'), /missing "description".*missing "date"/);
  assert.throws(
    () => parseArticle('---\ntitle: T\ndescription: D\ndate: 2026-01-01\nstatus: live\n---\n', 'x.md'),
    /status must be draft or published/,
  );
});

function repoWithExample() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'articles-'));
  fs.mkdirSync(path.join(root, 'examples/demo'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'examples/demo/mod.py'),
    'import x\n\n# region core\n    def f():\n        return 1\n# endregion\n\nprint("rest")\n',
  );
  return root;
}

test('includeCode inlines a region, dedented, and records it for the label', () => {
  const root = repoWithExample();
  const md = 'Intro\n\n```python file=examples/demo/mod.py#core\n```\n\nAfter';
  const { markdown, includes } = includeCode(md, { root, file: 'a.md' });
  assert.match(markdown, /<!--include:0-->\n\n```python\ndef f\(\):\n {4}return 1\n```/);
  assert.doesNotMatch(markdown, /import x|print/);
  assert.deepEqual(includes, [{ rel: 'examples/demo/mod.py', region: 'core' }]);
});

test('includeCode inlines a whole file and leaves normal code blocks alone', () => {
  const root = repoWithExample();
  const md = '```python file=examples/demo/mod.py\n```\n\n```sql\nSELECT 1\n```';
  const { markdown, includes } = includeCode(md, { root, file: 'a.md' });
  assert.match(markdown, /import x[\s\S]*print\("rest"\)/);
  assert.match(markdown, /```sql\nSELECT 1\n```/);
  assert.equal(includes.length, 1);
});

test('includeCode fails loudly on a missing file, a missing region or a path outside the repo', () => {
  const root = repoWithExample();
  const run = (ref) => includeCode(`\`\`\`python file=${ref}\n\`\`\``, { root, file: 'a.md' });
  assert.throws(() => run('examples/demo/nope.py'), /not found/);
  assert.throws(() => run('examples/demo/mod.py#nope'), /Region "nope" not found/);
  assert.throws(() => run('../etc/passwd'), /outside the repository/);
});

test('escapeHtml escapes markup characters', () => {
  assert.equal(escapeHtml('<a href="x">&</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
});
