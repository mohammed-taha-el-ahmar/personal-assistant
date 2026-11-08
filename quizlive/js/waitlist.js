// Pricing table and waitlist sign-up on the landing page.
// Edit PLANS to change prices; everything else reads from it.
// Sign-ups are written to Firestore `waitlist/{email}` (create-only, see firestore.rules).
// Read them in the Firebase console → Firestore → waitlist (export to CSV from there or with gcloud).
import { fs } from "./firebase.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import { $, params, escapeHTML } from "./utils.js";
import { t, onLangChange, getLang, intlLocale } from "./i18n.js";

const PLANS = [
  { id: "free",   price: { en: "€0", fr: "0 €", ar: "0 €" },        per: "",            players: 25,   live: true },
  { id: "event",  price: { en: "€29", fr: "29 €", ar: "29 €" },      per: "price.once",  players: 300,  featured: true },
  { id: "pro",    price: { en: "€6", fr: "6 €", ar: "6 €" },        per: "price.month", players: 150 },
  { id: "teams",  price: { en: "€49", fr: "49 €", ar: "49 €" },      per: "price.month", players: 1000, from: true },
  { id: "edu",    price: { en: "€3", fr: "3 €", ar: "3 €" },        per: "price.month", players: 150 },
];
const USES = ["class", "company", "events", "bar", "other"];
const SIZES = ["s", "m", "l", "xl"];

if (!document.body.classList.contains("joining")) {
  renderPlans();
  renderOptions();
  onLangChange(() => { renderPlans(); renderOptions(); });
}

function renderPlans() {
  const lang = getLang();
  const nf = new Intl.NumberFormat(intlLocale());
  $("#plans").innerHTML = PLANS.map((p) => `
    <article class="plan${p.featured ? " featured" : ""}" aria-labelledby="plan-${p.id}">
      <div class="plan-head">
        <h3 id="plan-${p.id}">${t(`price.${p.id}.name`)}</h3>
        ${p.featured ? `<span class="plan-tag">${t("price.popular")}</span>` : ""}
        <p>${t(`price.${p.id}.for`)}</p>
      </div>
      <div class="plan-price">
        ${p.from ? `<small>${t("price.from")}</small>` : ""}
        <strong class="num">${p.price[lang] || p.price.en}</strong>
        ${p.per ? `<small>${t(p.per)}</small>` : ""}
      </div>
      <ul class="plan-feats">
        <li>${t("price.players", { n: nf.format(p.players) })}</li>
        ${t(`price.${p.id}.feats`).split("|").map((f) => `<li>${escapeHTML(f)}</li>`).join("")}
      </ul>
      <div class="plan-cta">
        ${p.live
          ? `<a class="btn ghost" href="dashboard.html">${t("price.startFree")}</a>
             <small>${t("price.now")}</small>`
          : `<button type="button" class="btn${p.featured ? "" : " ghost"}" data-plan="${p.id}">${t("price.notify")}</button>
             <small>${t("price.soon")}</small>`}
      </div>
    </article>`).join("");
}

function renderOptions() {
  const keep = (id) => $(id).value;
  const fromUrl = params().get("plan");
  const plan = keep("#wl-plan") || (["event", "pro", "teams", "edu"].includes(fromUrl) ? fromUrl : "event");
  const use = keep("#wl-use");
  const size = keep("#wl-size");
  $("#wl-plan").innerHTML = PLANS.filter((p) => !p.live)
    .map((p) => `<option value="${p.id}">${t(`price.${p.id}.name`)}</option>`).join("")
    + `<option value="unsure">${t("wl.unsure")}</option>`;
  $("#wl-use").innerHTML = `<option value="">${t("wl.choose")}</option>`
    + USES.map((u) => `<option value="${u}">${t(`wl.use.${u}`)}</option>`).join("");
  $("#wl-size").innerHTML = `<option value="">${t("wl.choose")}</option>`
    + SIZES.map((s) => `<option value="${s}">${t(`wl.size.${s}`)}</option>`).join("");
  $("#wl-plan").value = plan;
  $("#wl-use").value = use;
  $("#wl-size").value = size;
}

// "Notify me" on a plan: preselect it and jump to the form.
$("#plans")?.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-plan]");
  if (!btn) return;
  $("#wl-plan").value = btn.dataset.plan;
  $("#waitlist").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  $("#wl-email").focus({ preventScroll: true });
});

$("#wl-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = $("#wl-error");
  const ok = $("#wl-ok");
  err.textContent = "";
  ok.textContent = "";

  const email = $("#wl-email").value.trim().toLowerCase();
  if (!/^[^@\s/]+@[^@\s/]+\.[^@\s/]+$/.test(email) || email.length > 200) {
    err.textContent = t("auth.err.invalid-email");
    return $("#wl-email").focus();
  }
  if (!$("#wl-consent").checked) {
    err.textContent = t("wl.err.consent");
    return $("#wl-consent").focus();
  }

  const button = e.submitter || $("#wl-form button[type=submit]");
  button.disabled = true;
  try {
    // The email is the document id, so the same person can't sign up twice.
    await setDoc(doc(fs, "waitlist", email), {
      email,
      plan: $("#wl-plan").value,
      useCase: $("#wl-use").value,
      groupSize: $("#wl-size").value,
      lang: getLang(),
      source: params().get("utm_source") || document.referrer.replace(/^https?:\/\//, "").split("/")[0] || "direct",
      consent: true,
      createdAt: serverTimestamp(),
    });
    $("#wl-form").reset();
    renderOptions();
    ok.textContent = t("wl.ok");
  } catch (error) {
    // An existing document turns the write into an update, which the rules refuse.
    err.textContent = error.code === "permission-denied" ? t("wl.err.already") : t("wl.err.generic");
    console.error(error);
  } finally {
    button.disabled = false;
  }
});
