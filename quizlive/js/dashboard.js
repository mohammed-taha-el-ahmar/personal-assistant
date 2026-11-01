// Host dashboard: sign in, list quizzes, launch a live game.
import { auth, db, fs } from "./firebase.js";
import {
  onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut,
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import {
  collection, query, where, getDocs, deleteDoc, doc, addDoc, serverTimestamp as fsTimestamp,
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import {
  ref, get, set, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-database.js";
import { $, showView, escapeHTML, genPin, toast } from "./utils.js";

let user = null;
let quizzes = [];

onAuthStateChanged(auth, (u) => {
  // Anonymous accounts are players, not hosts.
  user = u && !u.isAnonymous ? u : null;
  $("#sign-out").hidden = !user;
  $("#user-name").textContent = user ? user.displayName || user.email : "";
  if (!user) return showView("signin");
  loadQuizzes();
});

$("#sign-in").addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
  } catch (err) {
    $("#signin-error").textContent = err.message;
  }
});

$("#sign-out").addEventListener("click", () => signOut(auth));

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
      <div class="meta">${q.questions?.length || 0} questions${q.description ? " · " + escapeHTML(q.description) : ""}</div>
      <div class="row">
        <button class="btn small" data-action="play">▶ Host live</button>
        <a class="btn small dark" href="editor.html?id=${q.id}">Edit</a>
        <button class="btn small dark" data-action="duplicate">Duplicate</button>
        <button class="btn small danger" data-action="delete">Delete</button>
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
    if (button.dataset.action === "delete" && confirm(`Delete "${quiz.title}"?`)) {
      await deleteDoc(doc(fs, "quizzes", id));
      await loadQuizzes();
    }
    if (button.dataset.action === "duplicate") {
      const { id: _id, ...data } = quiz;
      await addDoc(collection(fs, "quizzes"), {
        ...data, title: `${quiz.title} (copy)`, createdAt: fsTimestamp(), updatedAt: fsTimestamp(),
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
  if (!quiz.questions?.length) return toast("This quiz has no questions yet.");
  for (let attempt = 0; attempt < 5; attempt++) {
    const pin = genPin();
    const taken = await get(ref(db, `games/${pin}/hostUid`));
    if (taken.exists()) continue;
    await set(ref(db, `games/${pin}`), {
      hostUid: user.uid,
      quizId: quiz.id,
      title: quiz.title,
      createdAt: serverTimestamp(),
      state: { phase: "lobby", index: -1, total: quiz.questions.length },
    });
    location.href = `host.html?pin=${pin}`;
    return;
  }
  toast("Could not find a free PIN, try again.");
}
