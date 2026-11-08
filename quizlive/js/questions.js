// Question types and answer checking. Pure functions: no DOM, no Firebase (unit-tested in tests/).
//
// Question shape (Firestore quizzes/{id}.questions[]):
//   type:         "quiz" | "truefalse" | "poll" | "typeAnswer" | "images"   (missing = "quiz")
//   text, imageUrl, timeLimit (s), points (0 | 1000 | 2000)
//   answers:      string[]   quiz, poll: answer texts. images: optional captions
//   answerImages: string[]   images: https image URLs
//   correct:      number[]   quiz, images: correct indexes. truefalse: [0] = true, [1] = false. poll: []
//   accepted:     string[]   typeAnswer: accepted answers (matching ignores case, accents and small typos)

export const TYPES = ["quiz", "truefalse", "typeAnswer", "poll", "images"];
export const TYPE_ANSWER_MAX = 60;

export const typeOf = (q) => (TYPES.includes(q?.type) ? q.type : "quiz");

// Number of answer buttons shown to players (0 = they type the answer).
export function optionCount(q) {
  switch (typeOf(q)) {
    case "truefalse": return 2;
    case "typeAnswer": return 0;
    case "images": return (q.answerImages || []).length;
    default: return (q.answers || []).length;
  }
}

// Polls never score and never affect streaks.
export const isScored = (q) => typeOf(q) !== "poll";

// What players may see during a question: never the correct answers.
export function playerView(q) {
  const type = typeOf(q);
  const view = { type, text: q.text };
  if (type === "quiz" || type === "poll") view.answers = q.answers;
  if (type === "images") {
    view.images = q.answerImages;
    view.answers = (q.answers || []).map((a) => a || "");
  }
  return view;
}

// ---------------------------------------------------------------- typed answers

const ARTICLES = /^(the|a|an|le|la|les|l|un|une|des|el|al)\s+/;

// Lowercase, strip accents and Arabic short vowels/tatweel, unify Arabic letter variants,
// drop punctuation, collapse spaces, and drop a leading article.
export function normalizeAnswer(value) {
  let s = String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")           // accents, Arabic harakat, hamza marks
    .replace(/ـ/g, "")           // tatweel
    .replace(/[ٱآأإ]/g, "ا") // alef variants → ا
    .replace(/ى/g, "ي")     // ى → ي
    .replace(/ة/g, "ه")     // ة → ه
    .toLowerCase()
    .replace(/[\p{P}\p{S}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  s = s.replace(ARTICLES, "");
  s = s.replace(/^ال(?=\S{2,})/, ""); // Arabic definite article on the first word
  return s;
}

function editDistance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

// Exact match after normalisation, or a small typo: 1 letter for 5–7 letters, 2 for 8+.
export function matchesTyped(text, accepted = []) {
  const given = normalizeAnswer(text);
  if (!given) return false;
  return accepted.some((a) => {
    const target = normalizeAnswer(a);
    if (!target) return false;
    if (given === target) return true;
    const tolerance = target.length >= 8 ? 2 : target.length >= 5 ? 1 : 0;
    return tolerance > 0 && editDistance(given, target, tolerance) <= tolerance;
  });
}

// ---------------------------------------------------------------- scoring

export function isCorrect(q, answer) {
  if (!answer) return false;
  switch (typeOf(q)) {
    case "poll": return false;
    case "typeAnswer": return typeof answer.text === "string" && matchesTyped(answer.text, q.accepted || []);
    default: return Number.isInteger(answer.choice) && (q.correct || []).includes(answer.choice);
  }
}

// Points: full value for an instant answer, half value at the buzzer.
export function computePoints(q, answer, startedAt) {
  if (!isScored(q) || !q.points || !isCorrect(q, answer)) return 0;
  const limit = q.timeLimit;
  const seconds = Math.min(Math.max((answer.at - startedAt) / 1000, 0), limit);
  return Math.round(q.points * (1 - (seconds / limit) / 2));
}

// Group typed answers for the reveal screen: [{ text, count, correct }], most frequent first.
export function groupTyped(q, answers) {
  const groups = new Map();
  for (const a of answers) {
    if (typeof a?.text !== "string") continue;
    const key = normalizeAnswer(a.text);
    if (!key) continue;
    const g = groups.get(key) || { text: a.text.trim(), count: 0, correct: isCorrect(q, a) };
    g.count++;
    groups.set(key, g);
  }
  return [...groups.values()].sort((x, y) => y.count - x.count);
}

// ---------------------------------------------------------------- validation (editor, templates)

const HTTPS = /^https:\/\/\S+$/;

// Returns an error key (see i18n "edit.err.*") or null.
export function validateQuestion(q) {
  const type = typeOf(q);
  if (!q.text) return "text";
  if (q.imageUrl && !HTTPS.test(q.imageUrl)) return "image";
  switch (type) {
    case "quiz":
      if ((q.answers || []).length < 2) return "answers";
      if (!(q.correct || []).length) return "correct";
      break;
    case "poll":
      if ((q.answers || []).length < 2) return "answers";
      break;
    case "truefalse":
      if (!(q.correct || []).length) return "correct";
      break;
    case "typeAnswer":
      if (!(q.accepted || []).length) return "accepted";
      break;
    case "images":
      if ((q.answerImages || []).length < 2) return "images";
      if (q.answerImages.some((u) => !HTTPS.test(u))) return "image";
      if (!(q.correct || []).length) return "correct";
      break;
  }
  return null;
}
