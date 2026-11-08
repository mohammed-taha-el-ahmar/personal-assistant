// In-app analytics for one quiz, computed from the answerEvents collection.
// For cross-quiz analysis at scale, see analytics/ (BigQuery export + SQL models).
import { auth, fs } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import {
  collection, query, where, getDocs, doc, getDoc,
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import { $, params, showView, escapeHTML, SHAPES, median, downloadCSV } from "./utils.js";
import { groupTyped } from "./questions.js";
import { t, initI18n, mountLangToggle, onLangChange, intlLocale } from "./i18n.js";

initI18n();
mountLangToggle($("#controls"));

const quizId = params().get("quiz");
let user = null;
let quizTitle = "";
let events = [];
let sessions = [];

onAuthStateChanged(auth, async (u) => {
  if (!u || u.isAnonymous) return location.replace("dashboard.html");
  if (user) return;
  user = u;
  if (!quizId) return location.replace("dashboard.html");

  const [quizSnap, evSnap, sessSnap] = await Promise.all([
    getDoc(doc(fs, "quizzes", quizId)).catch(() => null),
    getDocs(query(collection(fs, "answerEvents"), where("ownerUid", "==", u.uid), where("quizId", "==", quizId))),
    getDocs(query(collection(fs, "gameSessions"), where("ownerUid", "==", u.uid), where("quizId", "==", quizId))),
  ]);
  quizTitle = quizSnap?.exists() ? quizSnap.data().title : "";
  events = evSnap.docs.map((d) => d.data());
  sessions = sessSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.startedAt?.seconds || 0) - (a.startedAt?.seconds || 0));

  if (!events.length) return showView("empty");
  quizTitle ||= events[0].quizTitle;
  render();
  showView("stats");
});

onLangChange(() => { if (events.length) render(); });
$("#s-session").addEventListener("change", () => renderStats());

const fmtDate = (ts) => ts?.seconds
  ? new Date(ts.seconds * 1000).toLocaleString(intlLocale(), { dateStyle: "medium", timeStyle: "short" })
  : "—";
const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);
const secs = (ms) => (ms == null ? "—" : `${(ms / 1000).toFixed(1)} s`);

function render() {
  $("#s-title").textContent = quizTitle;
  const select = $("#s-session");
  const current = select.value;
  const withEvents = new Set(events.map((e) => e.sessionId));
  select.innerHTML = `<option value="">${t("stats.allSessions")}</option>` + sessions
    .filter((s) => withEvents.has(s.id))
    .map((s) => `<option value="${s.id}">${fmtDate(s.startedAt)} · ${t("host.players", { n: s.playerCount || 0 })}</option>`)
    .join("");
  select.value = current;
  renderStats();
  renderSessions();
}

function filtered() {
  const sid = $("#s-session").value;
  return sid ? events.filter((e) => e.sessionId === sid) : events;
}

function renderStats() {
  const rows = filtered();
  const answered = rows.filter((e) => e.answered);
  // Polls have no right answer: they are left out of accuracy.
  const scoredRows = rows.filter((e) => (e.questionType || "quiz") !== "poll");
  const correct = scoredRows.filter((e) => e.correct);
  const kpis = [
    [new Set(rows.map((e) => e.sessionId)).size, t("stats.kpiSessions")],
    [new Set(rows.map((e) => e.playerId)).size, t("stats.kpiPlayers")],
    [`${pct(correct.length, scoredRows.length)}%`, t("stats.kpiCorrect")],
    [`${pct(answered.length, rows.length)}%`, t("stats.kpiAnswerRate")],
    [secs(median(answered.map((e) => e.responseMs))), t("stats.kpiMedian")],
  ];
  $("#s-kpis").innerHTML = kpis.map(([v, l]) => `<div class="kpi"><div class="v">${v}</div><div class="l">${l}</div></div>`).join("");

  // Group by question (index + text, so edited questions are not merged with old versions).
  const groups = new Map();
  for (const e of rows) {
    const k = `${e.questionIndex}|${e.questionText}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(e);
  }
  const cards = [...groups.values()]
    .sort((a, b) => a[0].questionIndex - b[0].questionIndex)
    .map(questionCard);
  $("#s-questions").innerHTML = cards.join("");
}

function optionLabel(e, i) {
  const type = e.questionType || "quiz";
  if (type === "truefalse") return t(i === 0 ? "qt.true" : "qt.false");
  if (type === "images") return e.answerOptions?.[i] || t("stats.image", { n: i + 1 });
  return e.answerOptions?.[i] || "";
}

function questionCard(list) {
  const q = list[0];
  const type = q.questionType || "quiz";
  const isPoll = type === "poll";
  const total = list.length;
  const nCorrect = list.filter((e) => e.correct).length;
  const answeredList = list.filter((e) => e.answered);
  const rate = pct(nCorrect, total);
  const correctChoices = q.correctChoices || [];

  let body = "";
  let trap = false;
  if (type === "typeAnswer") {
    // Private to the host: the most common typed answers, right and wrong.
    const top = groupTyped({ type, accepted: q.acceptedAnswers || [] }, answeredList.map((e) => ({ text: e.textAnswer }))).slice(0, 8);
    body = `<p class="typed-accepted">${t("stats.accepted")}: <strong>${escapeHTML((q.acceptedAnswers || []).join(" / "))}</strong></p>
      <ol class="typed-top">${top.map((g) => `<li class="${g.correct ? "ok" : ""}">
        <span>${g.correct ? "✓ " : ""}${escapeHTML(g.text)}</span><b>${g.count}</b></li>`).join("")}</ol>`;
  } else {
    const n = type === "truefalse" ? 2 : (q.answerOptions || []).length;
    const counts = Array.from({ length: n }, (_, i) => answeredList.filter((e) => e.choice === i).length);
    const bestCorrect = Math.max(0, ...correctChoices.map((i) => counts[i] || 0));
    trap = !isPoll && counts.some((c, i) => !correctChoices.includes(i) && c > bestCorrect && c > 0);
    const maxCount = Math.max(1, ...counts);
    body = counts.map((c, i) => {
      const ok = !isPoll && correctChoices.includes(i);
      const w = (c / maxCount) * 100;
      return `<div class="hbar ${ok || isPoll ? "" : "wrong"}">
        <span class="shape c${i}-bg" aria-hidden="true">${SHAPES[i]}</span>
        <div class="track"><div class="fill c${i}-bg" style="width:${Math.max(w, 2)}%">${ok ? "✓ " : ""}${escapeHTML(optionLabel(q, i))}</div></div>
        <span>${c} · ${pct(c, answeredList.length)}%</span>
      </div>`;
    }).join("");
  }

  const flags = [`<span class="flag type">${t(`qt.${type}`)}</span>`];
  if (!isPoll && total >= 3 && rate < 35) flags.push(`<span class="flag hard">${t("stats.flagHard")}</span>`);
  if (!isPoll && total >= 3 && rate >= 90) flags.push(`<span class="flag easy">${t("stats.flagEasy")}</span>`);
  if (trap) flags.push(`<span class="flag trap">${t("stats.flagTrap")}</span>`);

  const line = isPoll
    ? t("stats.pollLine", { noAnswer: pct(total - answeredList.length, total), n: total })
    : t("stats.qLine", {
      correct: rate,
      noAnswer: pct(total - answeredList.length, total),
      median: secs(median(answeredList.map((e) => e.responseMs))),
      n: total,
    });

  return `<article class="card stat-q">
    <div class="head">
      <h3>${q.questionIndex + 1}. ${escapeHTML(q.questionText)} ${flags.join("")}</h3>
    </div>
    <p style="color:var(--ink-soft);margin:4px 0 10px">${line}</p>
    ${body}
  </article>`;
}

function renderSessions() {
  const withEvents = new Set(events.map((e) => e.sessionId));
  const list = sessions.filter((s) => withEvents.has(s.id));
  $("#s-sessions").innerHTML = `
    <thead><tr>
      <th>${t("stats.colDate")}</th><th>${t("stats.colStatus")}</th>
      <th>${t("stats.kpiPlayers")}</th><th>${t("stats.colWinner")}</th>
    </tr></thead>
    <tbody>${list.map((s) => `<tr>
      <td>${fmtDate(s.startedAt)}</td>
      <td>${t(`stats.status.${s.status}`)}</td>
      <td>${s.playerCount ?? "—"}</td>
      <td>${s.leaderboard?.[0] ? `${escapeHTML(s.leaderboard[0].nickname)} (${s.leaderboard[0].score})` : "—"}</td>
    </tr>`).join("")}</tbody>`;
}

$("#s-export").addEventListener("click", () => {
  const cols = ["sessionId", "questionIndex", "questionType", "questionText", "playerId", "nickname", "answered",
    "choice", "textAnswer", "correct", "responseMs", "pointsEarned", "streakAfter", "rankAfter", "scoreAfter"];
  downloadCSV(`${quizTitle.replace(/[^\w-]+/g, "_")}_answer_events.csv`,
    [cols].concat(filtered().map((e) => cols.map((c) => e[c]))));
});
