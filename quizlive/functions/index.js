// Cloud Functions (Blaze plan): AI quiz generation with a monthly allowance per plan.
// Deploy: firebase functions:secrets:set ANTHROPIC_API_KEY && firebase deploy --only functions
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentCreated, onDocumentUpdated, onDocumentDeleted } from "firebase-functions/v2/firestore";
import { setGlobalOptions, logger } from "firebase-functions/v2";
import { defineSecret, defineString } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";
import {
  ALLOWANCE, RequestError, monthKey, validateRequest, fetchPageText, callClaude, sanitizeQuiz,
} from "./lib.js";
import {
  preparePublication, checkContent, scoreOf, applyCounter, validateReport, countRealPlayers, dayKey,
  PUBLISH_PER_DAY, REPORTS_TO_HIDE, MIN_PLAYERS_FOR_PLAY,
} from "./market.js";

initializeApp();
const db = getFirestore();
setGlobalOptions({ region: "europe-west1", maxInstances: 10 });

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");
const CLAUDE_MODEL = defineString("CLAUDE_MODEL", { default: "claude-sonnet-5-5" });
const MODERATION_MODEL = defineString("MODERATION_MODEL", { default: "claude-haiku-5-5" });

function hostOf(request) {
  const auth = request.auth;
  if (!auth || auth.token.firebase?.sign_in_provider === "anonymous") {
    throw new HttpsError("unauthenticated", "sign-in");
  }
  const plan = Object.hasOwn(ALLOWANCE, auth.token.plan) ? auth.token.plan : "free";
  return { uid: auth.uid, plan, allowance: ALLOWANCE[plan] };
}

async function usageOf(uid) {
  const snap = await db.doc(`aiUsage/${uid}`).get();
  const d = snap.data();
  return d?.month === monthKey() ? d.count : 0;
}

// How many generations are left this month.
export const aiAllowance = onCall(async (request) => {
  const { uid, plan, allowance } = hostOf(request);
  const used = await usageOf(uid);
  return { plan, allowance, used, remaining: Math.max(0, allowance - used) };
});

export const generateQuiz = onCall(
  { secrets: [ANTHROPIC_API_KEY], timeoutSeconds: 150, memory: "512MiB" },
  async (request) => {
    const { uid, plan, allowance } = hostOf(request);
    let req;
    try {
      req = validateRequest(request.data);
    } catch (err) {
      throw new HttpsError("invalid-argument", err.code || "bad-request");
    }

    // Reserve one generation up front (refunded on failure), so parallel calls can't exceed the allowance.
    const usageRef = db.doc(`aiUsage/${uid}`);
    const month = monthKey();
    const used = await db.runTransaction(async (tx) => {
      const d = (await tx.get(usageRef)).data();
      const count = d?.month === month ? d.count : 0;
      if (count >= allowance) throw new HttpsError("resource-exhausted", "allowance");
      tx.set(usageRef, { month, count: count + 1, plan, updatedAt: FieldValue.serverTimestamp() });
      return count + 1;
    });

    try {
      const sourceText = req.source === "url" ? await fetchPageText(req.url) : req.text || "";
      const model = CLAUDE_MODEL.value();
      const { quiz: raw, usage } = await callClaude({ apiKey: ANTHROPIC_API_KEY.value(), model, req, sourceText });
      const quiz = sanitizeQuiz(raw, req);
      if (quiz.questions.length < Math.min(3, req.count)) throw new RequestError("bad-output");

      const ref = await db.collection("quizzes").add({
        ownerUid: uid,
        ...quiz,
        source: { ai: { model, from: req.source, lang: req.lang, difficulty: req.difficulty } },
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      logger.info("quiz generated", { uid, plan, from: req.source, questions: quiz.questions.length, usage });
      return { quizId: ref.id, questions: quiz.questions.length, remaining: Math.max(0, allowance - used) };
    } catch (err) {
      await usageRef.update({ count: FieldValue.increment(-1) }).catch(() => {});
      if (err instanceof HttpsError) throw err;
      if (err instanceof RequestError) {
        logger.warn("generation failed", { uid, code: err.code, detail: err.detail });
        const status = ["bad-url", "page-unreachable", "page-not-text", "page-empty"].includes(err.code)
          ? "invalid-argument" : "internal";
        throw new HttpsError(status, err.code);
      }
      logger.error("generation crashed", err);
      throw new HttpsError("internal", "generation-failed");
    }
  },
);

// ======================================================================= community market
// publicQuizzes/{quizId}: the public snapshot of a quiz (same id as the private quiz).
// Only these functions write it; the owner may delete it (unpublish) unless a moderator removed it.

export const publishQuiz = onCall({ secrets: [ANTHROPIC_API_KEY], timeoutSeconds: 90 }, async (request) => {
  const { uid } = hostOf(request);
  const quizId = String(request.data?.quizId || "");
  if (!/^[A-Za-z0-9_-]{6,60}$/.test(quizId)) throw new HttpsError("invalid-argument", "bad-quiz");

  const quizRef = db.doc(`quizzes/${quizId}`);
  const quizSnap = await quizRef.get();
  if (!quizSnap.exists || quizSnap.data().ownerUid !== uid) throw new HttpsError("permission-denied", "not-owner");

  let pub;
  try {
    pub = preparePublication(quizSnap.data(), request.data);
  } catch (err) {
    throw new HttpsError("invalid-argument", err.code || "bad-request");
  }

  const pubRef = db.doc(`publicQuizzes/${quizId}`);
  const existing = (await pubRef.get()).data();
  if (existing?.status === "removed") throw new HttpsError("failed-precondition", "removed");

  // At most PUBLISH_PER_DAY publish attempts per day (each one costs a content check).
  const day = new Date().toISOString().slice(0, 10);
  await db.runTransaction(async (tx) => {
    const ref = db.doc(`publishUsage/${uid}`);
    const d = (await tx.get(ref)).data();
    const count = d?.day === day ? d.count : 0;
    if (count >= PUBLISH_PER_DAY) throw new HttpsError("resource-exhausted", "publish-limit");
    tx.set(ref, { day, count: count + 1 });
  });

  const model = MODERATION_MODEL.value();
  let verdict;
  try {
    verdict = await checkContent({ apiKey: ANTHROPIC_API_KEY.value(), model, pub });
  } catch (err) {
    logger.warn("content check failed", { uid, code: err.code });
    throw new HttpsError("unavailable", "check-unavailable");
  }
  if (!verdict.allowed) {
    logger.info("publish refused", { uid, quizId, categories: verdict.categories });
    return { published: false, reason: verdict.reason, categories: verdict.categories };
  }

  const now = FieldValue.serverTimestamp();
  // A quiz hidden after reports stays hidden when republished, until a moderator reviews it.
  const status = existing?.status === "hidden" ? "hidden" : "published";
  const batch = db.batch();
  batch.set(db.doc(`creators/${uid}`), { displayName: pub.creatorName, updatedAt: now }, { merge: true });
  batch.set(pubRef, {
    ...pub,
    ownerUid: uid,
    quizId,
    status,
    plays: existing?.plays || 0,
    copies: existing?.copies || 0,
    likes: existing?.likes || 0,
    weekKey: existing?.weekKey || "",
    weekScore: existing?.weekScore || 0,
    reportCount: existing?.reportCount || 0,
    score: scoreOf(existing || {}),
    publishedAt: existing?.publishedAt || now,
    updatedAt: now,
    moderation: { model, checkedAt: now },
  });
  batch.update(quizRef, { publishedAs: quizId, publishedAt: now });
  await batch.commit();
  return { published: true, status };
});

// Copies: counted once per copying account, never for the author's own copies.
export const onQuizCopied = onDocumentCreated("quizzes/{quizId}", async (event) => {
  const q = event.data?.data();
  const publicId = q?.source?.publicId;
  if (!publicId || typeof publicId !== "string") return;
  const pubRef = db.doc(`publicQuizzes/${publicId}`);
  await db.runTransaction(async (tx) => {
    const pub = await tx.get(pubRef);
    if (!pub.exists || pub.data().ownerUid === q.ownerUid) return;
    const marker = pubRef.collection("copiedBy").doc(q.ownerUid);
    if ((await tx.get(marker)).exists) return;
    tx.set(marker, { at: FieldValue.serverTimestamp() });
    tx.update(pubRef, applyCounter(pub.data(), "copies", 1));
  });
});

// Plays: verified against the live game, not just the host's own report.
//  1. the Realtime Database game for this session exists and belongs to this host;
//  2. at least MIN_PLAYERS_FOR_PLAY players (not the host) answered at least half the questions
//     (answers are written by players' devices, server-timestamped, under database.rules.json);
//  3. one play per host per public quiz per day, which caps self-inflation even with scripted players.
export const onGameCompleted = onDocumentUpdated("gameSessions/{sessionId}", async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!after || before?.status === "completed" || after.status !== "completed") return;
  const sessionId = event.params.sessionId;
  const quiz = (await db.doc(`quizzes/${after.quizId}`).get()).data();
  const publicId = quiz?.publishedAs || quiz?.source?.publicId;
  if (!publicId || !/^\d{6}$/.test(String(after.pin || ""))) return;

  const rtdb = getDatabase();
  const game = (await rtdb.ref(`games/${after.pin}`).get()).val();
  if (!game || game.hostUid !== after.ownerUid || game.sessionId !== sessionId) {
    logger.info("play not counted: game not found or not this session", { sessionId, pin: after.pin });
    return;
  }
  const answers = (await rtdb.ref(`gameAnswers/${after.pin}`).get()).val();
  const realPlayers = countRealPlayers(answers, { questionCount: after.questionCount, hostUid: after.ownerUid });
  if (realPlayers < MIN_PLAYERS_FOR_PLAY) {
    logger.info("play not counted: too few real players", { sessionId, realPlayers });
    return;
  }

  const pubRef = db.doc(`publicQuizzes/${publicId}`);
  await db.runTransaction(async (tx) => {
    const pub = await tx.get(pubRef);
    if (!pub.exists) return;
    const sessionMarker = pubRef.collection("plays").doc(sessionId);
    const dailyMarker = pubRef.collection("playsByHost").doc(`${after.ownerUid}_${dayKey()}`);
    const [s1, s2] = await Promise.all([tx.get(sessionMarker), tx.get(dailyMarker)]);
    if (s1.exists || s2.exists) return;
    tx.set(sessionMarker, { at: FieldValue.serverTimestamp(), players: realPlayers });
    tx.set(dailyMarker, { at: FieldValue.serverTimestamp(), sessionId });
    tx.update(pubRef, applyCounter(pub.data(), "plays", 1));
  });
});

// Likes: one document per host per quiz (likes/{publicId}_{uid}); firestore.rules checks who may like.
async function countLike(publicId, delta) {
  if (typeof publicId !== "string" || !publicId) return;
  const pubRef = db.doc(`publicQuizzes/${publicId}`);
  await db.runTransaction(async (tx) => {
    const pub = await tx.get(pubRef);
    if (!pub.exists) return;
    tx.update(pubRef, applyCounter(pub.data(), "likes", delta));
  });
}
export const onLikeCreated = onDocumentCreated("likes/{likeId}", (event) => countLike(event.data?.data()?.publicId, 1));
export const onLikeDeleted = onDocumentDeleted("likes/{likeId}", (event) => countLike(event.data?.data()?.publicId, -1));

// Unpublished: remove its likes, so the count starts again from zero if it's published again.
export const onPublicQuizDeleted = onDocumentDeleted("publicQuizzes/{publicId}", async (event) => {
  const likes = await db.collection("likes").where("publicId", "==", event.params.publicId).get();
  for (let i = 0; i < likes.docs.length; i += 400) {
    const batch = db.batch();
    likes.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
});

// Reports: counted on the quiz; REPORTS_TO_HIDE reports from host accounts hide it until reviewed.
// Reports from anonymous player accounts are kept for review but don't trigger hiding (too easy to fake).
export const onReport = onDocumentCreated("reports/{reportId}", async (event) => {
  const r = event.data?.data();
  if (!r?.publicId) return;
  try { validateReport(r); } catch { return; }
  let fromHost = false;
  try {
    const user = await getAuth().getUser(r.reporterUid);
    fromHost = user.providerData.length > 0;
  } catch { /* deleted account */ }
  const pubRef = db.doc(`publicQuizzes/${r.publicId}`);
  await db.runTransaction(async (tx) => {
    const pub = await tx.get(pubRef);
    if (!pub.exists) return;
    const d = pub.data();
    const update = { reportCount: (d.reportCount || 0) + 1, lastReportAt: FieldValue.serverTimestamp() };
    if (fromHost) update.hostReportCount = (d.hostReportCount || 0) + 1;
    if (d.status === "published" && (update.hostReportCount || d.hostReportCount || 0) >= REPORTS_TO_HIDE) {
      update.status = "hidden";
      update.hiddenReason = "reports";
    }
    tx.update(pubRef, update);
  });
});

// Moderator actions (custom claim admin: true). "remove" requires a reason, shown to the author.
export const moderateQuiz = onCall(async (request) => {
  if (request.auth?.token?.admin !== true) throw new HttpsError("permission-denied", "not-admin");
  const { publicId, action } = request.data || {};
  const reason = typeof request.data?.reason === "string" ? request.data.reason.trim().slice(0, 300) : "";
  if (typeof publicId !== "string" || !["restore", "remove", "dismiss"].includes(action)) {
    throw new HttpsError("invalid-argument", "bad-request");
  }
  if (action === "remove" && reason.length < 5) throw new HttpsError("invalid-argument", "reason-required");

  const pubRef = db.doc(`publicQuizzes/${publicId}`);
  if (!(await pubRef.get()).exists) throw new HttpsError("not-found", "no-quiz");
  const now = FieldValue.serverTimestamp();
  const batch = db.batch();
  const reviewed = { reportCount: 0, hostReportCount: 0, reviewedAt: now, reviewedBy: request.auth.uid };
  if (action === "restore") batch.update(pubRef, { ...reviewed, status: "published", hiddenReason: FieldValue.delete(), moderationReason: FieldValue.delete() });
  if (action === "dismiss") batch.update(pubRef, reviewed);
  if (action === "remove") batch.update(pubRef, { ...reviewed, status: "removed", moderationReason: reason, removedAt: now });
  const open = await db.collection("reports").where("publicId", "==", publicId).where("status", "==", "open").get();
  open.forEach((doc) => batch.update(doc.ref, { status: "reviewed", action, reviewedAt: now }));
  await batch.commit();
  logger.info("moderation", { publicId, action, by: request.auth.uid, reports: open.size });
  return { ok: true, reports: open.size };
});
