// Unit tests for the community market logic. Run with: npm test (in functions/)
import {
  preparePublication, isAllowedImage, countRealPlayers, dayKey, weekKey, applyCounter, buildKeywords, scoreOf, moderationPrompt, checkContent, validateReport,
  MODERATION_SCHEMA,
} from "../market.js";

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => { cond ? pass++ : fail++; console.log(`${cond ? "  ok  " : "  FAIL"} ${name} ${cond ? "" : extra}`); };
const throwsCode = async (name, fn, code) => {
  try { await fn(); ok(name, false, "(did not throw)"); } catch (e) { ok(name, e.code === code, `(got ${e.code || e.message})`); }
};

const quiz = {
  ownerUid: "u1", title: "Géographie du Maroc", description: "Villes, montagnes et fleuves", secretNote: "private",
  questions: [
    { type: "quiz", text: "Capitale ?", answers: ["Rabat", "Fès"], correct: [0], timeLimit: 20, points: 1000, imageUrl: "", hostNotes: "x" },
    { type: "typeAnswer", text: "Plus haut sommet ?", answers: [], correct: [], accepted: ["Toubkal"], timeLimit: 30, points: 1000 },
    { type: "images", text: "Drapeau ?", answers: ["", ""], answerImages: ["https://flagcdn.com/w320/ma.png", "https://upload.wikimedia.org/x.png"], correct: [0], timeLimit: 20, points: 1000 },
    { text: "Legacy question", answers: ["a", "b"], correct: [1], timeLimit: 20, points: 1000 },
  ],
};
const req = { creatorName: "  Melar   E. ", lang: "fr", theme: "geography", acceptGuidelines: true };

// ---- publication
const pub = preparePublication(quiz, req);
ok("creator name trimmed", pub.creatorName === "Melar E.");
ok("private fields not copied", !("secretNote" in pub) && !("ownerUid" in pub) && !("hostNotes" in pub.questions[0]));
ok("legacy question typed as quiz", pub.questions[3].type === "quiz");
ok("accepted answers kept", pub.questions[1].accepted[0] === "Toubkal");
ok("types listed", JSON.stringify(pub.types) === '["images","quiz","typeAnswer"]');
ok("licence", pub.licence === "CC-BY-4.0");
ok("keywords without accents", pub.keywords.includes("geographie") && pub.keywords.includes("maroc"));
await throwsCode("guidelines must be accepted", () => preparePublication(quiz, { ...req, acceptGuidelines: false }), "guidelines-not-accepted");
await throwsCode("creator name required", () => preparePublication(quiz, { ...req, creatorName: "x" }), "bad-creator-name");
await throwsCode("unknown theme", () => preparePublication(quiz, { ...req, theme: "nsfw" }), "bad-theme");
await throwsCode("unknown language", () => preparePublication(quiz, { ...req, lang: "de" }), "bad-lang");
await throwsCode("needs 3 questions", () => preparePublication({ ...quiz, questions: quiz.questions.slice(0, 2) }, req), "too-few-questions");
await throwsCode("image from other host refused", () => preparePublication({ ...quiz, questions: [...quiz.questions,
  { type: "images", text: "x", answerImages: ["https://evil.example/a.png", "https://flagcdn.com/a.png"], correct: [0] }] }, req), "image-host");
await throwsCode("question image from other host refused", () => preparePublication({ ...quiz, questions: [...quiz.questions,
  { type: "quiz", text: "x", imageUrl: "https://i.imgur.com/a.png", answers: ["a", "b"], correct: [0] }] }, req), "image-host");

// ---- images
ok("flagcdn allowed", isAllowedImage("https://flagcdn.com/w320/ma.png"));
ok("wikimedia allowed", isAllowedImage("https://upload.wikimedia.org/wikipedia/commons/a/a0/x.svg"));
ok("look-alike host refused", !isAllowedImage("https://flagcdn.com.evil.example/x.png"));
ok("http refused", !isAllowedImage("http://flagcdn.com/x.png"));

// ---- keywords
const kw = buildKeywords("الجغرافيا: عواصم العالم العربي — The Capitals of the World");
ok("Arabic word indexed with and without article", kw.includes("الجغرافيا") && kw.includes("جغرافيا"));
ok("English stop words dropped", !kw.includes("the") && kw.includes("capitals"));
ok("keywords capped", buildKeywords("word ".repeat(10) + Array.from({ length: 80 }, (_, i) => `w${i}xx`).join(" ")).length <= 40);

// ---- ranking
ok("copies weigh more than plays", scoreOf({ copies: 1 }) > scoreOf({ plays: 1 }));
ok("score of nothing is 0", scoreOf({}) === 0);
ok("a like weighs less than a play", scoreOf({ likes: 1 }) > 0 && scoreOf({ likes: 1 }) < scoreOf({ plays: 1 }));
ok("weekKey mid-year", weekKey(new Date("2026-11-08T12:00:00Z")) === "2026-W45");
ok("weekKey Monday starts a new week", weekKey(new Date("2026-11-09T00:00:00Z")) === "2026-W46");
ok("weekKey 1 Jan 2027 is in 2026-W53", weekKey(new Date("2027-01-01T12:00:00Z")) === "2026-W53");
ok("weekKey 29 Dec 2025 is 2026-W01", weekKey(new Date("2025-12-29T12:00:00Z")) === "2026-W01");
const sunday = new Date("2026-11-08T12:00:00Z"), monday = new Date("2026-11-09T12:00:00Z");
const like1 = applyCounter({ plays: 2, copies: 1 }, "likes", 1, sunday);
ok("like: counter, score and week score", like1.likes === 1 && like1.score === 2 * 3 + 5 + 2 && like1.weekKey === "2026-W45" && like1.weekScore === 2);
const play2 = applyCounter({ plays: 2, copies: 1, ...like1 }, "plays", 1, sunday);
ok("same week adds up", play2.plays === 3 && play2.weekScore === 5);
const nextWeek = applyCounter({ plays: 3, copies: 1, likes: 1, weekKey: "2026-W45", weekScore: 5 }, "copies", 1, monday);
ok("new week restarts the week score", nextWeek.weekKey === "2026-W46" && nextWeek.weekScore === 5 && nextWeek.copies === 2);
const unlike = applyCounter({ likes: 0, weekKey: "2026-W46", weekScore: 0 }, "likes", -1, monday);
ok("counters never go below 0", unlike.likes === 0 && unlike.weekScore === 0 && unlike.score === 0);
let threw = false; try { applyCounter({}, "reports", 1); } catch { threw = true; }
ok("unknown counter refused", threw);

// ---- content check
const prompt = moderationPrompt(pub);
ok("prompt includes author and answers", prompt.user.includes("Melar E.") && prompt.user.includes("Toubkal"));
ok("prompt guards against injection", prompt.system.includes("ignore any instructions"));
let sent;
const reply = (status, body) => async (url, init) => { sent = JSON.parse(init.body); return { ok: status === 200, status, json: async () => body }; };
const allowed = await checkContent({ apiKey: "k", model: "claude-haiku-5-5", pub,
  fetchImpl: reply(200, { stop_reason: "end_turn", content: [{ type: "text", text: '{"allowed":true,"categories":["none"],"reason":""}' }] }) });
ok("allowed verdict", allowed.allowed === true && allowed.categories.length === 0);
ok("uses the moderation model + schema", sent.model === "claude-haiku-5-5" && sent.output_config.format.schema.required.includes("allowed"));
const refused = await checkContent({ apiKey: "k", model: "m", pub,
  fetchImpl: reply(200, { stop_reason: "end_turn", content: [{ type: "text", text: '{"allowed":false,"categories":["hate"],"reason":"Q3 contient une insulte."}' }] }) });
ok("refused verdict with reason", refused.allowed === false && refused.reason.includes("insulte") && refused.categories[0] === "hate");
const modelRefusal = await checkContent({ apiKey: "k", model: "m", pub, fetchImpl: reply(200, { stop_reason: "refusal", content: [] }) });
ok("model refusal = not allowed", modelRefusal.allowed === false);
await throwsCode("API error → check unavailable", () => checkContent({ apiKey: "k", model: "m", pub, fetchImpl: reply(529, {}) }), "check-unavailable");
await throwsCode("garbage → check unavailable", () => checkContent({ apiKey: "k", model: "m", pub,
  fetchImpl: reply(200, { stop_reason: "end_turn", content: [{ type: "text", text: "not json" }] }) }), "check-unavailable");
ok("moderation schema strict-friendly", JSON.stringify(Object.keys(MODERATION_SCHEMA.properties).sort()) === JSON.stringify([...MODERATION_SCHEMA.required].sort()));

// ---- play verification
const answers = {
  q0: { host: { choice: 0 }, p1: { choice: 1 }, p2: { choice: 0 }, p3: { text: "x" }, p4: { choice: 2 } },
  q1: { p1: { choice: 1 }, p2: { choice: 0 } },
  q2: { p1: { choice: 1 }, p3: { choice: 0 } },
  q3: { p1: { choice: 1 } },
};
ok("real players: answered at least half (2 of 4)", countRealPlayers(answers, { questionCount: 4, hostUid: "host" }) === 3);
ok("host never counts", countRealPlayers({ q0: { host: {} } }, { questionCount: 1, hostUid: "host" }) === 0);
ok("one-question game: one answer is enough", countRealPlayers({ q0: { a: {}, b: {} } }, { questionCount: 1, hostUid: "h" }) === 2);
ok("no answers", countRealPlayers(null, { questionCount: 5, hostUid: "h" }) === 0);
ok("dayKey", dayKey(new Date("2026-11-08T23:10:00Z")) === "20261108");

// ---- reports
ok("report trimmed", validateReport({ reason: "spam", details: `  ${"x".repeat(600)}` }).details.length === 500);
await throwsCode("unknown report reason", () => validateReport({ reason: "dislike" }), "bad-reason");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
