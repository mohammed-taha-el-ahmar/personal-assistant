import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chunkMarkdown, projectChunks } from './chunk.mjs';

test('headings and bold lines become title paths; tiny intro sections fold into children', () => {
  const md = `# Doc\n\n## Role A\n**Senior Engineer**, Paris\n\n### Project 1\n- did x\n- did y\n\n## FAQ\n\n**Is he remote?**\nYes, hybrid.\n`;
  const chunks = chunkMarkdown('d', md, { label: 'Doc', pinned: ['Role A › Project 1'] });
  assert.deepEqual(
    chunks.map((c) => c.title),
    ['Role A › Project 1', 'FAQ › Is he remote?'],
  );
  assert.match(chunks[0].text, /Senior Engineer/);
  assert.equal(chunks[0].pinned, true);
});

test('long sections are split under the word limit', () => {
  const md = `## Big\n${Array.from({ length: 60 }, (_, i) => `- item number ${i} with some words`).join('\n')}`;
  const chunks = chunkMarkdown('d', md, { label: 'Doc', maxWords: 50 });
  assert.ok(chunks.length > 3);
  for (const c of chunks) assert.ok(c.text.split(/\s+/).length <= 60);
});

test('projects become overview + design chunks linking to their card', () => {
  const chunks = projectChunks({
    id: 'p1',
    title: 'P',
    value: 'v',
    tags: ['Kafka'],
    architecture: 'A → B',
    decisions: ['d1'],
  });
  assert.equal(chunks.length, 2);
  assert.ok(chunks.every((c) => c.href === 'projects.html#p1'));
});
