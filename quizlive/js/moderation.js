// Moderator queue: hidden and reported community quizzes. Requires the custom claim admin: true.
import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { $, $$, showView, escapeHTML, toast } from "./utils.js";
import { t, initI18n, mountLangToggle, onLangChange, intlLocale } from "./i18n.js";
import { moderationQueue, recentPublished, reportsFor, moderate } from "./market.js";
import { typeOf } from "./questions.js";

initI18n();
mountLangToggle($("#controls"));

let items = [];
let mode = "queue";          // "queue": hidden or reported; "recent": latest publications, for spot checks
const reports = new Map();

onAuthStateChanged(auth, async (u) => {
  if (!u || u.isAnonymous) return location.replace("dashboard.html");
  const token = await u.getIdTokenResult();
  if (token.claims.admin !== true) return showView("denied");
  await load();
});

onLangChange(() => { if (items.length) render(); });

async function load() {
  showView("loading");
  items = mode === "queue"
    ? (await moderationQueue())
      .sort((a, b) => (b.status === "hidden") - (a.status === "hidden") || (b.reportCount || 0) - (a.reportCount || 0))
    : await recentPublished();
  await Promise.all(items.filter((x) => (x.reportCount || 0) > 0 || x.status === "hidden")
    .map(async (x) => reports.set(x.id, await reportsFor(x.id).catch(() => []))));
  render();
  showView("queue");
}

$$("[data-mode]").forEach((b) => b.addEventListener("click", () => {
  if (mode === b.dataset.mode) return;
  mode = b.dataset.mode;
  $$("[data-mode]").forEach((x) => x.setAttribute("aria-selected", String(x === b)));
  load();
}));

// What the right answer is, per question type, so a moderator can spot wrong or misleading quizzes.
function answersHTML(q) {
  const type = typeOf(q);
  if (type === "typeAnswer") return `✓ ${escapeHTML((q.accepted || []).join(" / "))}`;
  if (type === "truefalse") return `✓ ${t(q.correct?.[0] === 1 ? "qt.false" : "qt.true")}`;
  const correct = new Set(q.correct || []);
  return (q.answers || []).map((a, i) => (type !== "poll" && correct.has(i)
    ? `<strong>✓ ${escapeHTML(a || t("lib.imageAnswer", { n: i + 1 }))}</strong>`
    : `<span class="wrong">${escapeHTML(a || t("lib.imageAnswer", { n: i + 1 }))}</span>`)).join(" · ");
}

function imagesHTML(q) {
  const imgs = [];
  if (q.imageUrl) imgs.push(`<img src="${escapeHTML(q.imageUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer">`);
  (q.answerImages || []).forEach((src, i) => src && imgs.push(
    `<img src="${escapeHTML(src)}" alt="${t("lib.imageAnswer", { n: i + 1 })}" loading="lazy" referrerpolicy="no-referrer" class="${(q.correct || []).includes(i) ? "ok" : ""}">`));
  return imgs.length ? `<div class="mod-imgs">${imgs.join("")}</div>` : "";
}

const date = (ts) => (ts?.seconds ? new Date(ts.seconds * 1000).toLocaleString(intlLocale(), { dateStyle: "medium", timeStyle: "short" }) : "");

function render() {
  $("#mod-empty").hidden = items.length > 0;
  $("#mod-empty").textContent = t(mode === "queue" ? "mod.empty" : "mod.emptyRecent");
  $("#mod-list").innerHTML = items.map((x) => {
    const dir = x.lang === "ar" ? "rtl" : "ltr";
    const rs = reports.get(x.id) || [];
    return `<article class="card mod-item" data-id="${x.id}">
      <div class="row spread">
        <div>
          <h2 lang="${x.lang}" dir="${dir}">${escapeHTML(x.title)}</h2>
          <p class="mod-meta">
            <span>${t("pub.by", { name: `<a href="creator.html?u=${encodeURIComponent(x.ownerUid)}" target="_blank" rel="noopener"><bdi>${escapeHTML(x.creatorName)}</bdi></a>` })}</span>
            <span>${x.lang.toUpperCase()} · ${t(`lib.theme.${x.theme}`)}</span>
            <span>${t("mod.published", { date: date(x.publishedAt) })}</span>
            <span>${t("lib.plays", { n: x.plays || 0 })} · ${t("lib.copies", { n: x.copies || 0 })} · ${t("like.count", { n: x.likes || 0 })}</span>
          </p>
        </div>
        <span class="flag ${x.status === "hidden" ? "hard" : "trap"}">${t(`mod.status.${x.status}`)}</span>
      </div>
      ${x.description ? `<p lang="${x.lang}" dir="${dir}">${escapeHTML(x.description)}</p>` : ""}
      <p>${t("mod.counts", { reports: x.reportCount || 0, hosts: x.hostReportCount || 0 })}</p>
      ${x.moderation?.model ? `<p class="mod-check">${t("mod.autoCheck", { model: escapeHTML(x.moderation.model), date: date(x.moderation.checkedAt) })}</p>` : ""}
      ${rs.length ? `<ul class="mod-reports">${rs.map((r) => `<li><strong>${t(`report.r.${r.reason}`)}</strong>${r.details ? `: <bdi>${escapeHTML(r.details)}</bdi>` : ""} <small>${date(r.createdAt)}</small></li>`).join("")}</ul>` : ""}
      <details>
        <summary>${t("mod.questions", { n: x.questionCount })}</summary>
        <ol class="lp-questions">${x.questions.map((q) => `<li><span class="flag type">${t(`qt.${typeOf(q)}`)}</span>
          <span class="lp-q" lang="${x.lang}" dir="${dir}">${escapeHTML(q.text)}</span>
          <span class="lp-a" lang="${x.lang}" dir="${dir}">${answersHTML(q)}</span>${imagesHTML(q)}</li>`).join("")}</ol>
      </details>
      <div class="mod-actions">
        ${x.status === "hidden" ? `<button class="btn small" data-act="restore">${t("mod.restore")}</button>` : ""}
        ${x.status === "published" && (x.reportCount || 0) > 0 ? `<button class="btn small ghost-ink" data-act="dismiss">${t("mod.dismiss")}</button>` : ""}
        <label class="sr-only" for="why-${x.id}">${t("mod.reason")}</label>
        <input id="why-${x.id}" class="mod-reason" maxlength="300" placeholder="${t("mod.reasonPh")}">
        <button class="btn small danger" data-act="remove">${t("mod.remove")}</button>
      </div>
    </article>`;
  }).join("");
}

$("#mod-list").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-act]");
  if (!b) return;
  const card = b.closest("[data-id]");
  const id = card.dataset.id;
  const reason = card.querySelector(".mod-reason").value.trim();
  if (b.dataset.act === "remove" && reason.length < 5) {
    toast(t("mod.reasonRequired"));
    return card.querySelector(".mod-reason").focus();
  }
  b.disabled = true;
  try {
    await moderate(id, b.dataset.act, reason);
    toast(t(`mod.done.${b.dataset.act}`));
    await load();
  } catch (err) {
    console.error(err);
    toast(t("mod.err"));
    b.disabled = false;
  }
});
