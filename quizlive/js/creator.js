// Public creator profile: creator.html?u={uid}. Shows the creator's published quizzes and their totals.
import { $, params, escapeHTML, SHAPES } from "./utils.js";
import { t, initI18n, mountLangToggle, onLangChange, getLang, getDir, intlLocale } from "./i18n.js";
import { listByCreator, creatorName } from "./market.js";

initI18n();
mountLangToggle($("#controls"));

const THEME_SHAPE = { general: 0, geography: 1, science: 2, tech: 3, sport: 0, culture: 2, icebreaker: 3, history: 1, language: 2, other: 3 };
const uid = params().get("u") || "";
let name = "";
let quizzes = [];

async function load() {
  try {
    [name, quizzes] = await Promise.all([creatorName(uid), listByCreator(uid)]);
  } catch (err) {
    console.error(err);
  }
  $("#cr-loading").hidden = true;
  if (!uid || (!name && !quizzes.length)) { $("#cr-missing").hidden = false; return; }
  // The public name shown on their latest quizzes wins if the creators doc is missing.
  name = name || quizzes[0]?.creatorName || "";
  render();
  $("#cr-profile").hidden = false;
}

function render() {
  const nf = new Intl.NumberFormat(intlLocale());
  const sum = (k) => quizzes.reduce((n, q) => n + (q[k] || 0), 0);
  $("#cr-name").innerHTML = `<bdi>${escapeHTML(name)}</bdi>`;
  $("#cr-avatar").textContent = [...name.trim()][0]?.toUpperCase() || "?";
  document.title = `${name} · QuizLive`;
  $("#cr-stats").innerHTML = [
    ["quizzes", quizzes.length], ["plays", sum("plays")], ["copies", sum("copies")], ["likes", sum("likes")],
  ].map(([key, n]) => `<li><strong>${nf.format(n)}</strong><span>${t(`creator.stat.${key}`)}</span></li>`).join("");
  const ui = `lang="${getLang()}" dir="${getDir()}"`;
  $("#cr-list").innerHTML = quizzes.map((x) => {
    const shape = THEME_SHAPE[x.theme] ?? 0;
    return `<article class="lib-item" lang="${x.lang}" dir="${x.lang === "ar" ? "rtl" : "ltr"}">
      <span class="glyph c${shape}-bg" aria-hidden="true">${SHAPES[shape]}</span>
      <div class="lib-text">
        <h2>${escapeHTML(x.title)}</h2>
        <p>${escapeHTML(x.description || "")}</p>
        <p class="lib-meta" ${ui}>${t("lib.theme." + x.theme)} · ${t("dash.questions", { n: x.questionCount })} · ${t("lib.plays", { n: x.plays || 0 })} · ${t("lib.copies", { n: x.copies || 0 })} · ${t("like.count", { n: x.likes || 0 })}</p>
      </div>
      <div class="lib-actions" ${ui}>
        <a class="btn small" href="library.html?tab=community&p=${encodeURIComponent(x.id)}">${t("lib.preview")}</a>
      </div>
    </article>`;
  }).join("");
}

load();
onLangChange(() => { if (!$("#cr-profile").hidden) render(); });
