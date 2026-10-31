import { test } from 'node:test';
import assert from 'node:assert/strict';
import { retrieve, bm25 } from '../src/retrieval.js';
import { queryTokens } from '../src/text.js';
import KB from '../src/generated/kb.js';

const topIds = async (q, n = 4) => (await retrieve(q, { budget: 1800 })).chunks.slice(0, n).map((c) => c.id);

test('knowledge base chunks are small, unique and titled', () => {
  const ids = new Set(KB.chunks.map((c) => c.id));
  assert.equal(ids.size, KB.chunks.length);
  for (const c of KB.chunks) {
    assert.ok(c.title && c.text, c.id);
    assert.ok(c.text.length / 4 < 260, `${c.id} is too large for small-context models`);
  }
});

test('the profile chunk is always included first', async () => {
  const { chunks } = await retrieve('Kafka');
  assert.equal(chunks[0].id, 'resume:profile');
});

test('retrieval stays within the token budget', async () => {
  for (const budget of [300, 800, 1800]) {
    const { tokens } = await retrieve("What's his main tech stack?", { budget });
    assert.ok(tokens <= budget, `${tokens} > ${budget}`);
  }
});

const cases = [
  ["What's his main tech stack?", 'resume:core-skills'],
  ['Quelle est sa stack technique principale ?', 'resume:core-skills'],
  ['Is he open to remote work?', 'faq:is-he-open-to-remote-work'],
  ['Which certifications does he have?', 'resume:certifications'],
  ['Tell me about the IncidentCouncil project', 'portfolio:incident-council'],
  ['What did he do at Toyota?', 'resume:toyota-1-year'],
  ['Has he worked with Kafka?', 'portfolio:kafka'],
  // French questions must reach English documents
  ['Quelles sont ses prétentions salariales ?', 'faq:what-are-his-salary-expectations'],
  ['Est-il ouvert au télétravail ?', 'faq:is-he-open-to-remote-work'],
  ['Quel est son préavis ?', 'faq:what-is-his-notice-period'],
  ['Quelles langues parle-t-il ?', 'resume:languages'],
  ['Quelle est sa formation ? diplôme', 'resume:education'],
];
for (const [q, expected] of cases) {
  test(`retrieves ${expected} for "${q}"`, async () => {
    assert.ok((await topIds(q)).includes(expected), `${expected} not in ${await topIds(q)}`);
  });
}

test('French terms expand to English', () => {
  assert.ok(queryTokens('télétravail').includes('remote'));
  assert.ok(queryTokens('salaire').includes('salary'));
});

test('unrelated query returns no lexical matches', () => {
  assert.equal(bm25('zzqx blorf').length, 0);
});
