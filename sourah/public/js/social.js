// Buddy / teacher review: pairing by invite code, sharing recordings, annotated feedback.
// Firestore collections: invites/{code}, pairs/{learner_reviewer}, reviews/{id} (+ reviews/{id}/audio/{n}).
import { Store } from './store.js';
import { blobToChunks, chunksToBlob } from './recorder.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const INVITE_DAYS = 7;

export const Social = {
  data: { asLearner: [], asReviewer: [], mine: [], toReview: [] },
  unsubs: [], listeners: new Set(), uid: null,

  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },
  emit() { this.listeners.forEach(fn => { try { fn(this.data); } catch (e) { console.error(e); } }); },
  get F() { return Store.fb.F; }, get db() { return Store.fb.db; },

  start(uid) {
    if (this.uid === uid) return;
    this.stop(); this.uid = uid;
    if (!uid) return;
    const { F, db } = this;
    const sub = (q, key, sort) => this.unsubs.push(F.onSnapshot(q, snap => {
      const rows = []; snap.forEach(d => rows.push(Object.assign({ id: d.id }, d.data())));
      if (sort) rows.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      this.data[key] = rows; this.emit();
    }, e => console.warn('social listener', key, e)));
    sub(F.query(F.collection(db, 'pairs'), F.where('learner', '==', uid)), 'asLearner');
    sub(F.query(F.collection(db, 'pairs'), F.where('reviewer', '==', uid)), 'asReviewer');
    sub(F.query(F.collection(db, 'reviews'), F.where('learner', '==', uid)), 'mine', true);
    sub(F.query(F.collection(db, 'reviews'), F.where('reviewers', 'array-contains', uid)), 'toReview', true);
  },
  stop() { this.unsubs.forEach(u => { try { u(); } catch (e) {} }); this.unsubs = []; this.uid = null; this.data = { asLearner: [], asReviewer: [], mine: [], toReview: [] }; },

  pendingToReview() { return this.data.toReview.filter(r => r.status === 'pending'); },
  unseenFeedback() { return this.data.mine.filter(r => r.status === 'done' && !r.seen); },

  async createInvite(name) {
    const { F, db } = this;
    let code = '';
    const rnd = new Uint32Array(6); crypto.getRandomValues(rnd);
    for (const n of rnd) code += ALPHABET[n % ALPHABET.length];
    await F.setDoc(F.doc(db, 'invites', code), { owner: this.uid, ownerName: name || '', createdAt: Date.now(), expiresAt: Date.now() + INVITE_DAYS * 864e5 });
    return code;
  },
  /** The reviewer enters the learner's code. Returns the learner's name. */
  async redeemInvite(code, myName) {
    const { F, db } = this;
    code = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const inv = await F.getDoc(F.doc(db, 'invites', code));
    if (!inv.exists()) throw new Error('invite_not_found');
    const d = inv.data();
    if (d.expiresAt < Date.now()) throw new Error('invite_expired');
    if (d.owner === this.uid) throw new Error('invite_self');
    await F.setDoc(F.doc(db, 'pairs', `${d.owner}_${this.uid}`), { learner: d.owner, learnerName: d.ownerName || '', reviewer: this.uid, reviewerName: myName || '', code, createdAt: Date.now() });
    return d.ownerName || '';
  },
  unpair(pairId) { return this.F.deleteDoc(this.F.doc(this.db, 'pairs', pairId)); },

  /** Shares a local recording with every reviewer of the learner. */
  async send(rec, meta) {
    const { F, db } = this;
    const reviewers = this.data.asLearner.map(p => p.reviewer);
    if (!reviewers.length) throw new Error('no_reviewer');
    const chunks = await blobToChunks(rec.blob);
    const ref = F.doc(F.collection(db, 'reviews'));
    await F.setDoc(ref, Object.assign({ learner: this.uid, reviewers, status: 'pending', createdAt: Date.now(), mime: rec.mime, duration: rec.duration, chunks: chunks.length }, meta));
    for (let i = 0; i < chunks.length; i++) await F.setDoc(F.doc(db, 'reviews', ref.id, 'audio', String(i)), { data: chunks[i] });
    return ref.id;
  },
  async loadAudio(review) {
    const { F, db } = this;
    const parts = [];
    for (let i = 0; i < review.chunks; i++) { const s = await F.getDoc(F.doc(db, 'reviews', review.id, 'audio', String(i))); parts.push(s.exists() ? s.data().data : ''); }
    return chunksToBlob(parts, review.mime);
  },
  submitReview(id, review) {
    return this.F.updateDoc(this.F.doc(this.db, 'reviews', id), { status: 'done', review: Object.assign({ by: this.uid, at: Date.now() }, review) });
  },
  /** Reviewer's spoken comment, stored like the recitation in base64 chunks (reviews/{id}/comment/{n}). */
  async sendVoice(id, rec) {
    const { F, db } = this;
    const chunks = await blobToChunks(rec.blob);
    for (let i = 0; i < chunks.length; i++) await F.setDoc(F.doc(db, 'reviews', id, 'comment', String(i)), { data: chunks[i] });
    return { mime: rec.mime, duration: rec.duration, chunks: chunks.length };
  },
  async loadVoice(review) {
    const { F, db } = this, v = review.review && review.review.voice;
    if (!v) return null;
    const parts = [];
    for (let i = 0; i < v.chunks; i++) { const s = await F.getDoc(F.doc(db, 'reviews', review.id, 'comment', String(i))); parts.push(s.exists() ? s.data().data : ''); }
    return chunksToBlob(parts, v.mime);
  },
  markSeen(id) { return this.F.updateDoc(this.F.doc(this.db, 'reviews', id), { seen: true }); },
  async remove(review) {
    const { F, db } = this;
    const b = F.writeBatch(db);
    for (let i = 0; i < (review.chunks || 0); i++) b.delete(F.doc(db, 'reviews', review.id, 'audio', String(i)));
    const v = review.review && review.review.voice;
    for (let i = 0; i < (v ? v.chunks : 0); i++) b.delete(F.doc(db, 'reviews', review.id, 'comment', String(i)));
    b.delete(F.doc(db, 'reviews', review.id));
    await b.commit();
  },
  /** Used on account deletion. */
  async deleteAllMine() {
    const { F, db } = this;
    for (const r of this.data.mine) await this.remove(r).catch(() => {});
    for (const p of this.data.asLearner.concat(this.data.asReviewer)) await this.unpair(p.id).catch(() => {});
  }
};
