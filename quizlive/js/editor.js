// Quiz editor: create or edit a quiz stored in Firestore, with five question types.
import { auth, fs } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import {
  doc, getDoc, setDoc, addDoc, collection, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import { $, $$, params, showView, escapeHTML, SHAPES, toast } from "./utils.js";
import { t, initI18n, mountLangToggle, onLangChange } from "./i18n.js";
import { TYPES, typeOf, validateQuestion } from "./questions.js";

initI18n();
mountLangToggle($("#controls"));

const TIME_LIMITS = [5, 10, 20, 30, 60, 90, 120];
const POINTS = [[1000, "edit.pointsStandard"], [2000, "edit.pointsDouble"], [0, "edit.pointsNone"]];
const MAX_ACCEPTED = 5;

let quizId = params().get("id");
let user = null;
let createdAt = null;
let source = null;          // where the quiz came from (template, AI, community), kept on save
let published = null;       // { publishedAs, publishedAt } when the quiz is in the community market
let questions = [];

const pad = (arr, n) => [...(arr || []), ...Array(n).fill("")].slice(0, n);

// Editing model: every field present, fixed-length slots. compact() turns it back into the stored shape.
const blankQuestion = (type = "quiz") => ({
  type, text: "", imageUrl: "", timeLimit: 20, points: type === "poll" ? 0 : 1000,
  answers: ["", "", "", ""], answerImages: ["", "", "", ""], accepted: ["", "", ""],
  correct: type === "truefalse" ? [0] : [],
});

function toEditable(x) {
  const type = typeOf(x);
  const q = { ...blankQuestion(type), ...x, type };
  q.answers = pad(x.answers, 4);
  q.answerImages = pad(x.answerImages, 4);
  q.accepted = pad(x.accepted, Math.max(3, Math.min(MAX_ACCEPTED, (x.accepted || []).length + 1)));
  q.correct = [...(x.correct || (type === "truefalse" ? [0] : []))];
  return q;
}

onAuthStateChanged(auth, async (u) => {
  if (!u || u.isAnonymous) return location.replace("dashboard.html");
  if (user) return;
  user = u;
  if (quizId) {
    const snap = await getDoc(doc(fs, "quizzes", quizId));
    if (!snap.exists()) { toast(t("edit.notFound")); quizId = null; }
    else {
      const q = snap.data();
      $("#title").value = q.title || "";
      $("#description").value = q.description || "";
      createdAt = q.createdAt || null;
      source = q.source || null;
      if (q.publishedAs) published = { publishedAs: q.publishedAs, publishedAt: q.publishedAt || null };
      questions = (q.questions || []).map(toEditable);
    }
  }
  $("#ai-notice").hidden = !source?.ai;
  if (!questions.length) questions.push(blankQuestion());
  render();
  showView("editor");
});

onLangChange(() => { if (user) { collect(); render(); } });

// ---------------------------------------------------------------- rendering

function answerRows(q) {
  return q.answers.map((a, j) => `
    <div class="answer-edit c${j}">
      ${SHAPES[j]}
      <input type="text" data-answer="${j}" maxlength="75" aria-label="${t("edit.answer", { n: j + 1 })}"
        placeholder="${t("edit.answer", { n: j + 1 })}${j > 1 ? ` (${t("edit.optional")})` : ""}" value="${escapeHTML(a)}">
      ${q.type === "poll" ? "" : `<input type="checkbox" data-correct="${j}" ${q.correct.includes(j) ? "checked" : ""}
        title="${t("edit.isCorrect")}" aria-label="${t("edit.answerCorrect", { n: j + 1 })}">`}
    </div>`).join("");
}

function imageRows(q) {
  return q.answerImages.map((url, j) => `
    <div class="answer-edit image-edit c${j}">
      ${SHAPES[j]}
      <div class="image-fields">
        <input type="url" data-image="${j}" maxlength="500" aria-label="${t("edit.imageUrl", { n: j + 1 })}"
          placeholder="${t("edit.imageUrl", { n: j + 1 })}${j > 1 ? ` (${t("edit.optional")})` : ""}" value="${escapeHTML(url)}">
        <input type="text" data-caption="${j}" maxlength="40" aria-label="${t("edit.caption", { n: j + 1 })}"
          placeholder="${t("edit.caption", { n: j + 1 })}" value="${escapeHTML(q.answers[j])}">
      </div>
      <span class="thumb" aria-hidden="true">${/^https:\/\//.test(url) ? `<img src="${escapeHTML(url)}" alt="">` : ""}</span>
      <input type="checkbox" data-correct="${j}" ${q.correct.includes(j) ? "checked" : ""}
        title="${t("edit.isCorrect")}" aria-label="${t("edit.answerCorrect", { n: j + 1 })}">
    </div>`).join("");
}

function trueFalseRows(q, i) {
  return [0, 1].map((j) => `
    <label class="answer-edit tf-edit c${j}">
      ${SHAPES[j]}
      <span>${t(j === 0 ? "qt.true" : "qt.false")}</span>
      <input type="radio" name="tf-${i}" data-correct="${j}" ${q.correct.includes(j) ? "checked" : ""}
        aria-label="${t("edit.answerCorrect", { n: t(j === 0 ? "qt.true" : "qt.false") })}">
    </label>`).join("");
}

function acceptedRows(q) {
  return `<div class="accepted-edit">
    ${q.accepted.map((a, j) => `
      <input type="text" data-accepted="${j}" maxlength="60" aria-label="${t("edit.acceptedN", { n: j + 1 })}"
        placeholder="${j === 0 ? t("edit.acceptedMain") : t("edit.acceptedAlt")}" value="${escapeHTML(a)}">`).join("")}
    ${q.accepted.length < MAX_ACCEPTED ? `<button type="button" class="btn small ghost" data-action="more-accepted">${t("edit.addAccepted")}</button>` : ""}
    <small>${t("edit.acceptedHint")}</small>
  </div>`;
}

function typeBlock(q, i) {
  switch (q.type) {
    case "truefalse": return `<div class="answers-edit">${trueFalseRows(q, i)}</div>`;
    case "typeAnswer": return acceptedRows(q);
    case "images": return `<div class="answers-edit">${imageRows(q)}</div>`;
    default: return `<div class="answers-edit">${answerRows(q)}</div>`;
  }
}

function render() {
  $("#questions").innerHTML = questions.map((q, i) => `
    <section class="card q-card stack" data-index="${i}" aria-label="${t("edit.question", { n: i + 1 })}">
      <div class="row spread">
        <div class="row">
          <span class="q-num">${t("edit.question", { n: i + 1 })}</span>
          <select data-field="type" class="type-select" aria-label="${t("edit.type")}">
            ${TYPES.map((ty) => `<option value="${ty}" ${ty === q.type ? "selected" : ""}>${t(`qt.${ty}`)}</option>`).join("")}
          </select>
        </div>
        <div class="row">
          <button class="btn small dark" data-action="up" ${i === 0 ? "disabled" : ""} aria-label="${t("edit.moveUp")}">↑</button>
          <button class="btn small dark" data-action="down" ${i === questions.length - 1 ? "disabled" : ""} aria-label="${t("edit.moveDown")}">↓</button>
          <button class="btn small dark" data-action="copy">${t("dash.duplicate")}</button>
          <button class="btn small danger" data-action="remove">${t("dash.delete")}</button>
        </div>
      </div>
      <small class="type-hint">${t(`qt.${q.type}.hint`)}</small>
      <input data-field="text" maxlength="200" aria-label="${t("edit.questionText")}" placeholder="${t("edit.questionText")}" value="${escapeHTML(q.text)}">
      <div class="grid-3">
        <input data-field="imageUrl" type="url" aria-label="${t("edit.image")}" placeholder="${t("edit.image")}" value="${escapeHTML(q.imageUrl)}">
        <select data-field="timeLimit" aria-label="${t("edit.timeLimit")}">
          ${TIME_LIMITS.map((s) => `<option value="${s}" ${s === q.timeLimit ? "selected" : ""}>${t("edit.seconds", { n: s })}</option>`).join("")}
        </select>
        ${q.type === "poll"
          ? `<span class="no-points">${t("qt.poll.noPoints")}</span>`
          : `<select data-field="points" aria-label="${t("edit.points")}">
              ${POINTS.map(([v, k]) => `<option value="${v}" ${v === q.points ? "selected" : ""}>${t(k)}</option>`).join("")}
            </select>`}
      </div>
      ${typeBlock(q, i)}
    </section>`).join("");
}

// Read the form back into the model.
function collect() {
  if (!$$(".q-card").length) return;
  questions = $$(".q-card").map((card, i) => {
    const prev = questions[i] || blankQuestion();
    const type = $('[data-field="type"]', card).value;
    const q = {
      ...prev,
      type,
      text: $('[data-field="text"]', card).value.trim(),
      imageUrl: $('[data-field="imageUrl"]', card).value.trim(),
      timeLimit: Number($('[data-field="timeLimit"]', card).value),
      points: type === "poll" ? 0 : Number($('[data-field="points"]', card)?.value ?? 1000),
    };
    if (type !== prev.type) return q; // type just changed: fields below belong to the old type
    const correct = $$("[data-correct]", card).filter((el) => el.checked).map((el) => Number(el.dataset.correct));
    if (type === "quiz" || type === "poll") q.answers = $$("[data-answer]", card).map((el) => el.value.trim());
    if (type === "images") {
      q.answerImages = $$("[data-image]", card).map((el) => el.value.trim());
      q.answers = $$("[data-caption]", card).map((el) => el.value.trim());
    }
    if (type === "typeAnswer") q.accepted = $$("[data-accepted]", card).map((el) => el.value.trim());
    if (type !== "typeAnswer") q.correct = correct;
    return q;
  });
}

$("#questions").addEventListener("change", (e) => {
  const el = e.target;
  if (el.matches('[data-field="type"]')) {
    collect();
    const q = questions[Number(el.closest("[data-index]").dataset.index)];
    if (q.type === "truefalse" && ![0, 1].includes(q.correct[0])) q.correct = [0];
    if (q.type === "poll") q.points = 0;
    else if (!q.points) q.points = 1000;
    render();
  }
  if (el.matches("[data-image]")) {
    const thumb = el.closest(".image-edit").querySelector(".thumb");
    thumb.innerHTML = /^https:\/\//.test(el.value.trim()) ? `<img src="${escapeHTML(el.value.trim())}" alt="">` : "";
  }
});

$("#questions").addEventListener("click", (e) => {
  const button = e.target.closest("button[data-action]");
  if (!button) return;
  collect();
  const i = Number(button.closest("[data-index]").dataset.index);
  const action = button.dataset.action;
  if (action === "remove") {
    if (questions.length === 1) return toast(t("edit.needOne"));
    questions.splice(i, 1);
  }
  if (action === "copy") questions.splice(i + 1, 0, structuredClone(questions[i]));
  if (action === "up") [questions[i - 1], questions[i]] = [questions[i], questions[i - 1]];
  if (action === "down") [questions[i + 1], questions[i]] = [questions[i], questions[i + 1]];
  if (action === "more-accepted" && questions[i].accepted.length < MAX_ACCEPTED) questions[i].accepted.push("");
  render();
});

$("#add-question").addEventListener("click", () => {
  collect();
  questions.push(blankQuestion());
  render();
  const last = $$(".q-card").at(-1);
  last.scrollIntoView({ behavior: "smooth" });
  $('[data-field="text"]', last).focus({ preventScroll: true });
});

// ---------------------------------------------------------------- saving

// Stored shape: only the fields the type uses, empty slots dropped, correct indexes remapped.
export function compact(q) {
  const base = { type: q.type, text: q.text, imageUrl: q.imageUrl, timeLimit: q.timeLimit, points: q.type === "poll" ? 0 : q.points };
  const keepCorrect = (kept) => kept.map((a, k) => (q.correct.includes(a.j) ? k : -1)).filter((k) => k >= 0);
  switch (q.type) {
    case "truefalse":
      return { ...base, answers: [], correct: [q.correct[0] === 1 ? 1 : 0] };
    case "typeAnswer":
      return { ...base, answers: [], correct: [], accepted: [...new Set(q.accepted.filter(Boolean))] };
    case "images": {
      const kept = q.answerImages.map((url, j) => ({ url, cap: q.answers[j] || "", j })).filter((a) => a.url);
      return { ...base, answerImages: kept.map((a) => a.url), answers: kept.map((a) => a.cap), correct: keepCorrect(kept) };
    }
    default: {
      const kept = q.answers.map((text, j) => ({ text, j })).filter((a) => a.text);
      return { ...base, answers: kept.map((a) => a.text), correct: q.type === "poll" ? [] : keepCorrect(kept) };
    }
  }
}

$("#save").addEventListener("click", async () => {
  collect();
  const title = $("#title").value.trim();
  const list = questions.map(compact);
  let error = title ? null : t("edit.err.title");
  for (const [i, q] of list.entries()) {
    if (error) break;
    const code = validateQuestion(q);
    if (code) error = `${t("edit.question", { n: i + 1 })}: ${t(`edit.err.${code}`)}`;
  }
  $("#error").textContent = error || "";
  if (error) return;

  const data = {
    ownerUid: user.uid,
    title,
    description: $("#description").value.trim(),
    questions: list,
    createdAt: createdAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (source) data.source = source;
  if (published) Object.assign(data, published);
  const button = $("#save");
  button.disabled = true;
  try {
    if (quizId) await setDoc(doc(fs, "quizzes", quizId), data);
    else quizId = (await addDoc(collection(fs, "quizzes"), data)).id;
    location.href = "dashboard.html";
  } catch (err) {
    console.error(err);
    $("#error").textContent = err.message;
    button.disabled = false;
  }
});
