// Host screen: drives the game state machine and computes scores.
//   lobby → question → reveal → leaderboard → (next question …) → podium
// The host browser is the game "server": it alone knows the correct answers
// until the reveal, and it alone may write state, scores and ranks (see rules).
import { auth, db, fs, serverNow } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import {
  ref, get, set, update, remove, onValue, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-database.js";
import {
  $, params, showView, escapeHTML, SHAPES, qKey, computePoints, streakBonus, rankPlayers, toast,
} from "./utils.js";

const pin = params().get("pin");
const base = `games/${pin}`;

let quiz = null;
let state;                 // undefined until loaded, null if the game was removed
let players = {};
let answers = {};
let reveal = null;
const loaded = { state: false, players: false, reveal: false };
let renderedKey = "";
let timerId = null;
let ending = false;

const fail = (msg) => { $("#h-error").textContent = msg; showView("error"); };

onAuthStateChanged(auth, async (user) => {
  if (!user || user.isAnonymous) return location.replace("dashboard.html");
  if (quiz) return;
  try {
    const meta = await get(ref(db, base));
    if (!meta.exists()) return fail("This game doesn't exist anymore.");
    const game = meta.val();
    if (game.hostUid !== user.uid) return fail("You are not the host of this game.");

    const quizSnap = await getDoc(doc(fs, "quizzes", game.quizId));
    if (!quizSnap.exists()) return fail("The quiz for this game was deleted.");
    quiz = quizSnap.data();
    listen();
  } catch (err) {
    console.error(err);
    fail(err.message);
  }
});

function listen() {
  onValue(ref(db, `${base}/state`), (s) => { state = s.val(); loaded.state = true; render(); });
  onValue(ref(db, `${base}/players`), (s) => { players = s.val() || {}; loaded.players = true; render(); });
  onValue(ref(db, `${base}/reveal`), (s) => { reveal = s.val(); loaded.reveal = true; render(); });
  onValue(ref(db, `${base}/answers`), (s) => { answers = s.val() || {}; render(); });
}

// ---------------------------------------------------------------- rendering

function render() {
  if (!loaded.state || !loaded.players || !loaded.reveal) return;
  if (state === null) return location.replace("dashboard.html");

  const key = `${state.phase}:${state.index}`;
  const fresh = key !== renderedKey;
  if (state.phase !== "question") stopTimer();

  switch (state.phase) {
    case "lobby":
      if (fresh) buildLobby();
      renderLobbyPlayers();
      showView("lobby");
      break;

    case "question":
      if (fresh) { buildQuestion(); startTimer(); }
      updateAnswerCount();
      showView("question");
      break;

    case "reveal":
      if (!reveal || reveal.key !== state.key) return; // wait for reveal data
      if (fresh) buildReveal();
      showView("reveal");
      break;

    case "leaderboard":
      if (fresh) buildBoard();
      showView("leaderboard");
      break;

    case "podium":
      if (fresh) buildPodium();
      showView("podium");
      break;
  }
  renderedKey = key;
}

function joinUrl() {
  return new URL(`index.html?pin=${pin}`, location.href).href;
}

function buildLobby() {
  $("#h-title").textContent = quiz.title;
  $("#h-pin").textContent = pin;
  $("#h-url").textContent = new URL("index.html", location.href).href.replace(/^https?:\/\//, "");
  const qr = $("#h-qr");
  if (!qr.dataset.done && window.QRCode) {
    new window.QRCode(qr, { text: joinUrl(), width: 150, height: 150 });
    qr.dataset.done = "1";
  }
  qr.hidden = !window.QRCode;
}

function renderLobbyPlayers() {
  const list = Object.entries(players).filter(([, p]) => p && p.nickname);
  $("#h-count").textContent = `${list.length} player${list.length === 1 ? "" : "s"}`;
  $("#h-start").disabled = list.length === 0;
  $("#h-waiting").textContent = list.length
    ? "Click a name to remove a player."
    : "Waiting for players…";
  $("#h-players").innerHTML = list.map(([uid, p]) => `
    <button class="chip ${p.connected === false ? "off" : ""}" data-uid="${uid}" title="Remove player">
      ${escapeHTML(p.nickname)}
    </button>`).join("");
}

function tileHTML(q, i, extraClass = "") {
  return `<div class="tile c${i} ${extraClass}">${SHAPES[i]}<span>${escapeHTML(q.answers[i])}</span></div>`;
}

function buildQuestion() {
  const q = quiz.questions[state.index];
  $("#h-qprogress").textContent = `Question ${state.index + 1} of ${state.total}`;
  $("#h-qtext").textContent = q.text;
  $("#h-qimage").innerHTML = q.imageUrl && /^https:\/\//.test(q.imageUrl)
    ? `<img src="${escapeHTML(q.imageUrl)}" alt="">` : "";
  $("#h-tiles").innerHTML = q.answers.map((_, i) => tileHTML(q, i)).join("");
}

function connectedPlayers() {
  return Object.values(players).filter((p) => p && p.nickname && p.connected !== false).length;
}

function updateAnswerCount() {
  if (state.phase !== "question") return;
  const count = Object.keys(answers[state.key] || {}).length;
  $("#h-answers").textContent = count;
  const expected = connectedPlayers();
  if (expected > 0 && count >= expected) endQuestion(); // everyone answered
}

function buildReveal() {
  const q = quiz.questions[state.index];
  const dist = reveal.distribution || [];
  const max = Math.max(1, ...dist);
  $("#h-rtext").textContent = q.text;
  $("#h-bars").innerHTML = q.answers.map((_, i) => {
    const n = dist[i] || 0;
    const ok = reveal.correct.includes(i);
    return `<div class="bar c${i} ${ok ? "" : "dim"}">
      <div class="n">${ok ? "✓ " : ""}${n}</div>
      <div class="fill" style="height:0%" data-h="${(n / max) * 85}"></div>
    </div>`;
  }).join("");
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.querySelectorAll("#h-bars .fill").forEach((el) => { el.style.height = `${el.dataset.h}%`; });
  }));
  $("#h-rtiles").innerHTML = q.answers
    .map((_, i) => tileHTML(q, i, reveal.correct.includes(i) ? "correct" : "dim")).join("");
}

function buildBoard() {
  const top = rankPlayers(players).slice(0, 5);
  $("#h-board").innerHTML = top.map((p) => `
    <div class="board-row"><span>${escapeHTML(p.nickname)}${p.streak >= 3 ? " 🔥" : ""}</span><span>${p.score}</span></div>`).join("")
    || `<p class="muted" style="text-align:center">No players.</p>`;
  const last = state.index + 1 >= state.total;
  $("#h-next").textContent = last ? "Show podium 🏆" : "Next question";
}

function buildPodium() {
  const ranked = rankPlayers(players);
  $("#h-ptitle").textContent = quiz.title;
  const slots = [[ranked[1], 2], [ranked[0], 1], [ranked[2], 3]]; // 2nd, 1st, 3rd
  $("#h-podium").innerHTML = slots.filter(([p]) => p).map(([p, place]) => `
    <div class="step p${place}">
      <div class="name">${escapeHTML(p.nickname)}</div>
      <div class="muted">${p.score} pts</div>
      <div class="block">${place}</div>
    </div>`).join("");
}

// ---------------------------------------------------------------- timer

function startTimer() {
  stopTimer();
  const tick = () => {
    const left = state.startedAt + state.timeLimit * 1000 - serverNow();
    $("#h-timer").textContent = Math.max(0, Math.ceil(left / 1000));
    if (left <= 0) endQuestion();
  };
  tick();
  timerId = setInterval(tick, 250);
}

function stopTimer() {
  clearInterval(timerId);
  timerId = null;
}

// ---------------------------------------------------------------- game actions

async function startQuestion(index) {
  const q = quiz.questions[index];
  await set(ref(db, `${base}/state`), {
    phase: "question",
    index,
    key: qKey(index),
    total: quiz.questions.length,
    startedAt: serverTimestamp(),
    timeLimit: q.timeLimit,
    answerCount: q.answers.length,
  });
}

async function endQuestion() {
  if (ending || state.phase !== "question") return;
  ending = true;
  stopTimer();
  try {
    const q = quiz.questions[state.index];
    const key = state.key;
    // Re-read answers from the server so late writes are not missed.
    const given = (await get(ref(db, `${base}/answers/${key}`))).val() || {};

    const distribution = q.answers.map(() => 0);
    Object.values(given).forEach((a) => {
      if (Number.isInteger(a.choice) && a.choice < distribution.length) distribution[a.choice]++;
    });

    const results = rankPlayers(players).map((p) => {
      const a = given[p.uid];
      const correct = !!a && q.correct.includes(a.choice);
      const streak = correct ? (p.streak || 0) + 1 : 0;
      const earned = computePoints(q, a, state.startedAt) + (correct && q.points > 0 ? streakBonus(streak) : 0);
      return {
        uid: p.uid, correct, streak, earned,
        score: p.score + earned,
        correctCount: (p.correctCount || 0) + (correct ? 1 : 0),
      };
    }).sort((a, b) => b.score - a.score);

    const updates = {};
    let rank = 0;
    results.forEach((r, i) => {
      if (i === 0 || r.score !== results[i - 1].score) rank = i + 1; // ties share a rank
      const p = `players/${r.uid}/`;
      updates[p + "score"] = r.score;
      updates[p + "streak"] = r.streak;
      updates[p + "lastPoints"] = r.earned;
      updates[p + "lastCorrect"] = r.correct;
      updates[p + "correctCount"] = r.correctCount;
      updates[p + "rank"] = rank;
    });
    updates.reveal = { key, correct: q.correct, distribution, answered: Object.keys(given).length };
    updates["state/phase"] = "reveal";

    // One atomic multi-path write: scores, reveal and phase change land together.
    await update(ref(db, base), updates);
  } catch (err) {
    console.error(err);
    toast("Could not end the question: " + err.message);
  } finally {
    ending = false;
  }
}

$("#h-start").addEventListener("click", () => startQuestion(0));
$("#h-skip").addEventListener("click", () => endQuestion());
$("#h-to-board").addEventListener("click", () => set(ref(db, `${base}/state/phase`), "leaderboard"));
$("#h-next").addEventListener("click", () => {
  const next = state.index + 1;
  if (next < state.total) startQuestion(next);
  else set(ref(db, `${base}/state/phase`), "podium");
});

$("#h-players").addEventListener("click", (e) => {
  const chip = e.target.closest("[data-uid]");
  if (chip && confirm(`Remove ${chip.textContent.trim()}?`)) {
    remove(ref(db, `${base}/players/${chip.dataset.uid}`));
  }
});

$("#h-csv").addEventListener("click", () => {
  const ranked = rankPlayers(players);
  const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = [["rank", "nickname", "score", "correct_answers", "questions"]]
    .concat(ranked.map((p) => [p.rank ?? "", p.nickname, p.score, p.correctCount || 0, state.total]));
  const csv = rows.map((r) => r.map(esc).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = `${quiz.title.replace(/[^\w-]+/g, "_")}_${pin}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
});

$("#h-end").addEventListener("click", async () => {
  if (!confirm("End the game? Players will be disconnected and results deleted (download the CSV first).")) return;
  await remove(ref(db, base));
  location.href = "dashboard.html";
});
