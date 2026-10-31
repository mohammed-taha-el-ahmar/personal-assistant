// Retrieval over the bundled knowledge base: BM25 (title-boosted), optional semantic re-ranking
// with Workers AI embeddings, then packing chunks into a fixed token budget.
import KB from './generated/kb.js';
import { tokenize, queryTokens, estimateTokens } from './text.js';
import { semanticScores } from './embeddings.js';

const K1 = 1.2;
const B = 0.75;
const TITLE_BOOST = 2; // title tokens are counted this many extra times

let INDEX = null;

function buildIndex(chunks) {
  const docs = chunks.map((c) => {
    const titleTokens = tokenize(c.title);
    const tokens = [...tokenize(c.text), ...Array.from({ length: TITLE_BOOST }, () => titleTokens).flat()];
    const tf = new Map();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    return { chunk: c, tf, len: tokens.length };
  });
  const df = new Map();
  for (const d of docs) for (const t of d.tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  const avgLen = docs.reduce((n, d) => n + d.len, 0) / docs.length;
  return { docs, df, avgLen, N: docs.length };
}

export function getIndex() {
  INDEX ??= buildIndex(KB.chunks);
  return INDEX;
}

/** BM25 score for every chunk. Returns [{ chunk, score }] sorted desc (score > 0 only). */
export function bm25(query, index = getIndex()) {
  const terms = [...new Set(queryTokens(query))];
  const results = [];
  for (const d of index.docs) {
    let score = 0;
    for (const t of terms) {
      const f = d.tf.get(t);
      if (!f) continue;
      const n = index.df.get(t);
      const idf = Math.log(1 + (index.N - n + 0.5) / (n + 0.5));
      score += idf * ((f * (K1 + 1)) / (f + K1 * (1 - B + (B * d.len) / index.avgLen)));
    }
    if (score > 0) results.push({ chunk: d.chunk, score });
  }
  return results.sort((a, b) => b.score - a.score);
}

/** Reciprocal-rank fusion of several ranked lists of chunks. */
function fuse(lists, k = 60) {
  const scores = new Map();
  for (const list of lists) {
    list.forEach((item, rank) => {
      const prev = scores.get(item.chunk.id) ?? { chunk: item.chunk, score: 0 };
      prev.score += 1 / (k + rank + 1);
      scores.set(item.chunk.id, prev);
    });
  }
  return [...scores.values()].sort((a, b) => b.score - a.score);
}

/**
 * Pick the chunks to send to the model.
 *  - `query`: what to search for (latest question, plus the previous one for follow-ups)
 *  - `budget`: max tokens of context
 *  - `env`: if env.AI (Workers AI binding) exists, results are fused with semantic similarity
 */
export async function retrieve(query, { budget = 1800, env = {}, minRelative = 0.3 } = {}) {
  const index = getIndex();
  let ranked = bm25(query, index);
  if (ranked.length) {
    const top = ranked[0].score;
    ranked = ranked.filter((r) => r.score >= top * minRelative);
  }

  const semantic = await semanticScores(
    query,
    index.docs.map((d) => d.chunk),
    env,
  );
  if (semantic) ranked = fuse([ranked, semantic.slice(0, 15)]);

  const pinned = index.docs.map((d) => d.chunk).filter((c) => c.pinned);
  const picked = [];
  let used = 0;
  const add = (chunk) => {
    if (picked.some((c) => c.id === chunk.id)) return;
    const cost = estimateTokens(chunk.title) + estimateTokens(chunk.text) + 6;
    if (used + cost > budget) return;
    picked.push(chunk);
    used += cost;
  };
  pinned.forEach(add);
  for (const r of ranked) add(r.chunk);

  return { chunks: picked, tokens: used, matched: ranked.length };
}

/** Context block for the prompt. */
export function formatContext(chunks) {
  return chunks.map((c, i) => `[${i + 1}] ${c.label} — ${c.title}\n${c.text}`).join('\n\n');
}
