// "Publish to the community" dialog (dashboard).
import { t, getLang, onLangChange } from "./i18n.js";
import { THEMES, publish, creatorName } from "./market.js";

let dialog = null;
let current = null; // { quiz, uid, onDone }

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const ERRORS = {
  "too-few-questions": "pub.err.tooFew", "title-too-short": "pub.err.title", "empty-question": "pub.err.empty",
  "image-host": "pub.err.imageHost", "bad-creator-name": "pub.err.name", "guidelines-not-accepted": "pub.err.guidelines",
  "publish-limit": "pub.err.limit", "check-unavailable": "pub.err.check", "removed": "pub.err.removed",
  "not-owner": "pub.err.generic", "sign-in": "ai.err.signIn",
};

export async function openPublishDialog(quiz, user, onDone) {
  current = { quiz, uid: user.uid, onDone, name: (await creatorName(user.uid)) || user.displayName || "" };
  if (!dialog) build();
  render();
  dialog.showModal();
}

function build() {
  dialog = document.createElement("dialog");
  dialog.className = "sheet pub-sheet";
  dialog.setAttribute("aria-labelledby", "pub-title");
  document.body.append(dialog);
  onLangChange(() => { if (dialog.open) render(); });
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog || e.target.closest("[data-close]")) dialog.close();
  });
  dialog.addEventListener("submit", (e) => { e.preventDefault(); go(); });
}

function guessLang(quiz) {
  const text = `${quiz.title} ${(quiz.questions || []).map((q) => q.text).join(" ")}`;
  if (/[؀-ۿ]/.test(text)) return "ar";
  if (/[àâçéèêëîïôûùüÿœ]|\b(le|la|les|des|est|quel|quelle)\b/i.test(text)) return "fr";
  return quiz.source?.lang || getLang();
}

function render() {
  const { quiz, name } = current;
  const lang = guessLang(quiz);
  const republish = !!quiz.publishedAs;
  dialog.innerHTML = `
    <form class="stack" novalidate>
      <div class="sheet-head">
        <h2 id="pub-title">${t(republish ? "pub.updateTitle" : "pub.title")}</h2>
        <button type="button" class="btn small ghost" data-close>${t("common.close")}</button>
      </div>
      <p class="pub-quiz"><strong>${esc(quiz.title)}</strong> · ${t("dash.questions", { n: quiz.questions?.length || 0 })}</p>
      <p class="muted-ink">${t("pub.explain")}</p>
      <div><label for="pub-name">${t("pub.name")}</label>
        <input id="pub-name" maxlength="40" value="${esc(name)}" required aria-describedby="pub-name-hint">
        <small id="pub-name-hint" class="muted-ink">${t("pub.nameHint")}</small></div>
      <div class="ai-grid pub-grid">
        <div><label for="pub-lang">${t("pub.lang")}</label>
          <select id="pub-lang">${[["en", "English"], ["fr", "Français"], ["ar", "العربية"]].map(([v, n]) => `<option value="${v}" ${v === lang ? "selected" : ""}>${n}</option>`).join("")}</select></div>
        <div><label for="pub-theme">${t("pub.theme")}</label>
          <select id="pub-theme">${THEMES.map((th) => `<option value="${th}" ${th === (quiz.theme || "general") ? "selected" : ""}>${t(`lib.theme.${th}`)}</option>`).join("")}</select></div>
      </div>
      <label class="check"><input type="checkbox" id="pub-accept">
        <span>${t("pub.accept", { guidelines: `<a href="guidelines.html" target="_blank" rel="noopener">${t("pub.guidelinesLink")}</a>` })}</span></label>
      <p class="ai-note">${t("pub.checkNote")}</p>
      <div class="sheet-foot">
        <span></span>
        <button type="submit" class="btn" id="pub-go">${t(republish ? "pub.updateGo" : "pub.go")}</button>
      </div>
      <div id="pub-status" class="ai-status" role="status" aria-live="polite"></div>
      <div id="pub-error" class="error" role="alert"></div>
    </form>`;
}

async function go() {
  const err = dialog.querySelector("#pub-error");
  const status = dialog.querySelector("#pub-status");
  const button = dialog.querySelector("#pub-go");
  const name = dialog.querySelector("#pub-name").value.replace(/\s+/g, " ").trim();
  err.textContent = "";
  if (name.length < 2) return (err.textContent = t("pub.err.name"));
  if (!dialog.querySelector("#pub-accept").checked) return (err.textContent = t("pub.err.guidelines"));
  if ((current.quiz.questions?.length || 0) < 3) return (err.textContent = t("pub.err.tooFew"));

  button.disabled = true;
  status.textContent = t("pub.checking");
  try {
    const result = await publish(current.quiz.id, {
      creatorName: name,
      lang: dialog.querySelector("#pub-lang").value,
      theme: dialog.querySelector("#pub-theme").value,
    });
    status.textContent = "";
    if (!result.published) {
      // Statement of reasons from the automatic check, so the author knows what to change.
      err.textContent = result.reason ? t("pub.refusedWhy", { reason: result.reason }) : t("pub.refused");
      button.disabled = false;
      return;
    }
    dialog.close();
    current.onDone?.(result.status);
  } catch (e) {
    console.error(e);
    status.textContent = "";
    const key = ERRORS[e.message] || (e.code === "functions/not-found" ? "pub.err.notDeployed" : "pub.err.generic");
    err.textContent = t(key);
    button.disabled = false;
  }
}
