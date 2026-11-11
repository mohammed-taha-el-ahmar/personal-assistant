// Daily quiz generator: pure functions, deterministic for a given day.
// Q = {pages, surahs, mut}, pages = [{page, R}] memorized pages, day = day number.
const isWord = w => /[ء-يٱ]/.test(w);
const DIAC = /[ً-ٰٟۖ-ࣰۭ-ࣲـ]/g;
const NMAP = { 'ٱ': 'ا', 'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ى': 'ي', 'ة': 'ه', 'ؤ': 'و', 'ئ': 'ي' };
export const norm = w => w.replace(DIAC, '').replace(/[ٱأإآىةؤئ]/g, c => NMAP[c]);
const words = text => text.split(' ').filter(isWord);

function rng(seed) { let x = (seed * 2654435761) % 4294967296 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
function shuffle(arr, r) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const head = (text, n) => { const w = text.split(' '); return w.length > n ? w.slice(0, n).join(' ') + ' …' : text; };

function index(Q) {
  if (Q._ix) return Q._ix;
  const byKey = {}, list = [];
  Q.pages.forEach((pg, i) => pg.forEach(([s, a, text]) => { const o = { s, a, text, page: i + 1, key: s + ':' + a }; byKey[o.key] = o; list.push(o); }));
  Q._ix = { byKey, list };
  return Q._ix;
}

/**
 * Builds up to `n` questions. Types: next (which ayah follows), prev (which ayah comes before),
 * word (missing word), surah (which surah). Distractors come from similar ayahs (mutashabihat) first.
 */
export function buildQuiz(Q, memorized, day, n = 10) {
  const { byKey, list } = index(Q);
  const r = rng(day + 7);
  const memSet = new Set(memorized.map(m => m.page));
  const pool = list.filter(x => memSet.has(x.page) && words(x.text).length >= 3);
  if (pool.length < 4) return [];
  const weight = Object.fromEntries(memorized.map(m => [m.page, 0.15 + (1 - (m.R == null ? 1 : m.R)) * 3]));
  const pickAyah = () => { let tot = 0; for (const x of pool) tot += weight[x.page]; let v = r() * tot; for (const x of pool) { v -= weight[x.page]; if (v <= 0) return x; } return pool[pool.length - 1]; };
  const nearby = (x, k) => list.slice(Math.max(0, list.indexOf(x) - k), list.indexOf(x) + k + 1).filter(y => y !== x);
  const mutOf = x => ((Q.mut || {})[x.key] || []).map(([k]) => byKey[k]).filter(Boolean);

  const make = {
    next(x) {
      const nx = byKey[x.s + ':' + (x.a + 1)]; if (!nx) return null;
      const cands = [...mutOf(nx), ...mutOf(x).map(m => byKey[m.s + ':' + (m.a + 1)]).filter(Boolean), ...shuffle(nearby(nx, 6), r)];
      return choiceQ('next', x, nx, cands, y => head(y.text, 7));
    },
    prev(x) {
      const pv = byKey[x.s + ':' + (x.a - 1)]; if (!pv) return null;
      const cands = [...mutOf(pv), ...shuffle(nearby(pv, 6), r)];
      return choiceQ('prev', x, pv, cands, y => head(y.text, 7));
    },
    word(x) {
      const ws = x.text.split(' ');
      const idxs = ws.map((w, i) => i).filter(i => isWord(ws[i]) && norm(ws[i]).length >= 3);
      if (!idxs.length) return null;
      const wi = idxs[Math.floor(r() * idxs.length)], target = ws[wi], tn = norm(target);
      const seen = new Set([tn]), opts = [];
      const add = w => { const k = norm(w); if (w && isWord(w) && !seen.has(k) && k.length >= 2) { seen.add(k); opts.push(w); } };
      mutOf(x).forEach(m => { const mw = m.text.split(' '); add(mw[wi]); });
      shuffle(nearby(x, 8), r).forEach(y => words(y.text).filter(w => norm(w)[0] === tn[0]).forEach(add));
      shuffle(nearby(x, 12), r).forEach(y => words(y.text).forEach(add));
      if (opts.length < 3) return null;
      const choices = shuffle([target, ...opts.slice(0, 3)], r);
      return { type: 'word', key: x.key, page: x.page, s: x.s, a: x.a, prompt: ws.map((w, i) => i === wi ? '﹏﹏' : w).join(' '), choices, answer: choices.indexOf(target) };
    },
    surah(x) {
      const others = new Set();
      memorized.forEach(m => Q.pages[m.page - 1].forEach(([s]) => { if (s !== x.s) others.add(s); }));
      [x.s - 2, x.s - 1, x.s + 1, x.s + 2].forEach(s => { if (s >= 1 && s <= 114 && s !== x.s) others.add(s); });
      const opts = shuffle([...others], r).slice(0, 3);
      if (opts.length < 3) return null;
      const choices = shuffle([x.s, ...opts], r);
      return { type: 'surah', key: x.key, page: x.page, s: x.s, a: x.a, prompt: x.text, choices, answer: choices.indexOf(x.s) };
    }
  };
  function choiceQ(type, x, correct, cands, label) {
    const seen = new Set([norm(label(correct)), norm(label(x))]), opts = [];
    for (const c of cands) { if (!c || c === correct || c === x) continue; const k = norm(label(c)); if (seen.has(k)) continue; seen.add(k); opts.push(c); if (opts.length === 3) break; }
    if (opts.length < 3) return null;
    const all = shuffle([correct, ...opts], r);
    return { type, key: x.key, page: x.page, s: x.s, a: x.a, prompt: x.text, choices: all.map(label), refs: all.map(y => y.key), answer: all.indexOf(correct), target: correct.key };
  }

  const plan = ['next', 'word', 'next', 'word', 'prev', 'surah', 'word', 'next', 'prev', 'word', 'surah', 'next'];
  const out = [], used = new Set();
  for (let tries = 0; out.length < n && tries < n * 12; tries++) {
    const type = plan[out.length % plan.length];
    const x = pickAyah();
    if (used.has(type + x.key)) continue;
    const q = make[type](x);
    if (q) { used.add(type + x.key); out.push(q); }
  }
  return out;
}
