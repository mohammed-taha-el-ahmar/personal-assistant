// Quiz library: ready-made quizzes (templates/) and the community market (publicQuizzes).
// Preview, copy into your account, and report community quizzes.
import { auth } from "./firebase.js";
import { onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { $, $$, params, escapeHTML, SHAPES, toast } from "./utils.js";
import { t, initI18n, mountLangToggle, onLangChange, getLang, getDir, intlLocale } from "./i18n.js";
import { listTemplates, loadTemplate, importTemplate } from "./templates.js";
import { listPublic, getPublic, copyPublic, report, myLikes, like, unlike, REPORT_REASONS } from "./market.js";
import { typeOf } from "./questions.js";

initI18n();
mountLangToggle($("#controls"));

const LANGS = [["all", null], ["en", "English"], ["fr", "Français"], ["ar", "العربية"]];
const THEME_SHAPE = { general: 0, geography: 1, science: 2, tech: 3, sport: 0, culture: 2, icebreaker: 3, history: 1, language: 2, other: 3 };

let tab = params().get("tab") === "community" ? "community" : "templates";
let templates = [];
let community = [];
let communityKey = "";      // query the current community list was loaded for
let user = null;
let langFilter = params().get("lang") || getLang();
let themeFilter = "all";
let preview = null;         // { kind: "template" | "community", id, data }

let liked = new Set();       // public ids this host has liked
onAuthStateChanged(auth, async (u) => {
  user = u;
  liked = new Set();
  if (isHost()) {
    liked = await myLikes(u.uid).catch(() => new Set());
    if (tab === "community") paintLikes();
  }
});
const isHost = () => user && !user.isAnonymous;

listTemplates().then((list) => {
  templates = list;
  if (tab === "templates" && !templates.some((tp) => tp.lang === langFilter)) langFilter = "all";
  render();
  if (params().get("t")) openTemplate(params().get("t"));
}).catch((err) => { console.error(err); render(); });

if (params().get("p")) openCommunity(params().get("p"));

onLangChange(() => { render(); if (preview && $("#lib-preview").open) reopenPreview(); });

// ---------------------------------------------------------------- list

async function render() {
  $$("[data-tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === tab)));
  $("#community-bar").hidden = tab !== "community";
  $("#lib-langs").innerHTML = LANGS.map(([code, name]) => `
    <button type="button" data-lang="${code}" aria-pressed="${code === langFilter}" ${code !== "all" ? `lang="${code}"` : ""}>
      ${code === "all" ? t("lib.allLangs") : name}</button>`).join("");

  let items;
  if (tab === "templates") {
    items = templates.filter((tp) => langFilter === "all" || tp.lang === langFilter);
  } else {
    const key = JSON.stringify([langFilter, $("#c-sort").value, $("#c-search").value.trim()]);
    if (key !== communityKey) {
      communityKey = key;
      $("#lib-list").innerHTML = `<p class="muted">${t("common.loading")}</p>`;
      try {
        community = await listPublic({ lang: langFilter, sort: $("#c-sort").value, keyword: $("#c-search").value });
      } catch (err) {
        console.error(err);
        community = [];
        communityKey = "";
        $("#lib-empty").hidden = false;
        $("#lib-empty").textContent = t("lib.loadError");
        $("#lib-list").innerHTML = "";
        return;
      }
    }
    items = community;
  }

  const themes = ["all", ...new Set(items.map((x) => x.theme))];
  if (!themes.includes(themeFilter)) themeFilter = "all";
  $("#lib-themes").innerHTML = themes.map((th) => `
    <button type="button" class="chip-filter" data-theme="${th}" aria-pressed="${th === themeFilter}">
      ${th === "all" ? t("lib.allThemes") : t(`lib.theme.${th}`)}</button>`).join("");

  const shown = items.filter((x) => themeFilter === "all" || x.theme === themeFilter);
  $("#lib-empty").hidden = shown.length > 0;
  $("#lib-empty").innerHTML = tab === "community" && !$("#c-search").value
    ? ($("#c-sort").value === "trending" ? t("lib.trendingEmpty")
      : `${t("lib.communityEmpty")} <a href="dashboard.html">${t("lib.shareYours")}</a>`)
    : t("lib.empty");
  $("#lib-list").innerHTML = shown.map((x) => itemHTML(x)).join("");
}

function itemHTML(x) {
  const shape = THEME_SHAPE[x.theme] ?? 0;
  const ui = `lang="${getLang()}" dir="${getDir()}"`;
  const meta = tab === "community"
    ? `${t("pub.by", { name: authorLink(x) })} · ${t("dash.questions", { n: x.questionCount })} · ${t("lib.plays", { n: x.plays || 0 })} · ${t("lib.copies", { n: x.copies || 0 })}`
    : `${t("dash.questions", { n: x.questionCount })} · ${x.types.map((ty) => t(`qt.${ty}`)).join(", ")}`;
  return `<article class="lib-item" lang="${x.lang}" dir="${x.lang === "ar" ? "rtl" : "ltr"}">
    <span class="glyph c${shape}-bg" aria-hidden="true">${SHAPES[shape]}</span>
    <div class="lib-text">
      <h2>${escapeHTML(x.title)}</h2>
      <p>${escapeHTML(x.description || "")}</p>
      <p class="lib-meta" ${ui}>${meta}</p>
    </div>
    <div class="lib-actions" ${ui}>
      ${tab === "community" ? likeButton(x) : ""}
      <button type="button" class="btn small" data-preview="${x.id}">${t("lib.preview")}</button>
    </div>
  </article>`;
}

function authorLink(x) {
  return `<a class="author" href="creator.html?u=${encodeURIComponent(x.ownerUid)}"><bdi>${escapeHTML(x.creatorName)}</bdi></a>`;
}

const HEART = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.6 4.5 7.1 4.5c2 0 3.6 1.1 4.9 2.9 1.3-1.8 2.9-2.9 4.9-2.9 3.5 0 5.7 3.5 4.4 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"/></svg>`;

function likeButton(x, extra = "") {
  const on = liked.has(x.id);
  return `<button type="button" class="like-btn ${extra}" data-like="${x.id}" aria-pressed="${on}"
    aria-label="${t(on ? "like.remove" : "like.add")}: ${escapeHTML(x.title)} (${t("like.count", { n: x.likes || 0 })})">
    ${HEART}<span>${x.likes || 0}</span></button>`;
}

// Re-render like buttons after the liked set or a count changes.
function paintLikes() {
  $$("#lib-list [data-like]").forEach((b) => {
    const x = community.find((c) => c.id === b.dataset.like);
    if (x) b.outerHTML = likeButton(x);
  });
  if (preview?.kind === "community") {
    const lp = $("#lp-like");
    lp.hidden = false;
    const on = liked.has(preview.id);
    lp.setAttribute("aria-pressed", String(on));
    lp.innerHTML = `${HEART}<span>${preview.data.likes || 0}</span> <span class="like-label">${t(on ? "like.liked" : "like.add")}</span>`;
  }
}

async function toggleLike(id) {
  const x = community.find((c) => c.id === id) || (preview?.id === id ? preview.data : null);
  if (!x) return;
  if (!isHost()) return toast(t("like.signIn"));
  if (x.ownerUid === user.uid) return toast(t("like.own"));
  const on = liked.has(id);
  // Optimistic: the stored count is updated by a server trigger a moment later.
  liked[on ? "delete" : "add"](id);
  x.likes = Math.max(0, (x.likes || 0) + (on ? -1 : 1));
  if (preview?.data && preview.id === id && preview.data !== x) preview.data.likes = x.likes;
  paintLikes();
  try {
    await (on ? unlike(id, user.uid) : like(id, user.uid));
  } catch (err) {
    console.error(err);
    liked[on ? "add" : "delete"](id);
    x.likes = Math.max(0, (x.likes || 0) + (on ? 1 : -1));
    paintLikes();
    toast(t("like.err"));
  }
}

$$("[data-tab]").forEach((b) => b.addEventListener("click", () => {
  if (tab === b.dataset.tab) return;
  tab = b.dataset.tab;
  themeFilter = "all";
  const url = new URL(location.href);
  url.searchParams.set("tab", tab);
  history.replaceState(null, "", url);
  render();
}));
$("#lib-langs").addEventListener("click", (e) => {
  const b = e.target.closest("[data-lang]");
  if (b) { langFilter = b.dataset.lang; render(); }
});
$("#lib-themes").addEventListener("click", (e) => {
  const b = e.target.closest("[data-theme]");
  if (b) { themeFilter = b.dataset.theme; render(); }
});
$("#community-bar").addEventListener("submit", (e) => { e.preventDefault(); render(); });
$("#c-sort").addEventListener("change", () => render());
let searchTimer;
$("#c-search").addEventListener("input", () => { clearTimeout(searchTimer); searchTimer = setTimeout(render, 400); });
$("#lib-list").addEventListener("click", (e) => {
  const l = e.target.closest("[data-like]");
  if (l) return toggleLike(l.dataset.like);
  const b = e.target.closest("[data-preview]");
  if (!b) return;
  if (tab === "community") openCommunity(b.dataset.preview);
  else openTemplate(b.dataset.preview);
});

// ---------------------------------------------------------------- preview

function answerSummary(q) {
  switch (typeOf(q)) {
    case "truefalse": return t(q.correct?.[0] === 1 ? "qt.false" : "qt.true");
    case "typeAnswer": return (q.accepted || []).join(" / ");
    case "poll": return (q.answers || []).join(" · ");
    case "images": return t("lib.imageAnswer", { n: (q.correct?.[0] ?? 0) + 1 });
    default: return (q.correct || []).map((i) => q.answers[i]).join(", ");
  }
}

function showPreview(data, kind) {
  const dialog = $("#lib-preview");
  const dir = data.lang === "ar" ? "rtl" : "ltr";
  preview = { kind, id: data.id, data };
  $("#lp-title").textContent = data.title;
  $("#lp-title").setAttribute("lang", data.lang);
  $("#lp-title").dir = dir;
  $("#lp-desc").textContent = data.description || "";
  $("#lp-desc").dir = dir;
  $("#lp-meta").innerHTML = kind === "community"
    ? `${t("pub.by", { name: authorLink(data) })} · ${t("lib.plays", { n: data.plays || 0 })} · ${t("lib.copies", { n: data.copies || 0 })}
       · ${data.publishedAt?.seconds ? new Date(data.publishedAt.seconds * 1000).toLocaleDateString(intlLocale(), { dateStyle: "medium" }) : ""}`
    : "";
  $("#lp-note").innerHTML = kind === "community"
    ? t("lib.copyNoteCommunity", { name: `<bdi>${escapeHTML(data.creatorName)}</bdi>`, licence: `<a href="guidelines.html#licence" target="_blank" rel="noopener">CC BY 4.0</a>` })
    : t("lib.copyNote");
  $("#lp-report").hidden = kind !== "community";
  $("#lp-like").hidden = kind !== "community";
  if (kind === "community") paintLikes();
  $("#lp-use").disabled = false;
  $("#lp-questions").innerHTML = data.questions.map((q) => `
    <li>
      <span class="flag type">${t(`qt.${typeOf(q)}`)}</span>
      <span class="lp-q" lang="${data.lang}" dir="${dir}">${escapeHTML(q.text)}</span>
      <span class="lp-a" lang="${data.lang}" dir="${dir}">${typeOf(q) === "poll" ? "" : "✓ "}${escapeHTML(answerSummary(q))}</span>
    </li>`).join("");
  if (!dialog.open) dialog.showModal();
}

async function openTemplate(id) {
  try {
    showPreview({ ...(await loadTemplate(id)), id }, "template");
  } catch (err) {
    console.error(err);
    toast(t("lib.loadError"));
  }
}

async function openCommunity(id) {
  try {
    const pub = await getPublic(id);
    if (!pub || pub.status !== "published") return toast(t("lib.notAvailable"));
    showPreview(pub, "community");
  } catch (err) {
    console.error(err);
    toast(t("lib.notAvailable"));
  }
}

const reopenPreview = () => (preview.kind === "community" ? showPreview(preview.data, "community") : openTemplate(preview.id));

$("#lib-preview").addEventListener("click", (e) => {
  if (e.target.matches("[data-close]") || e.target === e.currentTarget) e.currentTarget.close();
});

$("#lp-like").addEventListener("click", () => preview && toggleLike(preview.id));

$("#lp-use").addEventListener("click", async (e) => {
  if (!preview) return;
  const param = preview.kind === "community" ? "public" : "template";
  // Not signed in as a host: sign in on the dashboard, which finishes the copy.
  if (!isHost()) return location.assign(`dashboard.html?${param}=${encodeURIComponent(preview.id)}`);
  e.currentTarget.disabled = true;
  try {
    const quizId = preview.kind === "community"
      ? await copyPublic(preview.data, user.uid)
      : await importTemplate(preview.id, user.uid);
    location.assign(`editor.html?id=${quizId}`);
  } catch (err) {
    console.error(err);
    toast(t("lib.copyError"));
    e.currentTarget.disabled = false;
  }
});

// ---------------------------------------------------------------- report

$("#lp-report").addEventListener("click", () => {
  $("#rp-reasons").innerHTML = `<legend>${t("report.reason")}</legend>` + REPORT_REASONS.map((r) => `
    <label class="check"><input type="radio" name="rp-reason" value="${r}"> <span>${t(`report.r.${r}`)}</span></label>`).join("");
  $("#rp-details").value = "";
  $("#rp-error").textContent = "";
  $("#report-dialog").showModal();
});

$("#report-dialog").addEventListener("click", (e) => {
  if (e.target.matches("[data-close]") || e.target === e.currentTarget) e.currentTarget.close();
});

$("#report-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const reason = $("input[name=rp-reason]:checked")?.value;
  if (!reason) return ($("#rp-error").textContent = t("report.err.reason"));
  const button = e.submitter || $("#report-form button[type=submit]");
  button.disabled = true;
  try {
    // Reporting needs an account; visitors get an anonymous one (one report per account per quiz).
    if (!user) user = (await signInAnonymously(auth)).user;
    await report(preview.id, user.uid, reason, $("#rp-details").value.trim());
    $("#report-dialog").close();
    toast(t("report.sent"));
  } catch (err) {
    console.error(err);
    $("#rp-error").textContent = t(err.code === "permission-denied" ? "report.err.already" : "report.err.generic");
  } finally {
    button.disabled = false;
  }
});
