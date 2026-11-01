// Quiz editor: create or edit a quiz stored in Firestore.
import { auth, fs } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import {
  doc, getDoc, setDoc, addDoc, collection, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import { $, $$, params, showView, escapeHTML, SHAPES, toast } from "./utils.js";

const TIME_LIMITS = [5, 10, 20, 30, 60, 90, 120];
const POINTS = [[1000, "Standard"], [2000, "Double points"], [0, "No points"]];

let quizId = params().get("id");
let user = null;
let createdAt = null;
let questions = [];

const blankQuestion = () => ({
  text: "", imageUrl: "", timeLimit: 20, points: 1000, answers: ["", "", "", ""], correct: [],
});

onAuthStateChanged(auth, async (u) => {
  if (!u || u.isAnonymous) return location.replace("dashboard.html");
  if (user) return;
  user = u;
  if (quizId) {
    const snap = await getDoc(doc(fs, "quizzes", quizId));
    if (!snap.exists()) { toast("Quiz not found"); quizId = null; }
    else {
      const q = snap.data();
      $("#title").value = q.title || "";
      $("#description").value = q.description || "";
      createdAt = q.createdAt || null;
      questions = (q.questions || []).map((x) => ({
        ...blankQuestion(), ...x,
        answers: [...x.answers, "", "", "", ""].slice(0, 4),
      }));
    }
  }
  if (!questions.length) questions.push(blankQuestion());
  render();
  showView("editor");
});

function render() {
  $("#questions").innerHTML = questions.map((q, i) => `
    <section class="card q-card stack" data-index="${i}">
      <div class="row spread">
        <span class="q-num">Question ${i + 1}</span>
        <div class="row">
          <button class="btn small dark" data-action="up" ${i === 0 ? "disabled" : ""} aria-label="Move up">↑</button>
          <button class="btn small dark" data-action="down" ${i === questions.length - 1 ? "disabled" : ""} aria-label="Move down">↓</button>
          <button class="btn small dark" data-action="copy">Duplicate</button>
          <button class="btn small danger" data-action="remove">Delete</button>
        </div>
      </div>
      <input data-field="text" maxlength="200" placeholder="Type your question" value="${escapeHTML(q.text)}">
      <div class="grid-3">
        <input data-field="imageUrl" placeholder="Image URL (optional)" value="${escapeHTML(q.imageUrl)}">
        <select data-field="timeLimit" aria-label="Time limit">
          ${TIME_LIMITS.map((t) => `<option value="${t}" ${t === q.timeLimit ? "selected" : ""}>${t} seconds</option>`).join("")}
        </select>
        <select data-field="points" aria-label="Points">
          ${POINTS.map(([v, l]) => `<option value="${v}" ${v === q.points ? "selected" : ""}>${l}</option>`).join("")}
        </select>
      </div>
      <div class="answers-edit">
        ${q.answers.map((a, j) => `
          <div class="answer-edit c${j}">
            ${SHAPES[j]}
            <input type="text" data-answer="${j}" maxlength="75" placeholder="Answer ${j + 1}${j > 1 ? " (optional)" : ""}" value="${escapeHTML(a)}">
            <input type="checkbox" data-correct="${j}" ${q.correct.includes(j) ? "checked" : ""} title="Correct answer" aria-label="Answer ${j + 1} is correct">
          </div>`).join("")}
      </div>
    </section>`).join("");
}

// Read the form back into the model.
function collect() {
  questions = $$(".q-card").map((card) => ({
    text: $('[data-field="text"]', card).value.trim(),
    imageUrl: $('[data-field="imageUrl"]', card).value.trim(),
    timeLimit: Number($('[data-field="timeLimit"]', card).value),
    points: Number($('[data-field="points"]', card).value),
    answers: $$("[data-answer]", card).map((el) => el.value.trim()),
    correct: $$("[data-correct]", card).filter((el) => el.checked).map((el) => Number(el.dataset.correct)),
  }));
}

$("#questions").addEventListener("click", (e) => {
  const button = e.target.closest("button[data-action]");
  if (!button) return;
  collect();
  const i = Number(button.closest("[data-index]").dataset.index);
  const action = button.dataset.action;
  if (action === "remove") {
    if (questions.length === 1) return toast("A quiz needs at least one question.");
    questions.splice(i, 1);
  }
  if (action === "copy") questions.splice(i + 1, 0, structuredClone(questions[i]));
  if (action === "up") [questions[i - 1], questions[i]] = [questions[i], questions[i - 1]];
  if (action === "down") [questions[i + 1], questions[i]] = [questions[i], questions[i + 1]];
  render();
});

$("#add-question").addEventListener("click", () => {
  collect();
  questions.push(blankQuestion());
  render();
  $$(".q-card").at(-1).scrollIntoView({ behavior: "smooth" });
});

// Drop empty answer slots and remap correct indices to the compacted list.
function compact(q) {
  const kept = q.answers.map((text, j) => ({ text, j })).filter((a) => a.text);
  return {
    text: q.text,
    imageUrl: q.imageUrl,
    timeLimit: q.timeLimit,
    points: q.points,
    answers: kept.map((a) => a.text),
    correct: kept.map((a, k) => (q.correct.includes(a.j) ? k : -1)).filter((k) => k >= 0),
  };
}

function validate(title, list) {
  if (!title) return "Give your quiz a title.";
  for (const [i, q] of list.entries()) {
    const n = `Question ${i + 1}`;
    if (!q.text) return `${n}: the question text is empty.`;
    if (q.answers.length < 2) return `${n}: add at least two answers.`;
    if (!q.correct.length) return `${n}: tick at least one correct answer.`;
    if (q.imageUrl && !/^https:\/\//.test(q.imageUrl)) return `${n}: image URL must start with https://`;
  }
  return null;
}

$("#save").addEventListener("click", async () => {
  collect();
  const title = $("#title").value.trim();
  const list = questions.map(compact);
  const error = validate(title, list);
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
