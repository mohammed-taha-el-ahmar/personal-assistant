// Player screen: listens to the game state, sends one answer per question.
import { auth, db, serverNow } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import {
  ref, onValue, get, set, onDisconnect, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-database.js";
import { $, params, showView, SHAPES, qKey, toast, announce, vibrate } from "./utils.js";
import { t, initI18n, mountLangToggle, onLangChange, ordinal, shapeName } from "./i18n.js";

initI18n();
const controls = $("#controls");
mountLangToggle(controls);

// "Aa" toggle: show question and answer text on the device (accessibility / no projector view).
let textMode = localStorage.getItem("quizlive:textMode") === "1";
const textBtn = document.createElement("button");
textBtn.className = "icon-btn";
textBtn.textContent = "Aa";
const syncTextBtn = () => {
  textBtn.setAttribute("aria-pressed", String(textMode));
  textBtn.setAttribute("aria-label", t("play.textMode"));
  textBtn.title = t("play.textMode");
};
syncTextBtn();
textBtn.addEventListener("click", () => {
  textMode = !textMode;
  localStorage.setItem("quizlive:textMode", textMode ? "1" : "0");
  syncTextBtn();
  $("#p-tiles").dataset.key = ""; // force rebuild
  render();
});
controls.prepend(textBtn);

const pin = params().get("pin");
if (!/^\d{6}$/.test(pin || "")) location.replace("index.html");

const base = `games/${pin}`;
let uid = null;
let state;            // undefined = not loaded yet, null = game deleted
let me;               // undefined = not loaded yet, null = kicked / never joined
let reveal = null;
let lastKnown = { score: 0, rank: null };
let lastAnnounced = "";
const answered = new Set();   // question keys answered in this session
const checked = new Set();    // question keys already checked on the server
let timerId = null;

onLangChange(() => { syncTextBtn(); $("#p-tiles").dataset.key = ""; lastAnnounced = ""; render(); });

onAuthStateChanged(auth, (user) => {
  if (!user) return location.replace(`index.html?pin=${pin}`);
  if (uid) return;
  uid = user.uid;
  start();
});

function start() {
  const connectedRef = ref(db, `${base}/players/${uid}/connected`);
  const markOnline = () => {
    onDisconnect(connectedRef).set(false).catch(() => {});
    set(connectedRef, true).catch(() => {});
  };

  // Presence: reconnects re-mark us online; the server marks us offline when the socket drops.
  onValue(ref(db, ".info/connected"), (snap) => { if (snap.val() === true && me) markOnline(); });

  onValue(ref(db, `${base}/players/${uid}`), (snap) => {
    const firstLoad = me === undefined;
    me = snap.val();
    if (me) {
      lastKnown = { score: me.score || 0, rank: me.rank ?? lastKnown.rank };
      if (firstLoad) markOnline();
    }
    render();
  });

  onValue(ref(db, `${base}/state`), (snap) => { state = snap.val(); render(); });
  onValue(ref(db, `${base}/reveal`), (snap) => { reveal = snap.val(); render(); });
  onValue(ref(db, `${base}/hostOnline`), (snap) => {
    $("#p-host-offline").hidden = snap.val() !== false;
  });
}

function say(key, message) {
  // Announce each screen once to screen readers.
  if (lastAnnounced === key) return;
  lastAnnounced = key;
  announce(message);
}

function render() {
  if (state === undefined || me === undefined) return showView("loading");

  stopTimer();

  if (state === null) return showGone(t("play.gameOver"), finalLine());
  if (me === null) return showGone(t("play.notInGame"), t("play.removed"));

  $("#p-name").textContent = me.nickname;
  $("#p-score").textContent = me.score || 0;
  $("#p-progress").textContent = state.index >= 0 ? `${state.index + 1} / ${state.total}` : "";

  const key = state.key || "";
  switch (state.phase) {
    case "lobby":
      say("lobby", t("play.youreIn"));
      return showView("lobby");

    case "intro":
      $("#p-intro-num").textContent = t("common.questionOf", { n: state.index + 1, total: state.total });
      $("#p-intro-text").textContent = textMode ? state.question?.text || "" : "";
      say(`intro:${key}`, `${t("common.questionOf", { n: state.index + 1, total: state.total })}. ${t("play.getReady")}`);
      return showView("intro");

    case "question": {
      if (answered.has(key)) return showView("answered");
      if (!checked.has(key)) {
        // After a refresh we may already have answered: ask the server once.
        checked.add(key);
        get(ref(db, `gameAnswers/${pin}/${key}/${uid}`)).then((s) => {
          if (s.exists()) { answered.add(key); render(); }
        }).catch(() => {});
      }
      renderQuestion();
      startTimer();
      say(`q:${key}`, t("play.answerNow"));
      return showView("question");
    }

    case "reveal":
    case "leaderboard":
      if (!reveal || reveal.key !== key) return showView("answered");
      return renderResult();

    case "podium":
      return renderFinal();

    default:
      return showView("loading");
  }
}

function renderQuestion() {
  const tiles = $("#p-tiles");
  const key = state.key;
  const q = state.question || {};
  const qText = $("#p-qtext");
  qText.hidden = !textMode;
  qText.textContent = q.text || "";
  if (tiles.dataset.key === key) return; // already built for this question
  tiles.dataset.key = key;
  tiles.className = `tiles player-tiles n${state.answerCount}${textMode ? " text-mode" : ""}`;
  tiles.setAttribute("aria-label", t("play.chooseAnswer"));
  tiles.innerHTML = "";
  for (let i = 0; i < state.answerCount; i++) {
    const b = document.createElement("button");
    const answerText = q.answers?.[i] || "";
    b.className = `tile c${i}`;
    b.innerHTML = SHAPES[i] + (textMode ? `<span></span>` : "");
    if (textMode) b.querySelector("span").textContent = answerText;
    b.setAttribute("aria-label", `${shapeName(i)}${answerText ? `: ${answerText}` : ""}`);
    b.addEventListener("click", () => sendAnswer(i));
    tiles.append(b);
  }
}

async function sendAnswer(choice) {
  const key = state.key;
  if (answered.has(key)) return;
  answered.add(key);
  vibrate(40);
  showView("answered");
  announce(t("play.locked"));
  try {
    await set(ref(db, `gameAnswers/${pin}/${key}/${uid}`), { choice, at: serverTimestamp() });
  } catch (err) {
    console.error(err);
    toast(t("play.tooLate"));
  }
}

function renderResult() {
  const ok = !!me.lastCorrect;
  const didAnswer = answered.has(state.key) || me.lastAnswered;
  const box = $("#p-result");
  box.classList.toggle("ok", ok);
  box.classList.toggle("bad", !ok);
  const verdict = ok ? t("play.correct") : (didAnswer ? t("play.incorrect") : t("play.timeUp"));
  $("#p-verdict").textContent = verdict;
  $("#p-points").textContent = `+ ${ok ? me.lastPoints || 0 : 0}`;
  $("#p-streak").textContent = me.streak >= 2 ? `🔥 ${t("play.streak", { n: me.streak })}` : "";
  $("#p-rank").textContent = me.rank ? t("play.rank", { place: ordinal(me.rank) }) : "";
  $("#p-gap").textContent = me.rank === 1
    ? t("play.leading")
    : (me.ahead ? t("play.behind", { points: me.gap, name: me.ahead }) : "");

  const resultKey = `res:${state.key}`;
  if (lastAnnounced !== resultKey) {
    vibrate(ok ? [60] : [30, 60, 30]);
    say(resultKey, `${verdict}. ${$("#p-rank").textContent} ${$("#p-gap").textContent}`);
  }
  showView("result");
}

function renderFinal() {
  $("#p-final-rank").textContent = me.rank ? t("play.finalRank", { place: ordinal(me.rank) }) : t("play.thanks");
  $("#p-sum-score").textContent = me.score || 0;
  $("#p-sum-correct").textContent = `${me.correctCount || 0}/${state.total}`;
  $("#p-sum-streak").textContent = me.bestStreak || 0;
  say("final", $("#p-final-rank").textContent);
  showView("final");
}

function startTimer() {
  const bar = $("#p-timebar");
  bar.hidden = false;
  bar.setAttribute("aria-valuemax", state.timeLimit);
  const tick = () => {
    const total = state.timeLimit * 1000;
    const left = Math.max(0, state.startedAt + total - serverNow());
    bar.firstElementChild.style.width = `${(left / total) * 100}%`;
    const secs = Math.ceil(left / 1000);
    bar.setAttribute("aria-valuenow", secs);
    bar.setAttribute("aria-valuetext", t("play.secondsLeft", { n: secs }));
  };
  tick();
  timerId = setInterval(tick, 200);
}

function stopTimer() {
  clearInterval(timerId);
  timerId = null;
  $("#p-timebar").hidden = true;
}

function showGone(title, text) {
  $("#p-gone-title").textContent = title;
  $("#p-gone-text").textContent = text;
  $("#p-host-offline").hidden = true;
  showView("gone");
}

function finalLine() {
  if (!lastKnown.rank) return t("play.thanks");
  return t("play.finished", { place: ordinal(lastKnown.rank), points: lastKnown.score });
}
