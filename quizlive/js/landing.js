// Landing page: compact join mode for QR arrivals, feature list, and the playable demo.
import { $, params, SHAPES, escapeHTML } from "./utils.js";
import { t, initI18n, onLangChange, shapeName } from "./i18n.js";

initI18n(); // also done by join.js; harmless twice

if (params().has("pin")) document.body.classList.add("joining");

// ---------------------------------------------------------------- features

const FEATURES = ["fair", "sounds", "stats", "phones", "lang", "access"];

function renderFeatures() {
  $("#features").innerHTML = FEATURES.map((f, i) => `
    <div class="feature">
      <span class="glyph c${i % 4}-bg" aria-hidden="true">${SHAPES[i % 4]}</span>
      <div><h3>${t(`land.f.${f}`)}</h3><p>${t(`land.f.${f}Text`)}</p></div>
    </div>`).join("");
}

// ---------------------------------------------------------------- demo
// Same scoring curve as the real game: 1000 points for an instant answer, 500 at the buzzer.

const LIMIT = 20;
const CORRECT = 1;
let startedAt = 0;
let timer = null;
let done = false;

function demoQuestion() {
  return { text: t("land.demoQ"), answers: [t("land.demoA0"), t("land.demoA1"), t("land.demoA2"), t("land.demoA3")] };
}

function startDemo() {
  done = false;
  const q = demoQuestion();
  $("#demo-q").textContent = q.text;
  $("#demo-tiles").setAttribute("aria-label", t("play.chooseAnswer"));
  $("#demo-tiles").innerHTML = q.answers.map((a, i) => `
    <button type="button" class="tile c${i}" data-i="${i}" aria-label="${shapeName(i)}: ${escapeHTML(a)}">
      ${SHAPES[i]}<span>${escapeHTML(a)}</span>
    </button>`).join("");
  $("#demo-msg").textContent = t("land.demoHint");
  $("#demo-points").textContent = "";
  startedAt = performance.now();
  clearInterval(timer);
  timer = setInterval(tick, 200);
  tick();
}

function tick() {
  const left = Math.max(0, LIMIT - (performance.now() - startedAt) / 1000);
  $("#demo-timer").textContent = Math.ceil(left);
  if (left <= 0) finish(null);
}

function finish(choice) {
  if (done) return;
  done = true;
  clearInterval(timer);
  const seconds = Math.min((performance.now() - startedAt) / 1000, LIMIT);
  const correct = choice === CORRECT;
  const points = correct ? Math.round(1000 * (1 - (seconds / LIMIT) / 2)) : 0;

  [...$("#demo-tiles").children].forEach((b, i) => {
    b.disabled = true;
    b.classList.add(i === CORRECT ? "correct" : "dim");
  });

  const msg = $("#demo-msg");
  msg.innerHTML = "";
  const text = document.createElement("span");
  text.textContent = choice === null ? t("land.demoTimeUp") : (correct ? t("land.demoRight") : t("land.demoWrong"));
  const again = document.createElement("button");
  again.type = "button";
  again.className = "btn small ghost";
  again.style.marginLeft = "12px";
  again.textContent = t("land.demoAgain");
  again.addEventListener("click", startDemo);
  msg.append(text, again);

  countUp($("#demo-points"), points);
}

function countUp(el, target) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || target === 0) { el.textContent = `+${target}`; return; }
  const t0 = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - t0) / 700);
    el.textContent = `+${Math.round(target * (1 - (1 - k) ** 3))}`;
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

$("#demo-tiles").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-i]");
  if (b) finish(Number(b.dataset.i));
});

// Only run the demo when it's visible (skips QR arrivals and saves battery).
if (!document.body.classList.contains("joining")) {
  renderFeatures();
  startDemo();
  onLangChange(() => { renderFeatures(); startDemo(); });
}
