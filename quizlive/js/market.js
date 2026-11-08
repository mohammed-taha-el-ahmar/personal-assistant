// Community market client: browse, copy, publish, unpublish, report, moderate.
// Writes to publicQuizzes happen only in Cloud Functions (functions/index.js); see firestore.rules.
import { app, fs } from "./firebase.js";
import {
  collection, query, where, orderBy, limit, getDocs, getDoc, doc, addDoc, setDoc, deleteDoc, updateDoc,
  deleteField, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-functions.js";

const functions = getFunctions(app, "europe-west1");
const publishFn = httpsCallable(functions, "publishQuiz", { timeout: 95000 });
const moderateFn = httpsCallable(functions, "moderateQuiz");

export const THEMES = ["general", "geography", "science", "tech", "sport", "culture", "history", "language", "icebreaker", "other"];
export const REPORT_REASONS = ["offensive", "adult", "wrong", "copyright", "spam", "illegal", "other"];
const PAGE = 60;

// Same normalisation as the server's search keywords (functions/market.js).
export function normalizeWord(w) {
  return String(w).normalize("NFKD").replace(/\p{M}/gu, "").replace(/ـ/g, "")
    .replace(/[ٱآأإ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه")
    .toLowerCase().trim();
}

// Same ISO week key as the server (functions/market.js), e.g. "2026-W45".
export function weekKey(d = new Date()) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const week = Math.ceil(((date - Date.UTC(date.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

// lang: "all" | "en" | "fr" | "ar"; sort: "popular" | "trending" | "new"; keyword: optional single word.
export async function listPublic({ lang = "all", sort = "popular", keyword = "" } = {}) {
  const parts = [where("status", "==", "published")];
  const word = normalizeWord(keyword).split(/\s+/).find((w) => w.length >= 3);
  if (word) {
    // Keyword search: one indexed word, then language filtered here (keeps the number of indexes small).
    parts.push(where("keywords", "array-contains", word), orderBy("score", "desc"));
  } else {
    if (lang !== "all") parts.push(where("lang", "==", lang));
    if (sort === "trending") parts.push(where("weekKey", "==", weekKey()), orderBy("weekScore", "desc"));
    else parts.push(orderBy(sort === "new" ? "publishedAt" : "score", "desc"));
  }
  parts.push(limit(PAGE));
  const snap = await getDocs(query(collection(fs, "publicQuizzes"), ...parts));
  let items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (word && lang !== "all") items = items.filter((x) => x.lang === lang);
  return items;
}

export async function getPublic(id) {
  const snap = await getDoc(doc(fs, "publicQuizzes", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// Copies a community quiz into the user's quizzes. The copy counter is incremented by a server trigger.
export async function copyPublic(pub, uid) {
  const ref = await addDoc(collection(fs, "quizzes"), {
    ownerUid: uid,
    title: pub.title,
    description: pub.description || "",
    questions: pub.questions,
    source: { publicId: pub.id, creator: pub.creatorName, licence: pub.licence || "CC-BY-4.0", lang: pub.lang },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

// The host's own public quizzes, keyed by quiz id (same id as the public copy).
export async function myPublications(uid) {
  const snap = await getDocs(query(collection(fs, "publicQuizzes"), where("ownerUid", "==", uid)));
  return new Map(snap.docs.map((d) => [d.id, { id: d.id, ...d.data() }]));
}

export async function publish(quizId, { creatorName, lang, theme }) {
  const { data } = await publishFn({ quizId, creatorName, lang, theme, acceptGuidelines: true });
  return data; // { published: true, status } | { published: false, reason, categories }
}

export async function unpublish(quizId) {
  await deleteDoc(doc(fs, "publicQuizzes", quizId));
  await updateDoc(doc(fs, "quizzes", quizId), { publishedAs: deleteField(), publishedAt: deleteField() });
}

export async function creatorName(uid) {
  const snap = await getDoc(doc(fs, "creators", uid)).catch(() => null);
  return snap?.exists() ? snap.data().displayName : "";
}

// A creator's published quizzes, most popular first.
export async function listByCreator(uid) {
  const snap = await getDocs(query(collection(fs, "publicQuizzes"),
    where("ownerUid", "==", uid), where("status", "==", "published"), orderBy("score", "desc"), limit(100)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ---------------------------------------------------------------- likes (host accounts only, see firestore.rules)

export async function myLikes(uid) {
  const snap = await getDocs(query(collection(fs, "likes"), where("uid", "==", uid)));
  return new Set(snap.docs.map((d) => d.data().publicId));
}
export async function like(publicId, uid) {
  await setDoc(doc(fs, "likes", `${publicId}_${uid}`), { publicId, uid, createdAt: serverTimestamp() });
}
export async function unlike(publicId, uid) {
  await deleteDoc(doc(fs, "likes", `${publicId}_${uid}`));
}

export async function report(publicId, uid, reason, details) {
  await setDoc(doc(fs, "reports", `${publicId}_${uid}`), {
    publicId, reporterUid: uid, reason, details: details.slice(0, 500), status: "open", createdAt: serverTimestamp(),
  });
}

// ---------------------------------------------------------------- moderators

export async function moderationQueue() {
  const [hidden, reported] = await Promise.all([
    getDocs(query(collection(fs, "publicQuizzes"), where("status", "==", "hidden"), limit(100))),
    getDocs(query(collection(fs, "publicQuizzes"), where("status", "==", "published"), orderBy("reportCount", "desc"), limit(100))),
  ]);
  const items = new Map();
  for (const d of [...hidden.docs, ...reported.docs]) {
    const data = d.data();
    if (data.status === "hidden" || (data.reportCount || 0) > 0) items.set(d.id, { id: d.id, ...data });
  }
  return [...items.values()];
}

// Latest publications, for a moderator's spot checks.
export async function recentPublished() {
  const snap = await getDocs(query(collection(fs, "publicQuizzes"),
    where("status", "==", "published"), orderBy("publishedAt", "desc"), limit(50)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function reportsFor(publicId) {
  const snap = await getDocs(query(collection(fs, "reports"), where("publicId", "==", publicId), where("status", "==", "open")));
  return snap.docs.map((d) => d.data());
}

export async function moderate(publicId, action, reason = "") {
  const { data } = await moderateFn({ publicId, action, reason });
  return data;
}
