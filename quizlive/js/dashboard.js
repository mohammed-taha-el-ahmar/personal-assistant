// Host dashboard: sign in (Google, email + password, or email link), list quizzes, launch games.
import { auth, db, fs } from "./firebase.js";
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
  ref, get, set, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-database.js";
import { $, $$, showView, escapeHTML, genPin, toast } from "./utils.js";
import { t, initI18n, mountLangToggle, onLangChange, getLang } from "./i18n.js";

initI18n();
mountLangToggle($("#controls"));

let user = null;
let quizzes = [];
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
  loadQuizzes();
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

// ---------------------------------------------------------------- quizzes

onLangChange(() => { if (user) renderList(); });

async function loadQuizzes() {
  showView("loading");
  const snap = await getDocs(query(collection(fs, "quizzes"), where("ownerUid", "==", user.uid)));
  quizzes = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
  renderList();
  showView("list");
}

function renderList() {
  const list = $("#quiz-list");
  $("#empty").hidden = quizzes.length > 0;
  list.innerHTML = quizzes.map((q) => `
    <article class="card quiz-item" data-id="${q.id}">
      <h3>${escapeHTML(q.title)}</h3>
      <div class="meta">${t("dash.questions", { n: q.questions?.length || 0 })}${q.description ? " · " + escapeHTML(q.description) : ""}</div>
      <div class="row">
        <button class="btn small" data-action="play">▶ ${t("dash.host")}</button>
        <a class="btn small dark" href="editor.html?id=${q.id}">${t("dash.edit")}</a>
        <a class="btn small dark" href="analytics.html?quiz=${q.id}">📊 ${t("dash.stats")}</a>
        <button class="btn small dark" data-action="duplicate">${t("dash.duplicate")}</button>
        <button class="btn small danger" data-action="delete">${t("dash.delete")}</button>
      </div>
    </article>`).join("");
}

$("#quiz-list").addEventListener("click", async (e) => {
  const button = e.target.closest("button[data-action]");
  if (!button) return;
  const id = button.closest("[data-id]").dataset.id;
  const quiz = quizzes.find((q) => q.id === id);
  button.disabled = true;
  try {
    if (button.dataset.action === "play") await launchGame(quiz);
    if (button.dataset.action === "delete" && confirm(t("dash.confirmDelete", { title: quiz.title }))) {
      await deleteDoc(doc(fs, "quizzes", id));
      await loadQuizzes();
    }
    if (button.dataset.action === "duplicate") {
      const { id: _id, ...data } = quiz;
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

async function launchGame(quiz) {
  if (!quiz.questions?.length) return toast(t("dash.noQuestions"));
  // One analytics session id per game, generated client-side (no write yet).
  const sessionId = doc(collection(fs, "gameSessions")).id;
  for (let attempt = 0; attempt < 5; attempt++) {
    const pin = genPin();
    const taken = await get(ref(db, `games/${pin}/hostUid`));
    if (taken.exists()) continue;
    await set(ref(db, `games/${pin}`), {
      hostUid: user.uid,
      quizId: quiz.id,
      sessionId,
      title: quiz.title,
      createdAt: serverTimestamp(),
      state: { phase: "lobby", index: -1, total: quiz.questions.length },
    });
    location.href = `host.html?pin=${pin}`;
    return;
  }
  toast(t("dash.noPin"));
}
