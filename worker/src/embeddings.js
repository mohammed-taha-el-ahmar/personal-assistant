// Optional semantic retrieval with Workers AI (multilingual bge-m3), used only when an `AI`
// binding is configured in wrangler.toml. Any failure falls back to lexical retrieval.
const MODEL = '@cf/baai/bge-m3';
let chunkVectors = null; // per-isolate cache: [{ chunk, vec }]

const cosine = (a, b) => {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
};

async function embed(env, texts) {
  const out = [];
  for (let i = 0; i < texts.length; i += 50) {
    const res = await env.AI.run(MODEL, { text: texts.slice(i, i + 50) });
    out.push(...res.data);
  }
  return out;
}

/** Returns [{ chunk, score }] sorted desc, or null when embeddings are unavailable. */
export async function semanticScores(query, chunks, env) {
  if (!env?.AI) return null;
  try {
    if (!chunkVectors) {
      const vecs = await embed(
        env,
        chunks.map((c) => `${c.title}\n${c.text}`),
      );
      chunkVectors = chunks.map((chunk, i) => ({ chunk, vec: vecs[i] }));
    }
    const [q] = await embed(env, [query]);
    return chunkVectors.map(({ chunk, vec }) => ({ chunk, score: cosine(q, vec) })).sort((a, b) => b.score - a.score);
  } catch (err) {
    console.warn('Embeddings unavailable, using lexical retrieval only:', err?.message ?? err);
    return null;
  }
}

export function resetEmbeddingCache() {
  chunkVectors = null;
}
