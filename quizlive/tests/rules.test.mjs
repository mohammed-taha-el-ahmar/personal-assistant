// Security rules tests. Run with: npm install && npm run test:rules  (needs Java 11+)
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { ref, set, update, get, serverTimestamp } from "firebase/database";
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp as fsTs } from "firebase/firestore";
import { readFileSync } from "fs";

const env = await initializeTestEnvironment({
  projectId: "demo-quiz",
  database: { rules: readFileSync(new URL("../database.rules.json", import.meta.url), "utf8"), host: "127.0.0.1", port: 9000 },
  firestore: { rules: readFileSync(new URL("../firestore.rules", import.meta.url), "utf8"), host: "127.0.0.1", port: 8080 },
});
const host = (uid) => env.authenticatedContext(uid, { firebase: { sign_in_provider: "password" } });
const anon = (uid) => env.authenticatedContext(uid, { firebase: { sign_in_provider: "anonymous" } });
let pass = 0, fail = 0;
const check = async (name, p) => { try { await p; pass++; console.log("  ok  ", name); } catch (e) { fail++; console.log("  FAIL", name, "-", e.message.split("\n")[0]); } };

const game = (uid, extra = {}) => ({ hostUid: uid, quizId: "q1", sessionId: "s1", title: "T", createdAt: serverTimestamp(),
  state: { phase: "lobby", index: -1, total: 2 }, ...extra });
const createWrite = (uid, pin) => ({
  [`games/${pin}`]: game(uid),
  [`hostGames/${uid}`]: { pin, createdAt: serverTimestamp() },
  [`hostQuota/${uid}/lastCreatedAt`]: serverTimestamp(),
});

console.log("Realtime Database");
{
  const db = host("alice").database();
  await check("host creates a game atomically", assertSucceeds(update(ref(db), createWrite("alice", "111111"))));
  await check("second live game is refused", assertFails(update(ref(db), createWrite("alice", "222222"))));
  await check("host can update own game state", assertSucceeds(set(ref(db, "games/111111/state/phase"), "intro")));
  await set(ref(db, "games/111111/state/phase"), "lobby");

  // player joins and answers
  const pdb = anon("p1").database();
  await check("player joins in lobby", assertSucceeds(update(ref(pdb, "games/111111/players/p1"), { nickname: "Bob", connected: true })));
  await env.withSecurityRulesDisabled(async (c) => {
    await update(ref(c.database(), "games/111111/state"), { phase: "question", key: "q0", startedAt: Date.now(), timeLimit: 20, answerCount: 4 });
    await set(ref(c.database(), "games/111111/players/p9"), { nickname: "Nina" }); // joined, so only the payload is tested
  });
  await check("player answers current question", assertSucceeds(set(ref(pdb, "gameAnswers/111111/q0/p1"), { choice: 1, at: serverTimestamp() })));
  await check("player cannot send text to a choice question", assertFails(set(ref(anon("p9").database(), "gameAnswers/111111/q0/p9"), { text: "x", at: serverTimestamp() })));
  await check("player cannot answer twice", assertFails(set(ref(pdb, "gameAnswers/111111/q0/p1"), { choice: 2, at: serverTimestamp() })));
  await check("player cannot read all answers", assertFails(get(ref(pdb, "gameAnswers/111111/q0"))));
  await check("host reads all answers", assertSucceeds(get(ref(db, "gameAnswers/111111/q0"))));
  await check("player cannot write a score", assertFails(set(ref(pdb, "games/111111/players/p1/score"), 9999)));

  // typed answers
  await env.withSecurityRulesDisabled(async (c) => {
    await update(ref(c.database(), "games/111111/state"), { phase: "question", key: "q1", type: "typeAnswer", answerCount: 0, startedAt: Date.now(), timeLimit: 20 });
    await set(ref(c.database(), "games/111111/players/p2"), { nickname: "Ali" });
    await set(ref(c.database(), "games/111111/players/p3"), { nickname: "Zoé" });
  });
  await check("player types an answer", assertSucceeds(set(ref(pdb, "gameAnswers/111111/q1/p1"), { text: "Paris", at: serverTimestamp() })));
  await check("typed answer longer than 60 is refused", assertFails(set(ref(anon("p2").database(), "gameAnswers/111111/q1/p2"), { text: "x".repeat(61), at: serverTimestamp() })));
  await check("choice on a typed question is refused", assertFails(set(ref(anon("p3").database(), "gameAnswers/111111/q1/p3"), { choice: 0, at: serverTimestamp() })));
  await check("choice and text together are refused", assertFails(set(ref(anon("p3").database(), "gameAnswers/111111/q1/p3"), { choice: 0, text: "a", at: serverTimestamp() })));

  await check("host ends game (game + answers + pointer)", assertSucceeds(update(ref(db), { "games/111111": null, "gameAnswers/111111": null, "hostGames/alice": null })));
  await check("new game within 30 s is refused (cooldown)", assertFails(update(ref(db), createWrite("alice", "333333"))));

  await env.withSecurityRulesDisabled(async (c) => { await set(ref(c.database(), "hostQuota/alice/lastCreatedAt"), Date.now() - 60_000); });
  await check("new game after the cooldown is allowed", assertSucceeds(update(ref(db), createWrite("alice", "333333"))));

  // stale game no longer blocks
  await env.withSecurityRulesDisabled(async (c) => {
    await set(ref(c.database(), "games/333333/createdAt"), Date.now() - 13 * 3600_000);
    await set(ref(c.database(), "hostQuota/alice/lastCreatedAt"), Date.now() - 60_000);
  });
  await check("game untouched for 12 h no longer blocks", assertSucceeds(update(ref(db), createWrite("alice", "444444"))));

  const bdb = host("bruno").database();
  await check("game without pointer/quota is refused", assertFails(set(ref(bdb, "games/555555"), game("bruno"))));
  await check("anonymous user cannot create a game", assertFails(update(ref(anon("eve").database()), createWrite("eve", "666666"))));
  await check("host cannot fake an old quota timestamp", assertFails(set(ref(bdb, "hostQuota/bruno/lastCreatedAt"), 0)));
  await check("host cannot delete own quota", assertFails(set(ref(bdb, "hostQuota/bruno/lastCreatedAt"), null)));
  await check("other host cannot read alice's pointer", assertFails(get(ref(bdb, "hostGames/alice"))));
  await check("other host cannot overwrite alice's game", assertFails(set(ref(bdb, "games/444444/title"), "hacked")));
}

console.log("Firestore");
{
  const fdb = host("alice").firestore();
  const sig = { schemaVersion: 1, ownerUid: "alice", sessionId: "s1", quizId: "q1", signal: "player_cap_reached", limit: 25, playerCount: 25, createdAt: fsTs() };
  await check("host logs cap signal", assertSucceeds(setDoc(doc(fdb, "upgradeSignals/s1_player_cap"), sig)));
  await check("host merges playerCountAtStart", assertSucceeds(setDoc(doc(fdb, "upgradeSignals/s1_player_cap"), { playerCountAtStart: 31 }, { merge: true })));
  await check("signal with wrong id is refused", assertFails(setDoc(doc(fdb, "upgradeSignals/whatever"), sig)));
  await check("anonymous cannot log a signal", assertFails(setDoc(doc(anon("p1").firestore(), "upgradeSignals/s2_player_cap"), { ...sig, ownerUid: "p1", sessionId: "s2" })));
  await check("other host cannot read the signal", assertFails(getDoc(doc(host("bruno").firestore(), "upgradeSignals/s1_player_cap"))));

  const visitor = env.unauthenticatedContext().firestore();
  const wl = { email: "a@b.co", plan: "event", useCase: "company", groupSize: "l", lang: "fr", source: "player_cap", consent: true, createdAt: fsTs() };
  await check("visitor joins waitlist", assertSucceeds(setDoc(doc(visitor, "waitlist/a@b.co"), wl)));
  await check("same email twice is refused", assertFails(setDoc(doc(visitor, "waitlist/a@b.co"), wl)));
  await check("waitlist cannot be read", assertFails(getDoc(doc(visitor, "waitlist/a@b.co"))));
  await check("waitlist rejects extra fields", assertFails(setDoc(doc(visitor, "waitlist/c@d.co"), { ...wl, email: "c@d.co", admin: true })));
  await check("waitlist id must equal email", assertFails(setDoc(doc(visitor, "waitlist/x@y.co"), wl)));
  await check("Arabic sign-up is accepted", assertSucceeds(setDoc(doc(visitor, "waitlist/g@h.co"), { ...wl, email: "g@h.co", lang: "ar" })));
  await check("waitlist rejects missing consent", assertFails(setDoc(doc(visitor, "waitlist/e@f.co"), { ...wl, email: "e@f.co", consent: false })));
}
console.log("Community market");
{
  const pubData = (status, owner = "alice") => ({ ownerUid: owner, quizId: "pq1", title: "T", status, questions: [], plays: 0, copies: 0, score: 0 });
  await env.withSecurityRulesDisabled(async (c) => {
    const f = c.firestore();
    await setDoc(doc(f, "publicQuizzes/pub1"), pubData("published"));
    await setDoc(doc(f, "publicQuizzes/hid1"), pubData("hidden"));
    await setDoc(doc(f, "publicQuizzes/rem1"), pubData("removed"));
    await setDoc(doc(f, "creators/alice"), { displayName: "Alice" });
  });
  const visitor = env.unauthenticatedContext().firestore();
  const bruno = host("bruno").firestore();
  const alice = host("alice").firestore();
  const admin = env.authenticatedContext("mod", { admin: true, firebase: { sign_in_provider: "password" } }).firestore();
  await check("anyone reads a published quiz", assertSucceeds(getDoc(doc(visitor, "publicQuizzes/pub1"))));
  await check("visitor cannot read a hidden quiz", assertFails(getDoc(doc(visitor, "publicQuizzes/hid1"))));
  await check("author reads own hidden quiz", assertSucceeds(getDoc(doc(alice, "publicQuizzes/hid1"))));
  await check("moderator reads a hidden quiz", assertSucceeds(getDoc(doc(admin, "publicQuizzes/hid1"))));
  await check("nobody publishes from the browser", assertFails(setDoc(doc(alice, "publicQuizzes/new1"), pubData("published"))));
  await check("author cannot inflate counters", assertFails(setDoc(doc(alice, "publicQuizzes/pub1"), { ...pubData("published"), plays: 9999 })));
  await check("other host cannot unpublish", assertFails(deleteDoc(doc(bruno, "publicQuizzes/pub1"))));
  await check("author cannot delete a removed quiz", assertFails(deleteDoc(doc(alice, "publicQuizzes/rem1"))));
  await check("creator names are public", assertSucceeds(getDoc(doc(visitor, "creators/alice"))));
  await check("nobody writes creator names from the browser", assertFails(setDoc(doc(alice, "creators/alice"), { displayName: "Admin" })));
  await check("copy markers are private", assertFails(getDoc(doc(alice, "publicQuizzes/pub1/copiedBy/bruno"))));

  const report = (uid, extra = {}) => ({ publicId: "pub1", reporterUid: uid, reason: "offensive", details: "", status: "open", createdAt: fsTs(), ...extra });
  const player = anon("p7").firestore();
  await check("anonymous player can report", assertSucceeds(setDoc(doc(player, "reports/pub1_p7"), report("p7"))));
  await check("same account cannot report twice", assertFails(setDoc(doc(player, "reports/pub1_p7"), report("p7"))));
  await check("report id must match the reporter", assertFails(setDoc(doc(bruno, "reports/pub1_someoneelse"), report("bruno"))));
  await check("report needs a known reason", assertFails(setDoc(doc(bruno, "reports/pub1_bruno"), report("bruno", { reason: "boring" }))));
  await check("report on a missing quiz refused", assertFails(setDoc(doc(bruno, "reports/nope_bruno"), report("bruno", { publicId: "nope" }))));
  await check("signed-out visitor cannot report", assertFails(setDoc(doc(visitor, "reports/pub1_x"), report("x"))));
  await check("reports are private", assertFails(getDoc(doc(bruno, "reports/pub1_p7"))));
  await check("moderator reads reports", assertSucceeds(getDoc(doc(admin, "reports/pub1_p7"))));

  const like = (uid, publicId = "pub1", extra = {}) => ({ publicId, uid, createdAt: fsTs(), ...extra });
  await check("host likes a published quiz", assertSucceeds(setDoc(doc(bruno, "likes/pub1_bruno"), like("bruno"))));
  await check("cannot like twice", assertFails(setDoc(doc(bruno, "likes/pub1_bruno"), like("bruno"))));
  await check("host reads own like", assertSucceeds(getDoc(doc(bruno, "likes/pub1_bruno"))));
  await check("others' likes are private", assertFails(getDoc(doc(alice, "likes/pub1_bruno"))));
  await check("author cannot like own quiz", assertFails(setDoc(doc(alice, "likes/pub1_alice"), like("alice"))));
  await check("anonymous player cannot like", assertFails(setDoc(doc(player, "likes/pub1_p7"), like("p7"))));
  await check("like id must match the liker", assertFails(setDoc(doc(bruno, "likes/pub1_carol"), like("bruno"))));
  await check("cannot like a hidden quiz", assertFails(setDoc(doc(bruno, "likes/hid1_bruno"), like("bruno", "hid1"))));
  await check("cannot like a missing quiz", assertFails(setDoc(doc(bruno, "likes/nope_bruno"), like("bruno", "nope"))));
  await check("like rejects extra fields", assertFails(setDoc(doc(host("dina").firestore(), "likes/pub1_dina"), like("dina", "pub1", { weight: 100 }))));
  await check("only the liker can unlike", assertFails(deleteDoc(doc(alice, "likes/pub1_bruno"))));
  await check("liker unlikes", assertSucceeds(deleteDoc(doc(bruno, "likes/pub1_bruno"))));
  await check("author unpublishes", assertSucceeds(deleteDoc(doc(alice, "publicQuizzes/pub1"))));
}

console.log(`\n${pass} passed, ${fail} failed`);
await env.cleanup();
process.exit(fail ? 1 : 0);
