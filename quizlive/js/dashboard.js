// Host dashboard: sign in (Google, email + password, or email link), list quizzes, launch games.
import { auth, db, fs, serverNow } from "./firebase.js";
import {
  onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile,
  sendEmailVerification, sendPasswordResetEmail,
  sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink,
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import {
  collection, query, where, getDocs, deleteDoc, doc, addDoc, serverTimestamp as fsTimestamp,
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import {
  ref, get, update, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-database.js";
import { $, $$, params, showView, escapeHTML, genPin, toast } from "./utils.js";
import { importTemplate } from "./templates.js";
import { mountAiButton } from "./ai.js";
import { myPublications, unpublish, getPublic, copyPublic } from "./market.js";
import { openPublishDialog } from "./publish-dialog.js";
import { t, initI18n, mountLangToggle, onLangChange, getLang } from "./i18n.js";
import { mountSoundButton } from "./sound-panel.js";

initI18n();
mountSoundButton($("#controls"));
mountLangToggle($("#controls"));

let user = null;
let quizzes = [];
let publications = new Map();   // quiz id → public snapshot (community market)
const EMAIL_KEY = "quizlive:emailForSignIn";

// ---------------------------------------------------------------- auth

const authError = (err) => {
  const code = (err?.code || "").replace("auth/", "");
  const msg = t(`auth.err.${code}`);
  $("#auth-error").textContent = msg.startsWith("auth.err.") ? t("auth.err.generic") : msg;
  $("#auth-success").textContent = "";
};
const authOk = (msg) => { $("#auth-success").textContent = msg; $("#auth-error").textContent = ""; };

// Finish an email-link sign-in when the user arrives from the email.
async function completeEmailLink() {
  if (!isSignInWithEmailLink(auth, location.href)) return;
  let email = localStorage.getItem(EMAIL_KEY);
  // Opened on another device: we need the address again (protects against link interception).
  if (!email) email = prompt(t("auth.confirmEmailPrompt"));
  if (!email) return;
  try {
    await signInWithEmailLink(auth, email.trim(), location.href);
    localStorage.removeItem(EMAIL_KEY);
  } catch (err) {
    showView("signin");
    authError(err);
  } finally {
    history.replaceState(null, "", location.pathname);
  }
}
completeEmailLink();

onAuthStateChanged(auth, (u) => {
  // Anonymous accounts are players, not hosts.
  user = u && !u.isAnonymous ? u : null;
  $("#sign-out").hidden = !user;
  $("#user-name").textContent = user ? user.displayName || user.email : "";
  const needsVerify = user && !user.emailVerified
    && user.providerData.some((p) => p.providerId === "password");
  $("#verify-notice").hidden = !needsVerify;
  if (!user) return showView("signin");
  const template = params().get("template");
  if (template) return copyTemplateThenEdit(template);
  const publicId = params().get("public");
  if (publicId) return copyPublicThenEdit(publicId);
  loadQuizzes();
  checkLiveGame();
});

$("#google").addEventListener("click", async () => {
  try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch (err) { authError(err); }
});

$$('[role="tab"]').forEach((tab) => tab.addEventListener("click", () => {
  $$('[role="tab"]').forEach((other) => {
    const active = other === tab;
    other.setAttribute("aria-selected", String(active));
    $(`#${other.getAttribute("aria-controls")}`).hidden = !active;
  });
  $("#auth-error").textContent = "";
  $("#auth-success").textContent = "";
}));

$("#panel-signin").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await signInWithEmailAndPassword(auth, $("#si-email").value.trim(), $("#si-password").value);
  } catch (err) { authError(err); }
});

$("#forgot").addEventListener("click", async () => {
  const email = $("#si-email").value.trim();
  if (!email) return authError({ code: "auth/missing-email" });
  try {
    auth.languageCode = getLang();
    await sendPasswordResetEmail(auth, email);
    authOk(t("auth.resetSent", { email }));
  } catch (err) { authError(err); }
});

$("#panel-signup").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = $("#su-name").value.trim();
  const email = $("#su-email").value.trim();
  const password = $("#su-password").value;
  if (!name) return authError({ code: "auth/missing-name" });
  if (password.length < 8) return authError({ code: "auth/weak-password" });
  if (password !== $("#su-confirm").value) return authError({ code: "auth/password-mismatch" });
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    $("#user-name").textContent = name;
    auth.languageCode = getLang();
    await sendEmailVerification(cred.user);
    toast(t("auth.verifySent", { email }));
  } catch (err) { authError(err); }
});

$("#panel-link").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("#ml-email").value.trim();
  if (!email) return authError({ code: "auth/missing-email" });
  try {
    auth.languageCode = getLang();
    await sendSignInLinkToEmail(auth, email, {
      url: location.origin + location.pathname, // come back to this dashboard
      handleCodeInApp: true,
    });
    localStorage.setItem(EMAIL_KEY, email);
    authOk(t("auth.linkSent", { email }));
  } catch (err) { authError(err); }
});

$("#resend-verify").addEventListener("click", async () => {
  try {
    auth.languageCode = getLang();
    await sendEmailVerification(auth.currentUser);
    toast(t("auth.verifySent", { email: auth.currentUser.email }));
  } catch (err) { toast(t("auth.err.generic")); }
});

$("#sign-out").addEventListener("click", () => signOut(auth));

// Arriving from the library ("Use this quiz" before signing in): finish the copy.
async function copyTemplateThenEdit(id) {
  showView("loading");
  try {
    const quizId = await importTemplate(id, user.uid);
    location.replace(`editor.html?id=${quizId}`);
  } catch (err) {
    console.error(err);
    history.replaceState(null, "", location.pathname);
    toast(t("lib.copyError"));
    loadQuizzes();
    checkLiveGame();
  }
}

mountAiButton($("#new-actions"));

async function copyPublicThenEdit(id) {
  showView("loading");
  try {
    const pub = await getPublic(id);
    if (!pub || pub.status !== "published") throw new Error("not available");
    const quizId = await copyPublic(pub, user.uid);
    location.replace(`editor.html?id=${quizId}`);
  } catch (err) {
    console.error(err);
    history.replaceState(null, "", location.pathname);
    toast(t("lib.copyError"));
    loadQuizzes();
    checkLiveGame();
  }
}

// ---------------------------------------------------------------- quizzes

onLangChange(() => { if (user) renderList(); });

async function loadQuizzes() {
  showView("loading");
  const snap = await getDocs(query(collection(fs, "quizzes"), where("ownerUid", "==", user.uid)));
  quizzes = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
  publications = await myPublications(user.uid).catch(() => new Map());
  renderList();
  showView("list");
}

// Community status line and buttons for one quiz.
function publicationHTML(q) {
  const pub = publications.get(q.id);
  if (!pub) {
    return { line: "", buttons: `<button class="btn small dark" data-action="publish">${t("pub.publish")}</button>` };
  }
  const stale = (q.updatedAt?.seconds || 0) > (pub.updatedAt?.seconds || 0) + 1;
  if (pub.status === "removed") {
    return { line: `<p class="pub-status removed">${t("pub.status.removed", { reason: escapeHTML(pub.moderationReason || "") })}</p>`, buttons: "" };
  }
  const line = pub.status === "hidden"
    ? `<p class="pub-status hidden">${t("pub.status.hidden")}</p>`
    : `<p class="pub-status live">${t("pub.status.live", { plays: pub.plays || 0, copies: pub.copies || 0, likes: pub.likes || 0 })}
        · <a href="library.html?tab=community&p=${q.id}">${t("pub.view")}</a></p>`;
  return {
    line,
    buttons: `${stale ? `<button class="btn small" data-action="publish">${t("pub.update")}</button>` : ""}
      <button class="btn small ghost-ink" data-action="unpublish">${t("pub.unpublish")}</button>`,
  };
}

function renderList() {
  const list = $("#quiz-list");
  $("#empty").hidden = quizzes.length > 0;
  list.innerHTML = quizzes.map((q) => {
    const pub = publicationHTML(q);
    const credit = q.source?.creator ? `<p class="credit">${t("pub.credit", { name: `<bdi>${escapeHTML(q.source.creator)}</bdi>` })}</p>` : "";
    return `
    <article class="card quiz-item" data-id="${q.id}">
      <h3>${escapeHTML(q.title)}</h3>
      <div class="meta">${t("dash.questions", { n: q.questions?.length || 0 })}${q.description ? " · " + escapeHTML(q.description) : ""}</div>
      ${credit}${pub.line}
      <div class="row">
        <button class="btn small" data-action="play">▶ ${t("dash.host")}</button>
        <a class="btn small dark" href="editor.html?id=${q.id}">${t("dash.edit")}</a>
        <a class="btn small dark" href="analytics.html?quiz=${q.id}">📊 ${t("dash.stats")}</a>
        <button class="btn small dark" data-action="duplicate">${t("dash.duplicate")}</button>
        ${pub.buttons}
        <button class="btn small danger" data-action="delete">${t("dash.delete")}</button>
      </div>
    </article>`;
  }).join("");
}

$("#quiz-list").addEventListener("click", async (e) => {
  const button = e.target.closest("button[data-action]");
  if (!button) return;
  const id = button.closest("[data-id]").dataset.id;
  const quiz = quizzes.find((q) => q.id === id);
  button.disabled = true;
  try {
    if (button.dataset.action === "play") await launchGame(quiz);
    if (button.dataset.action === "delete") {
      const pub = publications.get(id);
      const isPublic = pub && pub.status !== "removed";
      if (confirm(t(isPublic ? "pub.confirmDeletePublic" : "dash.confirmDelete", { title: quiz.title }))) {
        if (isPublic) await unpublish(id).catch(() => {});
        await deleteDoc(doc(fs, "quizzes", id));
        await loadQuizzes();
      }
    }
    if (button.dataset.action === "publish") {
      await openPublishDialog(quiz, user, async (status) => {
        toast(t(status === "hidden" ? "pub.done.hidden" : "pub.done.live"));
        await loadQuizzes();
      });
    }
    if (button.dataset.action === "unpublish" && confirm(t("pub.confirmUnpublish", { title: quiz.title }))) {
      await unpublish(id);
      toast(t("pub.unpublished"));
      await loadQuizzes();
    }
    if (button.dataset.action === "duplicate") {
      // A duplicate is a new private quiz: not published, no community link.
      const { id: _id, publishedAs: _p, publishedAt: _pa, ...data } = quiz;
      await addDoc(collection(fs, "quizzes"), {
        ...data, title: `${quiz.title} (${t("dash.copy")})`, createdAt: fsTimestamp(), updatedAt: fsTimestamp(),
      });
      await loadQuizzes();
    }
  } catch (err) {
    console.error(err);
    toast(err.message);
  } finally {
    button.disabled = false;
  }
});

// ---------------------------------------------------------------- live game (fair use)
// Free plan: one live game at a time, and a short pause between new games.
// Both are enforced by database.rules.json; these checks only give clearer messages.
const STALE_MS = 12 * 60 * 60 * 1000;   // a game untouched for 12 h no longer blocks a new one
const COOLDOWN_MS = 30 * 1000;
let liveGame = null;                    // { pin, title } or null

async function checkLiveGame() {
  liveGame = null;
  const pointer = (await get(ref(db, `hostGames/${user.uid}`)).catch(() => null))?.val();
  if (pointer?.pin) {
    const game = (await get(ref(db, `games/${pointer.pin}`)).catch(() => null))?.val();
    if (game && game.hostUid === user.uid && serverNow() - (game.createdAt || 0) < STALE_MS) {
      liveGame = { pin: pointer.pin, title: game.title || "" };
    }
  }
  renderLiveBanner();
  return liveGame;
}

function renderLiveBanner() {
  $("#live-banner").hidden = !liveGame;
  if (!liveGame) return;
  $("#live-text").textContent = t("dash.live.text", { title: liveGame.title, pin: liveGame.pin });
  $("#live-resume").href = `host.html?pin=${liveGame.pin}`;
}

async function endGame(pin) {
  // One multi-path write: rules are checked against the data before it, so all three deletes pass together.
  await update(ref(db), {
    [`games/${pin}`]: null,
    [`gameAnswers/${pin}`]: null,
    [`hostGames/${user.uid}`]: null,
  });
}

$("#live-end").addEventListener("click", async (e) => {
  if (!liveGame || !confirm(t("dash.live.confirmEnd", { pin: liveGame.pin }))) return;
  e.target.disabled = true;
  try {
    await endGame(liveGame.pin);
    await checkLiveGame();
    toast(t("dash.live.ended"));
  } catch (err) {
    console.error(err);
    toast(t("auth.err.generic"));
  } finally {
    e.target.disabled = false;
  }
});

onLangChange(() => { if (user) renderLiveBanner(); });

async function launchGame(quiz) {
  if (!quiz.questions?.length) return toast(t("dash.noQuestions"));

  if (await checkLiveGame()) {
    $("#live-banner").scrollIntoView({ block: "center" });
    $("#live-resume").focus();
    return toast(t("dash.live.blocked"));
  }
  const last = (await get(ref(db, `hostQuota/${user.uid}/lastCreatedAt`)).catch(() => null))?.val();
  const wait = last ? Math.ceil((last + COOLDOWN_MS - serverNow()) / 1000) : 0;
  if (wait > 0) return toast(t("dash.live.cooldown", { n: wait }));

  // One analytics session id per game, generated client-side (no write yet).
  const sessionId = doc(collection(fs, "gameSessions")).id;
  for (let attempt = 0; attempt < 5; attempt++) {
    const pin = genPin();
    const taken = await get(ref(db, `games/${pin}/hostUid`));
    if (taken.exists()) continue;
    try {
      // Game, live-game pointer and cooldown stamp land together, or not at all.
      await update(ref(db), {
        [`games/${pin}`]: {
          hostUid: user.uid,
          quizId: quiz.id,
          sessionId,
          title: quiz.title,
          createdAt: serverTimestamp(),
          state: { phase: "lobby", index: -1, total: quiz.questions.length },
        },
        [`hostGames/${user.uid}`]: { pin, createdAt: serverTimestamp() },
        [`hostQuota/${user.uid}/lastCreatedAt`]: serverTimestamp(),
      });
    } catch (err) {
      console.error(err);
      // The rules refused: another tab may have started a game, or the cooldown isn't over.
      if (await checkLiveGame()) return toast(t("dash.live.blocked"));
      return toast(t("dash.live.cooldownGeneric"));
    }
    location.href = `host.html?pin=${pin}`;
    return;
  }
  toast(t("dash.noPin"));
}
