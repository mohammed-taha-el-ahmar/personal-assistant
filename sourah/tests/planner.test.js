const assert = require('assert');
const P = require('../public/js/planner.js');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok -', name); };

t('retention is 0.9 at t = S', () => assert(Math.abs(P.retention(10, 10) - 0.9) < 1e-9));
t('grade from errors', () => {
  assert.strictEqual(P.gradeFromErrors(0, 130), 4);
  assert.strictEqual(P.gradeFromErrors(2, 130), 3);
  assert.strictEqual(P.gradeFromErrors(4, 130), 2);
  assert.strictEqual(P.gradeFromErrors(7, 130), 1);
  assert.strictEqual(P.gradeFromErrors(0, 130, true), 1);
  assert.strictEqual(P.gradeFromErrors(2, 32), 2); // short passage: 2 errors weigh more
});
t('sabaq split in parts, page moves to sabqi on last part', () => {
  let ps = P.applySabaq(undefined, 4, 100, 2);
  assert.strictEqual(ps.status, 'sabaq'); assert.strictEqual(ps.part, 1);
  ps = P.applySabaq(ps, 2, 101, 2); assert.strictEqual(ps.part, 1); // failed: same part again
  ps = P.applySabaq(ps, 3, 102, 2);
  assert.strictEqual(ps.status, 'sabqi'); assert.strictEqual(ps.S, 1); assert.strictEqual(ps.memorized, 102);
});
t('sabqi graduates to manzil when S >= 21', () => {
  let ps = { status: 'sabqi', S: 1, D: 5, last: 0 };
  let d = 0;
  while (ps.status === 'sabqi') { d++; ps = P.applyReview(ps, 4, d); assert(d < 20); }
  assert(ps.S >= 21);
});
t('lapse sends manzil page back to sabqi', () => {
  const ps = P.applyReview({ status: 'manzil', S: 30, D: 5, last: 0 }, 1, 30);
  assert.strictEqual(ps.status, 'sabqi'); assert.strictEqual(ps.S, 9); assert.strictEqual(ps.lapses, 1);
});
t('interval is capped at 45 days', () => {
  assert.strictEqual(P.isDue({ status: 'manzil', S: 200, last: 0 }, 45), true);
  assert.strictEqual(P.isDue({ status: 'manzil', S: 200, last: 0 }, 44), false);
});
t('session: sabqi first, then manzil by lowest R, sabaq when room', () => {
  const pages = {
    604: { status: 'sabqi', S: 2, last: 9 },
    603: { status: 'manzil', S: 10, last: 0 },   // R lower
    602: { status: 'manzil', S: 10, last: 5 },   // not due
    601: { status: 'manzil', S: 5, last: 4 },
  };
  const s = P.buildSession({ settings: { minutes: 30, pace: 1, direction: 'nas' }, pages }, 10);
  assert.deepStrictEqual(s.sabqi, [604]);
  assert.deepStrictEqual(s.manzil, [601, 603]); // 601 has the lowest R (0.88 vs 0.90)
  assert.deepStrictEqual(s.sabaq, { page: 600, part: 0, parts: 1 });
});
t('consolidation when due review is far above the budget', () => {
  const pages = {};
  for (let p = 1; p <= 40; p++) pages[p] = { status: 'sabqi', S: 2, last: 0 };
  const s = P.buildSession({ settings: { minutes: 20, pace: 1 }, pages }, 5);
  assert.strictEqual(s.consolidation, 'overload'); assert.strictEqual(s.sabaq, null);
});
t('no second sabaq the same day', () => {
  const pages = { 604: { status: 'sabaq', part: 1, parts: 2, lastSabaq: 10 } };
  assert.strictEqual(P.buildSession({ settings: { minutes: 20, pace: 0.5 }, pages }, 10).sabaq, null);
  assert.deepStrictEqual(P.buildSession({ settings: { minutes: 20, pace: 0.5 }, pages }, 11).sabaq, { page: 604, part: 1, parts: 2 });
});
t('direction fatiha starts at page 1', () => {
  assert.strictEqual(P.nextSabaqPage({}, 'fatiha'), 1);
  assert.strictEqual(P.nextSabaqPage({}, 'nas'), 604);
});
t('streak with one freeze', () => {
  assert.strictEqual(P.streak([10, 9, 8], 10), 3);
  assert.strictEqual(P.streak([10, 8, 7], 10), 3);       // day 9 frozen
  assert.strictEqual(P.streak([10, 8, 6], 10), 2);       // second gap too soon
  assert.strictEqual(P.streak([9, 8], 10), 2);           // today not done yet
  assert.strictEqual(P.streak([7], 10), 0);
});
t('seeded pages are spread', () => {
  const s = P.seedKnownPages([1, 2, 3], 100, 14);
  assert.deepStrictEqual([s[1].last, s[2].last, s[3].last], [100, 99, 98]);
});
console.log(`\n${n} tests passed`);
t('forecast projects load and juz milestones', () => {
  const juz = Array.from({ length: 604 }, (_, i) => (i < 582 ? 1 : 30));
  const f = P.forecast({ settings: { minutes: 30, pace: 1, direction: 'nas' }, pages: {} }, 100, 60, juz);
  assert.strictEqual(f.days.length, 60);
  assert.strictEqual(f.days[0].sabaq.page, 604);
  assert(f.milestones.some(m => m.juz === 30), 'juz 30 completes within 60 days at 1 page/day');
  assert(f.days.every(d => d.minutes.total <= 60));
});
console.log('forecast ok');
