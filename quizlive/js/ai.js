// "Generate with AI" dialog on the dashboard. Calls the generateQuiz Cloud Function
// (functions/index.js), which writes the quiz and returns its id; the editor opens for review.
import { app } from "./firebase.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-functions.js";
import { $$ } from "./utils.js";
import { t, getLang, onLangChange } from "./i18n.js";

const functions = getFunctions(app, "europe-west1");
const generateQuiz = httpsCallable(functions, "generateQuiz", { timeout: 160000 });
const aiAllowance = httpsCallable(functions, "aiAllowance");

const PDF_JS = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js";
const PDF_WORKER = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
const MAX_CHARS = 60000;

let dialog = null;
let source = "topic";

export function mountAiButton(container) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn ghost";
  const sync = () => { btn.textContent = `✦ ${t("ai.button")}`; };
  sync();
  onLangChange(sync);
  btn.addEventListener("click", open);
  container.prepend(btn);
}

async function open() {
  if (!dialog) build();
  render();
  dialog.showModal();
  refreshAllowance();
}

async function refreshAllowance() {
  const el = dialog.querySelector("#ai-allowance");
  el.textContent = "";
  try {
    const { data } = await aiAllowance();
    el.textContent = t("ai.remaining", { n: data.remaining, total: data.allowance });
    dialog.querySelector("#ai-go").disabled = data.remaining <= 0;
    if (data.remaining <= 0) el.textContent = t("ai.err.allowance");
  } catch (err) {
    console.warn("ai allowance", err);
    if (err.code === "functions/not-found" || err.code === "functions/internal") el.textContent = t("ai.err.notDeployed");
  }
}

function build() {
  dialog = document.createElement("dialog");
  dialog.className = "sheet ai-sheet";
  dialog.setAttribute("aria-labelledby", "ai-title");
  document.body.append(dialog);
  onLangChange(() => { if (dialog.open) render(); });

  dialog.addEventListener("click", (e) => {
    if (e.target === dialog || e.target.closest("[data-close]")) dialog.close();
    const tab = e.target.closest("[data-source]");
    if (tab) { collectInto(); source = tab.dataset.source; render(); }
  });
  dialog.addEventListener("change", async (e) => {
    if (e.target.id === "ai-file") await readFile(e.target.files[0]);
  });
  dialog.addEventListener("input", (e) => {
    if (e.target.id === "ai-text") updateCount();
  });
  dialog.addEventListener("submit", (e) => { e.preventDefault(); go(); });
}

// Keep what the host typed when switching tabs or language.
const draft = { topic: "", text: "", url: "", audience: "", lang: null, count: "10", difficulty: "medium", types: ["quiz", "truefalse"] };

function collectInto() {
  const v = (id) => dialog.querySelector(id)?.value;
  if (dialog.querySelector("#ai-topic")) draft.topic = v("#ai-topic");
  if (dialog.querySelector("#ai-text")) draft.text = v("#ai-text");
  if (dialog.querySelector("#ai-url")) draft.url = v("#ai-url");
  draft.audience = v("#ai-audience") ?? draft.audience;
  draft.lang = v("#ai-lang") ?? draft.lang;
  draft.count = v("#ai-count") ?? draft.count;
  draft.difficulty = v("#ai-difficulty") ?? draft.difficulty;
  const types = $$("[data-type]:checked", dialog).map((el) => el.dataset.type);
  if ($$("[data-type]", dialog).length) draft.types = types;
}

function sourceFields() {
  if (source === "topic") {
    return `<label for="ai-topic">${t("ai.topic")}</label>
      <input id="ai-topic" maxlength="300" placeholder="${t("ai.topicPh")}" value="${esc(draft.topic)}" required>`;
  }
  if (source === "text") {
    return `<label for="ai-text">${t("ai.text")}</label>
      <textarea id="ai-text" rows="7" maxlength="${MAX_CHARS}" placeholder="${t("ai.textPh")}">${esc(draft.text)}</textarea>
      <div class="row spread">
        <label class="btn small ghost file-btn">${t("ai.uploadPdf")}<input type="file" id="ai-file" accept=".pdf,.txt,application/pdf,text/plain" hidden></label>
        <small id="ai-count-chars"></small>
      </div>`;
  }
  return `<label for="ai-url">${t("ai.url")}</label>
    <input id="ai-url" type="url" maxlength="2000" placeholder="https://…" value="${esc(draft.url)}" required>
    <small class="muted-ink">${t("ai.urlHint")}</small>`;
}

function render() {
  const lang = draft.lang || getLang();
  dialog.innerHTML = `
    <form class="stack" novalidate>
      <div class="sheet-head">
        <h2 id="ai-title">${t("ai.title")}</h2>
        <button type="button" class="btn small ghost" data-close>${t("common.close")}</button>
      </div>
      <div class="tabs" role="tablist">
        ${["topic", "text", "url"].map((s) => `<button type="button" role="tab" data-source="${s}" aria-selected="${s === source}">${t(`ai.source.${s}`)}</button>`).join("")}
      </div>
      <div class="stack">${sourceFields()}</div>
      <div class="ai-grid">
        <div><label for="ai-lang">${t("ai.lang")}</label>
          <select id="ai-lang">${[["en", "English"], ["fr", "Français"], ["ar", "العربية"]].map(([v, n]) => `<option value="${v}" ${v === lang ? "selected" : ""}>${n}</option>`).join("")}</select></div>
        <div><label for="ai-count">${t("ai.count")}</label>
          <select id="ai-count">${["5", "10", "15"].map((n) => `<option ${n === draft.count ? "selected" : ""}>${n}</option>`).join("")}</select></div>
        <div><label for="ai-difficulty">${t("ai.difficulty")}</label>
          <select id="ai-difficulty">${["easy", "medium", "hard"].map((d) => `<option value="${d}" ${d === draft.difficulty ? "selected" : ""}>${t(`ai.diff.${d}`)}</option>`).join("")}</select></div>
      </div>
      <div><label for="ai-audience">${t("ai.audience")}</label>
        <input id="ai-audience" maxlength="120" placeholder="${t("ai.audiencePh")}" value="${esc(draft.audience)}"></div>
      <fieldset class="ai-types">
        <legend>${t("ai.types")}</legend>
        ${["quiz", "truefalse", "typeAnswer"].map((ty) => `<label class="check"><input type="checkbox" data-type="${ty}" ${draft.types.includes(ty) ? "checked" : ""}> <span>${t(`qt.${ty}`)}</span></label>`).join("")}
      </fieldset>
      <p class="ai-note">${t("ai.note")}</p>
      <div class="sheet-foot">
        <small id="ai-allowance" class="muted-ink" aria-live="polite"></small>
        <button type="submit" class="btn" id="ai-go">${t("ai.go")}</button>
      </div>
      <div id="ai-status" class="ai-status" role="status" aria-live="polite"></div>
      <div id="ai-error" class="error" role="alert"></div>
    </form>`;
  updateCount();
}

function updateCount() {
  const area = dialog.querySelector("#ai-text");
  const out = dialog.querySelector("#ai-count-chars");
  if (area && out) out.textContent = t("ai.chars", { n: area.value.length.toLocaleString(), max: MAX_CHARS.toLocaleString() });
}

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// ---------------------------------------------------------------- PDF / text files (read in the browser)

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error("script"));
    document.head.append(s);
  });
}

async function readFile(file) {
  if (!file) return;
  const area = dialog.querySelector("#ai-text");
  const status = dialog.querySelector("#ai-status");
  dialog.querySelector("#ai-error").textContent = "";
  try {
    if (file.type === "text/plain" || /\.txt$/i.test(file.name)) {
      area.value = (await file.text()).slice(0, MAX_CHARS);
    } else {
      status.textContent = t("ai.readingPdf");
      if (!window.pdfjsLib) await loadScript(PDF_JS);
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER;
      const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
      let text = "";
      for (let p = 1; p <= Math.min(pdf.numPages, 60) && text.length < MAX_CHARS; p++) {
        const content = await (await pdf.getPage(p)).getTextContent();
        text += `${content.items.map((i) => i.str).join(" ")}\n`;
      }
      if (text.trim().length < 200) throw new Error("pdf-empty");
      area.value = text.slice(0, MAX_CHARS);
    }
    status.textContent = "";
    updateCount();
  } catch (err) {
    console.error(err);
    status.textContent = "";
    dialog.querySelector("#ai-error").textContent = t(err.message === "pdf-empty" ? "ai.err.pdfEmpty" : "ai.err.pdf");
  }
}

// ---------------------------------------------------------------- generate

const ERRORS = {
  "allowance": "ai.err.allowance", "bad-topic": "ai.err.topic", "text-too-short": "ai.err.textShort",
  "bad-url": "ai.err.url", "page-unreachable": "ai.err.page", "page-not-text": "ai.err.pageType",
  "page-empty": "ai.err.pageEmpty", "busy": "ai.err.busy", "refused": "ai.err.refused",
  "bad-output": "ai.err.output", "too-long": "ai.err.output", "sign-in": "ai.err.signIn",
};

async function go() {
  collectInto();
  const err = dialog.querySelector("#ai-error");
  const status = dialog.querySelector("#ai-status");
  const button = dialog.querySelector("#ai-go");
  err.textContent = "";
  if (!draft.types.length) { err.textContent = t("ai.err.types"); return; }
  const payload = {
    source, lang: draft.lang || getLang(), count: Number(draft.count), difficulty: draft.difficulty,
    types: draft.types, audience: draft.audience.trim(),
  };
  if (source === "topic") payload.topic = draft.topic.trim();
  if (source === "text") payload.text = draft.text.trim();
  if (source === "url") payload.url = draft.url.trim();

  if (source === "topic" && payload.topic.length < 3) { err.textContent = t("ai.err.topic"); return; }
  if (source === "text" && payload.text.length < 200) { err.textContent = t("ai.err.textShort"); return; }
  if (source === "url" && !/^https:\/\/\S+\.\S+/.test(payload.url)) { err.textContent = t("ai.err.url"); return; }

  button.disabled = true;
  status.textContent = t("ai.working");
  try {
    const { data } = await generateQuiz(payload);
    status.textContent = t("ai.done", { n: data.questions });
    location.assign(`editor.html?id=${data.quizId}`);
  } catch (e) {
    console.error(e);
    status.textContent = "";
    const key = ERRORS[e.message]
      || (e.code === "functions/not-found" ? "ai.err.notDeployed" : e.code === "functions/deadline-exceeded" ? "ai.err.busy" : "ai.err.generic");
    err.textContent = t(key);
    button.disabled = false;
    if (e.message === "allowance") refreshAllowance();
  }
}

