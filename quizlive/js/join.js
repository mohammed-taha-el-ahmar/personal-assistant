// Player: enter PIN + nickname, then go to play.html.
import { auth, db } from "./firebase.js";
import { signInAnonymously } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { ref, get, update } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-database.js";
import { $, params } from "./utils.js";
import { t, initI18n, mountLangToggle } from "./i18n.js";

initI18n();
mountLangToggle($("#controls"));

const pinInput = $("#pin");
const nickInput = $("#nickname");
const errorEl = $("#error");

pinInput.value = params().get("pin") || "";
nickInput.value = localStorage.getItem("quizlive:nickname") || "";
(pinInput.value ? nickInput : pinInput).focus();

class JoinError extends Error {}

$("#join-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.textContent = "";
  const pin = pinInput.value.trim();
  const nickname = nickInput.value.trim().replace(/\s+/g, " ");

  if (!/^\d{6}$/.test(pin)) return (errorEl.textContent = t("join.err.pin"));
  if (nickname.length < 1 || nickname.length > 15) return (errorEl.textContent = t("join.err.nickname"));

  const button = e.submitter || $("#join-form button");
  button.disabled = true;
  try {
    const user = auth.currentUser || (await signInAnonymously(auth)).user;
    const base = `games/${pin}`;

    const stateSnap = await get(ref(db, `${base}/state`));
    if (!stateSnap.exists()) throw new JoinError(t("join.err.notFound"));

    // Already in this game (page refresh, phone locked…): just rejoin.
    const meSnap = await get(ref(db, `${base}/players/${user.uid}`));
    if (meSnap.exists()) {
      location.href = `play.html?pin=${pin}`;
      return;
    }

    if (stateSnap.val().phase !== "lobby") throw new JoinError(t("join.err.started"));

    const playersSnap = await get(ref(db, `${base}/players`));
    const taken = Object.values(playersSnap.val() || {})
      .some((p) => (p.nickname || "").toLowerCase() === nickname.toLowerCase());
    if (taken) throw new JoinError(t("join.err.taken"));

    // Each child path is checked by its own security rule.
    await update(ref(db, `${base}/players/${user.uid}`), { nickname, connected: true });
    localStorage.setItem("quizlive:nickname", nickname);
    location.href = `play.html?pin=${pin}`;
  } catch (err) {
    console.error(err);
    errorEl.textContent = err instanceof JoinError ? err.message : t("join.err.generic");
    button.disabled = false;
  }
});
