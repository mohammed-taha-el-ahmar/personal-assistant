import assert from 'assert';
import fs from 'fs';
import { buildQuiz, norm } from '../public/js/quiz.js';
const Q = JSON.parse(fs.readFileSync(new URL('../public/quran.json', import.meta.url)));
Q.mut = JSON.parse(fs.readFileSync(new URL('../public/mutashabihat.json', import.meta.url)));
const mem = []; for (let p = 582; p <= 604; p++) mem.push({ page: p, R: p % 3 ? 0.95 : 0.75 });
const q = buildQuiz(Q, mem, 20400, 10);
assert.strictEqual(q.length, 10, 'ten questions');
for (const x of q) {
  assert.strictEqual(x.choices.length, 4);
  assert(x.answer >= 0 && x.answer < 4);
  assert.strictEqual(new Set(x.choices.map(c => norm(String(c)))).size, 4, 'distinct choices');
  assert(mem.some(m => m.page === x.page), 'question from a memorized page');
}
assert.deepStrictEqual(buildQuiz(Q, mem, 20400, 10), q, 'deterministic for a day');
assert.notDeepStrictEqual(buildQuiz(Q, mem, 20401, 10), q, 'changes the next day');
assert.deepStrictEqual(buildQuiz(Q, [{ page: 604, R: 1 }].slice(0, 0), 1, 10), [], 'no quiz without memorized pages');
const types = {}; q.forEach(x => types[x.type] = (types[x.type] || 0) + 1);
console.log('quiz ok', types);
console.log(JSON.stringify(q.slice(0, 3), null, 1).slice(0, 1200));
