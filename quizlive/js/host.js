// Host screen: drives the game state machine, computes scores and logs analytics.
//   lobby → intro → question → reveal → leaderboard → (next intro …) → podium
// The host browser is the game "server": it alone knows the correct answers until
// the reveal, it alone can read players' answers (gameAnswers/{pin}), and it alone
// may write state, scores and ranks (see database.rules.json).
import { auth, db, fs, serverNow } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import {
  doc, getDoc, setDoc, writeBatch, serverTimestamp as fsTimestamp,
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import {
  ref, get, set, update, onValue, onDisconnect, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-database.js";
import {
  $, $$, params, showView, escapeHTML, SHAPES, qKey, computePoints, streakBonus,
  rankPlayers, toast, downloadCSV, INTRO_MS,
} from "./utils.js";
import { t, initI18n, mountLangToggle, onLangChange, shapeName } from "./i18n.js";
import { sound } from "./sound.js";

initI18n();

const pin = params().get("pin");
const base = `games/${pin}`;
const answersBase = `gameAnswers/${pin}`;

let user = null;
let quiz = null;
let quizId = null;
let sessionId = null;
let state;                 // undefined until loaded, null if the game was removed
let players = {};
let answers = {};
let reveal = null;
const loaded = { state: false, players: false, reveal: false };
let renderedKey = "";
let timerId = null;
let introTimer = null;
let ending = false;
let lastSecond = null;
let presenceRef = null;

const fail = (msg) => { $("#h-error").textContent = msg; showView("error"); };

// ---------------------------------------------------------------- controls

const controls = $("#controls");
mountLangToggle(controls);

const soundBtn = document.createElement("button");
soundBtn.className = "icon-btn";
const syncSoundBtn = () => {
  soundBtn.textContent = sound.isMuted() ? "🔇" : "🔊";
  soundBtn.setAttribute("aria-label", t(sound.isMuted() ? "host.unmute" : "host.mute"));
  soundBtn.title = soundBtn.getAttribute("aria-label");
};
soundBtn.addEventListener("click", () => {
  sound.setMuted(!sound.isMuted());
  syncSoundBtn();
  if (!sound.isMuted()) playLoopForPhase();
});
syncSoundBtn();

const fsBtn = document.createElement("button");
fsBtn.className = "icon-btn";
fsBtn.textContent = "⛶";
const syncFsBtn = () => {
  fsBtn.setAttribute("aria-label", t(document.fullscreenElement ? "host.exitFullscreen" : "host.fullscreen"));
  fsBtn.title = fsBtn.getAttribute("aria-label");
};
fsBtn.addEventListener("click", () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.();
});
document.addEventListener("fullscreenchange", syncFsBtn);
syncFsBtn();
controls.prepend(soundBtn, fsBtn);

// Audio can only start after a user gesture.
document.addEventListener("pointerdown", async () => {
  await sound.unlock();
  playLoopForPhase();
}, { once: true });

onLangChange(() => { syncSoundBtn(); syncFsBtn(); renderedKey = ""; render(); });

// ---------------------------------------------------------------- boot

onAuthStateChanged(auth, async (u) => {
  if (!u || u.isAnonymous) return location.replace("dashboard.html");
  if (quiz) return;
  user = u;
  try {
    const meta = await get(ref(db, base));
    if (!meta.exists()) return fail(t("host.err.gone"));
    const game = meta.val();
    if (game.hostUid !== user.uid) return fail(t("host.err.notHost"));

    quizId = game.quizId;
    sessionId = game.sessionId || `${pin}_${game.createdAt || Date.now()}`;
    const quizSnap = await getDoc(doc(fs, "quizzes", quizId));
    if (!quizSnap.exists()) return fail(t("host.err.quizDeleted"));
    quiz = quizSnap.data();
    trackPresence();
    listen();
  } catch (err) {
    console.error(err);
    fail(err.message);
  }
});

// Host presence: players see "host reconnecting" when this flips to false.
function trackPresence() {
  presenceRef = ref(db, `${base}/hostOnline`);
  onValue(ref(db, ".info/connected"), (snap) => {
    if (snap.val() !== true) return;
    onDisconnect(presenceRef).set(false).catch(() => {});
    set(presenceRef, true).catch(() => {});
  });
}

function listen() {
  onValue(ref(db, `${base}/state`), (s) => { state = s.val(); loaded.state = true; render(); });
  onValue(ref(db, `${base}/players`), (s) => { players = s.val() || {}; loaded.players = true; render(); });
  onValue(ref(db, `${base}/reveal`), (s) => { reveal = s.val(); loaded.reveal = true; render(); });
  onValue(ref(db, answersBase), (s) => { answers = s.val() || {}; render(); });
}

// ---------------------------------------------------------------- rendering

function render() {
  if (!loaded.state || !loaded.players || !loaded.reveal) return;
  if (state === null) return location.replace("dashboard.html");

  const key = `${state.phase}:${state.index}`;
  const fresh = key !== renderedKey;
  if (state.phase !== "question") stopTimer();
  if (state.phase !== "intro") clearTimeout(introTimer);

  switch (state.phase) {
    case "lobby":
      if (fresh) buildLobby();
      renderLobbyPlayers(fresh);
      break;

    case "intro":
      if (fresh) { buildIntro(); scheduleOpen(); }
      break;

    case "question":
      if (fresh) { buildQuestion(); startTimer(); }
      updateAnswerCount();
      break;

    case "reveal":
      if (!reveal || reveal.key !== state.key) return; // wait for reveal data
      if (fresh) { buildReveal(); sound.reveal(); }
      break;

    case "leaderboard":
      if (fresh) buildBoard();
      break;

    case "podium":
      if (fresh) { buildPodium(); sound.fanfare(); }
      break;
  }
  if (fresh) {
    showView(state.phase);
    playLoopForPhase();
  }
  renderedKey = key;
}

function playLoopForPhase() {
  if (!state) return;
  if (state.phase === "lobby") sound.startLoop("lobby");
  else if (state.phase === "question") sound.startLoop("think");
  else sound.stopLoop();
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
  $("#h-start").textContent = t("host.start");
}

// Incremental render so only newcomers animate in.
function renderLobbyPlayers(fresh) {
  const list = Object.entries(players).filter(([, p]) => p && p.nickname);
  const container = $("#h-players");
  const current = new Set(list.map(([uid]) => uid));
  $$("[data-uid]", container).forEach((el) => { if (!current.has(el.dataset.uid)) el.remove(); });

  let newcomers = 0;
  for (const [uid, p] of list) {
    let chip = container.querySelector(`[data-uid="${uid}"]`);
    if (!chip) {
      chip = document.createElement("button");
      chip.className = fresh ? "chip" : "chip pop";
      chip.dataset.uid = uid;
      chip.textContent = p.nickname;
      container.append(chip);
      newcomers++;
    }
    chip.setAttribute("aria-label", t("host.removePlayer", { name: p.nickname }));
    chip.classList.toggle("off", p.connected === false);
  }
  if (newcomers && !fresh) sound.join();

  $("#h-count").textContent = t("host.players", { n: list.length });
  $("#h-start").disabled = list.length === 0;
  $("#h-waiting").textContent = list.length ? t("host.clickToRemove") : t("host.waiting");
}

function buildIntro() {
  const q = quiz.questions[state.index];
  $("#h-intro-num").textContent = t("common.questionOf", { n: state.index + 1, total: state.total });
  $("#h-intro-text").textContent = q.text;
  const bar = $("#h-intro-bar");
  const left = Math.max(0, state.introEndsAt - serverNow());
  bar.classList.remove("run");
  void bar.offsetWidth; // restart the CSS animation
  bar.firstElementChild.style.animationDuration = `${left}ms`;
  bar.classList.add("run");
  sound.intro();
}

function tileHTML(q, i, extraClass = "") {
  return `<div class="tile c${i} ${extraClass}" aria-label="${shapeName(i)}: ${escapeHTML(q.answers[i])}">
    ${SHAPES[i]}<span>${escapeHTML(q.answers[i])}</span></div>`;
}

function buildQuestion() {
  const q = quiz.questions[state.index];
  $("#h-qprogress").textContent = t("common.questionOf", { n: state.index + 1, total: state.total });
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
    return `<div class="bar c${i} ${ok ? "" : "dim"}" aria-label="${shapeName(i)}: ${n}${ok ? `, ${t("host.correctAnswer")}` : ""}">
      <div class="n">${ok ? "✓ " : ""}${n}</div>
      <div class="fill" style="height:0%" data-h="${(n / max) * 85}"></div>
    </div>`;
  }).join("");
  requestAnimationFrame(() => requestAnimationFrame(() => {
    $$("#h-bars .fill").forEach((el) => { el.style.height = `${el.dataset.h}%`; });
  }));
  $("#h-rtiles").innerHTML = q.answers
    .map((_, i) => tileHTML(q, i, reveal.correct.includes(i) ? "correct" : "dim")).join("");
}

function buildBoard() {
  const top = rankPlayers(players).slice(0, 5);
  $("#h-board").innerHTML = top.map((p) => `
    <div class="board-row"><span>${escapeHTML(p.nickname)}${p.streak >= 3 ? " 🔥" : ""}</span><span>${p.score}</span></div>`).join("")
    || `<p class="muted" style="text-align:center">${t("host.noPlayers")}</p>`;
  const last = state.index + 1 >= state.total;
  $("#h-next").textContent = last ? `${t("host.showPodium")} 🏆` : t("host.nextQuestion");
}

function buildPodium() {
  const ranked = rankPlayers(players);
  $("#h-ptitle").textContent = quiz.title;
  const slots = [[ranked[1], 2], [ranked[0], 1], [ranked[2], 3]]; // 2nd, 1st, 3rd
  $("#h-podium").innerHTML = slots.filter(([p]) => p).map(([p, place]) => `
    <div class="step p${place}">
      <div class="name">${escapeHTML(p.nickname)}</div>
      <div class="muted">${p.score} ${t("common.pts")}</div>
      <div class="block" aria-hidden="true">${place}</div>
    </div>`).join("");
}

// ---------------------------------------------------------------- timers

function scheduleOpen() {
  clearTimeout(introTimer);
  const wait = Math.max(0, state.introEndsAt - serverNow());
  const index = state.index;
  introTimer = setTimeout(() => openQuestion(index), wait);
}

function startTimer() {
  stopTimer();
  lastSecond = null;
  const tick = () => {
    const left = state.startedAt + state.timeLimit * 1000 - serverNow();
    const secs = Math.max(0, Math.ceil(left / 1000));
    $("#h-timer").textContent = secs;
    if (secs !== lastSecond) {
      if (secs > 0 && secs <= 5) sound.urgent();
      lastSecond = secs;
    }
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
  if (index === 0) logSessionStart();
  await set(ref(db, `${base}/state`), {
    phase: "intro",
    index,
    key: qKey(index),
    total: quiz.questions.length,
    introEndsAt: serverNow() + INTRO_MS,
    timeLimit: q.timeLimit,
    answerCount: q.answers.length,
    // Text only, never the correct answers: lets players read on their own device.
    question: { text: q.text, answers: q.answers },
  });
}

async function openQuestion(index) {
  if (!state || state.phase !== "intro" || state.index !== index) return;
  await update(ref(db, `${base}/state`), { phase: "question", startedAt: serverTimestamp() });
}

async function endQuestion() {
  if (ending || state.phase !== "question") return;
  ending = true;
  stopTimer();
  sound.stopLoop();
  sound.gong();
  try {
    const q = quiz.questions[state.index];
    const key = state.key;
    const startedAt = state.startedAt;
    // Re-read answers from the server so late writes are not missed.
    const given = (await get(ref(db, `${answersBase}/${key}`))).val() || {};

    const distribution = q.answers.map(() => 0);
    Object.values(given).forEach((a) => {
      if (Number.isInteger(a.choice) && a.choice < distribution.length) distribution[a.choice]++;
    });

    const results = rankPlayers(players).map((p) => {
      const a = given[p.uid];
      const correct = !!a && q.correct.includes(a.choice);
      const streak = correct ? (p.streak || 0) + 1 : 0;
      const points = computePoints(q, a, startedAt);
      const bonus = correct && q.points > 0 ? streakBonus(streak) : 0;
      return {
        uid: p.uid,
        nickname: p.nickname,
        answer: a || null,
        correct,
        streak,
        bestStreak: Math.max(p.bestStreak || 0, streak),
        earned: points + bonus,
        bonus,
        score: p.score + points + bonus,
        correctCount: (p.correctCount || 0) + (correct ? 1 : 0),
      };
    }).sort((a, b) => b.score - a.score);

    const updates = {};
    let rank = 0;
    results.forEach((r, i) => {
      if (i === 0 || r.score !== results[i - 1].score) rank = i + 1; // ties share a rank
      r.rank = rank;
      // Who is just ahead (strictly higher score), and by how much.
      const above = results.slice(0, i).reverse().find((o) => o.score > r.score);
      const p = `players/${r.uid}/`;
      updates[p + "score"] = r.score;
      updates[p + "streak"] = r.streak;
      updates[p + "bestStreak"] = r.bestStreak;
      updates[p + "lastPoints"] = r.earned;
      updates[p + "lastCorrect"] = r.correct;
      updates[p + "lastAnswered"] = !!r.answer;
      updates[p + "correctCount"] = r.correctCount;
      updates[p + "rank"] = rank;
      updates[p + "gap"] = above ? above.score - r.score : 0;
      updates[p + "ahead"] = above ? above.nickname : null;
    });
    updates.reveal = { key, correct: q.correct, distribution, answered: Object.keys(given).length };
    updates["state/phase"] = "reveal";

    // One atomic multi-path write: scores, reveal and phase change land together.
    await update(ref(db, base), updates);

    // Analytics is best-effort and must never block the game.
    logAnswerEvents(state.index, q, startedAt, results).catch((err) => console.warn("analytics", err));
  } catch (err) {
    console.error(err);
    toast(`${t("host.err.endQuestion")} ${err.message}`);
  } finally {
    ending = false;
  }
}

// ---------------------------------------------------------------- analytics (Firestore)
// gameSessions/{sessionId}: one document per game.
// answerEvents/{sessionId}_q{i}_{playerUid}: one row per player per question (including
// "no answer"). Deterministic ids make writes idempotent: a retry overwrites, never duplicates.

const SCHEMA_VERSION = 1;

function logSessionStart() {
  setDoc(doc(fs, "gameSessions", sessionId), {
    schemaVersion: SCHEMA_VERSION,
    ownerUid: user.uid,
    quizId,
    quizTitle: quiz.title,
    pin,
    status: "running",
    questionCount: quiz.questions.length,
    playerCount: rankPlayers(players).length,
    startedAt: fsTimestamp(),
  }, { merge: true }).catch((err) => console.warn("analytics", err));
}

async function logAnswerEvents(index, q, startedAt, results) {
  const batch = writeBatch(fs);
  for (const r of results) {
    const a = r.answer;
    batch.set(doc(fs, "answerEvents", `${sessionId}_q${index}_${r.uid}`), {
      schemaVersion: SCHEMA_VERSION,
      ownerUid: user.uid,
      sessionId,
      quizId,
      quizTitle: quiz.title,
      questionIndex: index,
      questionText: q.text,
      answerOptions: q.answers,
      correctChoices: q.correct,
      timeLimitMs: q.timeLimit * 1000,
      pointsValue: q.points,
      playerId: r.uid,
      nickname: r.nickname,
      answered: !!a,
      choice: a ? a.choice : null,
      correct: r.correct,
      responseMs: a ? Math.max(0, a.at - startedAt) : null,
      pointsEarned: r.earned,
      streakBonus: r.bonus,
      streakAfter: r.streak,
      rankAfter: r.rank,
      scoreAfter: r.score,
      questionStartedAt: startedAt,
      loggedAt: fsTimestamp(),
    });
  }
  await batch.commit(); // up to 500 players per question
}

function logSessionEnd() {
  const ranked = rankPlayers(players);
  setDoc(doc(fs, "gameSessions", sessionId), {
    status: "completed",
    endedAt: fsTimestamp(),
    playerCount: ranked.length,
    leaderboard: ranked.map((p) => ({
      rank: p.rank ?? null, nickname: p.nickname, score: p.score, correctCount: p.correctCount || 0,
    })),
  }, { merge: true }).catch((err) => console.warn("analytics", err));
}

// ---------------------------------------------------------------- buttons

$("#h-start").addEventListener("click", () => { sound.unlock(); startQuestion(0); });
$("#h-skip").addEventListener("click", () => endQuestion());
$("#h-to-board").addEventListener("click", () => set(ref(db, `${base}/state/phase`), "leaderboard"));
$("#h-next").addEventListener("click", async () => {
  const next = state.index + 1;
  if (next < state.total) return startQuestion(next);
  await set(ref(db, `${base}/state/phase`), "podium");
  logSessionEnd();
});

$("#h-players").addEventListener("click", (e) => {
  const chip = e.target.closest("[data-uid]");
  if (chip && confirm(t("host.confirmRemove", { name: chip.textContent.trim() }))) {
    set(ref(db, `${base}/players/${chip.dataset.uid}`), null);
  }
});

$("#h-csv").addEventListener("click", () => {
  const ranked = rankPlayers(players);
  downloadCSV(`${quiz.title.replace(/[^\w-]+/g, "_")}_${pin}.csv`,
    [["rank", "nickname", "score", "correct_answers", "questions", "best_streak"]]
      .concat(ranked.map((p) => [p.rank ?? "", p.nickname, p.score, p.correctCount || 0, state.total, p.bestStreak || 0])));
});

$("#h-end").addEventListener("click", async () => {
  if (!confirm(t("host.confirmEnd"))) return;
  sound.stopLoop();
  await onDisconnect(presenceRef).cancel().catch(() => {});
  // Rules are evaluated against the data before the write, so both deletes pass together.
  await update(ref(db), { [base]: null, [answersBase]: null });
  location.href = "dashboard.html";
});
