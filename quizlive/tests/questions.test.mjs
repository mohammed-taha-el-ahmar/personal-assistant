// Unit tests for answer matching and scoring. Run with: node tests/questions.test.mjs
import { normalizeAnswer, matchesTyped, isCorrect, computePoints, groupTyped, optionCount, validateQuestion, playerView } from "../js/questions.js";

let pass = 0, fail = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  console.log(`${ok ? "  ok  " : "  FAIL"} ${name}${ok ? "" : `  got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`);
};

// normalisation
eq("case + spaces", normalizeAnswer("  PaRis  "), "paris");
eq("French accents", normalizeAnswer("Amérique du Sud"), "amerique du sud");
eq("leading article (en)", normalizeAnswer("The Pacific Ocean"), "pacific ocean");
eq("leading article (fr, elided)", normalizeAnswer("l'Égypte"), "egypte");
eq("subscript digits", normalizeAnswer("H₂O"), "h2o");
eq("Arabic harakat + taa marbuta", normalizeAnswer("القَاهِرَة"), normalizeAnswer("القاهره"));
eq("Arabic alef with hamza", normalizeAnswer("الإفطار"), normalizeAnswer("الافطار"));
eq("Arabic article dropped", normalizeAnswer("القاهرة"), normalizeAnswer("قاهرة"));
eq("punctuation", normalizeAnswer("Rome!"), "rome");

// matching
eq("exact", matchesTyped("paris", ["Paris"]), true);
eq("typo on long word", matchesTyped("Canbera", ["Canberra"]), true);
eq("no typo allowed on short word", matchesTyped("Ar", ["Au"]), false);
eq("1 typo on 5-letter", matchesTyped("haert", ["heart"]), false); // transposition = 2 edits
eq("1 typo on 5-letter (substitution)", matchesTyped("hearr", ["heart"]), true);
eq("wrong answer", matchesTyped("London", ["Paris"]), false);
eq("empty", matchesTyped("   ", ["Paris"]), false);
eq("any accepted variant", matchesTyped("pacific", ["Pacific Ocean", "Pacific"]), true);
eq("Arabic with/without hamza", matchesTyped("افطار", ["الإفطار"]), true);

// scoring by type
const quiz = { type: "quiz", answers: ["a", "b"], correct: [1], timeLimit: 20, points: 1000 };
eq("quiz correct instant = 1000", computePoints(quiz, { choice: 1, at: 1000 }, 1000), 1000);
eq("quiz correct at buzzer = 500", computePoints(quiz, { choice: 1, at: 21000 }, 1000), 500);
eq("quiz wrong = 0", computePoints(quiz, { choice: 0, at: 1000 }, 1000), 0);
const legacy = { answers: ["a", "b"], correct: [0], timeLimit: 10, points: 1000 };
eq("missing type = quiz", isCorrect(legacy, { choice: 0 }), true);
const tf = { type: "truefalse", correct: [1], timeLimit: 10, points: 1000 };
eq("true/false: 2 options", optionCount(tf), 2);
eq("true/false: false is correct", isCorrect(tf, { choice: 1 }), true);
const poll = { type: "poll", answers: ["x", "y", "z"], correct: [0], timeLimit: 10, points: 1000 };
eq("poll never correct", isCorrect(poll, { choice: 0 }), false);
eq("poll scores 0", computePoints(poll, { choice: 0, at: 0 }, 0), 0);
const typed = { type: "typeAnswer", accepted: ["Au"], timeLimit: 20, points: 2000 };
eq("typed: 0 buttons", optionCount(typed), 0);
eq("typed correct, double points", computePoints(typed, { text: " au ", at: 0 }, 0), 2000);
eq("typed: a choice is not an answer", isCorrect(typed, { choice: 0 }), false);
const img = { type: "images", answerImages: ["https://x/1.png", "https://x/2.png", "https://x/3.png"], correct: [2], timeLimit: 10, points: 1000 };
eq("images: option count", optionCount(img), 3);
eq("images: correct", isCorrect(img, { choice: 2 }), true);

// grouping typed answers
eq("groupTyped", groupTyped({ type: "typeAnswer", accepted: ["Paris"] },
  [{ text: "Paris" }, { text: "paris " }, { text: "Lyon" }, { text: "" }, { choice: 1 }]),
  [{ text: "Paris", count: 2, correct: true }, { text: "Lyon", count: 1, correct: false }]);

// validation
eq("valid quiz", validateQuestion(quiz.text ? quiz : { ...quiz, text: "Q" }), null);
eq("quiz needs text", validateQuestion({ type: "quiz", answers: ["a", "b"], correct: [0] }), "text");
eq("poll needs 2 answers", validateQuestion({ type: "poll", text: "Q", answers: ["a"] }), "answers");
eq("typed needs accepted", validateQuestion({ type: "typeAnswer", text: "Q", accepted: [] }), "accepted");
eq("images must be https", validateQuestion({ type: "images", text: "Q", answerImages: ["http://x", "https://y"], correct: [0] }), "image");

// what players receive
eq("player view hides correct answers", Object.keys(playerView({ ...quiz, text: "Q" })).sort(), ["answers", "text", "type"]);
eq("player view for typed has no accepted", playerView({ ...typed, text: "Q" }), { type: "typeAnswer", text: "Q" });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
