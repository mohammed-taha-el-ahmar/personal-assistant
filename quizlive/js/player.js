// Player screen: listens to the game state, sends one answer per question.
import { auth, db, serverNow } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import {
  ref, onValue, get, set, onDisconnect, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-database.js";
import { $, params, showView, SHAPES, SHAPE_NAMES, qKey, toast } from "./utils.js";

const pin = params().get("pin");
if (!/^\d{6}$/.test(pin || "")) location.replace("index.html");

const base = `games/${pin}`;
let uid = null;
let state;            // undefined = not loaded yet, null = game deleted
let me;               // undefined = not loaded yet, null = kicked
let reveal = null;
let lastKnown = { score: 0, rank: null };
const answered = new Set();   // question keys answered in this session
const checked = new Set();    // question keys already checked on the server
let timerId = null;

onAuthStateChanged(auth, (user) => {
  if (!user) return location.replace(`index.html?pin=${pin}`);
  if (uid) return;
  uid = user.uid;
  start();
});

function start() {
  const connectedRef = ref(db, `${base}/players/${uid}/connected`);

  // Presence: mark connected, and let the server mark us offline when the socket drops.
  onValue(ref(db, ".info/connected"), async (snap) => {
    if (snap.val() !== true || !me) return;
    try {
      await onDisconnect(connectedRef).set(false);
      await set(connectedRef, true);
    } catch (e) { /* kicked or game removed */ }
  });

  onValue(ref(db, `${base}/players/${uid}`), (snap) => {
    const wasLoaded = me !== undefined;
    me = snap.val();
    if (me) {
      lastKnown = { score: me.score || 0, rank: me.rank ?? lastKnown.rank };
      if (!wasLoaded) set(connectedRef, true).catch(() => {});
      if (!wasLoaded) onDisconnect(connectedRef).set(false).catch(() => {});
    }
    render();
  });

  onValue(ref(db, `${base}/state`), (snap) => { state = snap.val(); render(); });
  onValue(ref(db, `${base}/reveal`), (snap) => { reveal = snap.val(); render(); });
}

function render() {
  if (state === undefined || me === undefined) return showView("loading");

  stopTimer();

  if (state === null) return showGone("Game over", finalLine());
  if (me === null) {
    // Never joined (direct link) or removed by the host.
    return showGone("You're not in this game", "The host may have removed you.");
  }

  $("#p-name").textContent = me.nickname;
  $("#p-score").textContent = me.score || 0;
  $("#p-progress").textContent = state.index >= 0 ? `${state.index + 1} / ${state.total}` : "";

  switch (state.phase) {
    case "lobby":
      return showView("lobby");

    case "question": {
      const key = qKey(state.index);
      if (answered.has(key)) return showView("answered");
      if (!checked.has(key)) {
        // After a refresh we may already have answered: ask the server once.
        checked.add(key);
        get(ref(db, `${base}/answers/${key}/${uid}`)).then((s) => {
          if (s.exists()) { answered.add(key); render(); }
        });
      }
      renderTiles(state.answerCount);
      startTimer();
      return showView("question");
    }

    case "reveal":
    case "leaderboard":
      if (!reveal || reveal.key !== qKey(state.index)) return showView("answered");
      return renderResult();

    case "podium":
    case "ended":
      $("#p-final-rank").textContent = me.rank ? ordinal(me.rank) + " place" : "Thanks for playing!";
      $("#p-final-score").textContent = `${me.score || 0} points`;
      return showView("final");

    default:
      return showView("loading");
  }
}

function renderTiles(count) {
  const tiles = $("#p-tiles");
  const key = qKey(state.index);
  if (tiles.dataset.key === key) return; // already built for this question
  tiles.dataset.key = key;
  tiles.className = `tiles player-tiles n${count}`;
  tiles.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const b = document.createElement("button");
    b.className = `tile c${i}`;
    b.innerHTML = SHAPES[i];
    b.setAttribute("aria-label", SHAPE_NAMES[i]);
    b.addEventListener("click", () => sendAnswer(i));
    tiles.append(b);
  }
}

async function sendAnswer(choice) {
  const key = qKey(state.index);
  if (answered.has(key)) return;
  answered.add(key);
  showView("answered");
  try {
    await set(ref(db, `${base}/answers/${key}/${uid}`), { choice, at: serverTimestamp() });
  } catch (err) {
    console.error(err);
    toast("Too late — answer not counted");
  }
}

function renderResult() {
  const ok = !!me.lastCorrect;
  const box = $("#p-result");
  box.classList.toggle("ok", ok);
  box.classList.toggle("bad", !ok);
  $("#p-verdict").textContent = ok ? "Correct!" : (answered.has(qKey(state.index)) ? "Incorrect" : "Time's up");
  $("#p-points").textContent = ok ? `+ ${me.lastPoints || 0}` : "+ 0";
  $("#p-streak").textContent = me.streak >= 2 ? `🔥 Answer streak: ${me.streak}` : "";
  $("#p-rank").textContent = me.rank ? `You're in ${ordinal(me.rank)} place` : "";
  showView("result");
}

function startTimer() {
  const bar = $("#p-timebar");
  bar.hidden = false;
  const tick = () => {
    const total = state.timeLimit * 1000;
    const left = Math.max(0, state.startedAt + total - serverNow());
    bar.firstElementChild.style.width = `${(left / total) * 100}%`;
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
  showView("gone");
}

function finalLine() {
  if (!lastKnown.rank) return "Thanks for playing!";
  return `You finished ${ordinal(lastKnown.rank)} with ${lastKnown.score} points.`;
}

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
