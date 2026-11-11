// Storage: always on the device (localStorage), and in Firestore when the user is signed in.
// Firestore runs with a persistent local cache, so writes made offline are sent when the network is back.
import { firebaseConfig, FIREBASE_SDK } from './config.js';

const LS_KEY = 'hifz-state-v1';
const CONSENT_VERSION = 1;

export const Store = {
  enabled: !!firebaseConfig.apiKey,
  fb: null,            // loaded Firebase modules + instances
  user: null,
  listeners: new Set(),
  timer: null, writing: false, pending: null,
  evMonth: null, events: [], evTimer: null,

  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },
  emit() { this.listeners.forEach(fn => { try { fn(this.user); } catch (e) { console.error(e); } }); },

  loadLocal() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch (e) { return null; }
  },
  saveLocal(state) {
    try { if (state) localStorage.setItem(LS_KEY, JSON.stringify(state)); else localStorage.removeItem(LS_KEY); } catch (e) {}
  },

  async init() {
    if (!this.enabled) return;
    const [appMod, authMod, fsMod] = await Promise.all([
      import(`${FIREBASE_SDK}/firebase-app.js`),
      import(`${FIREBASE_SDK}/firebase-auth.js`),
      import(`${FIREBASE_SDK}/firebase-firestore.js`)
    ]);
    const app = appMod.initializeApp(firebaseConfig);
    const auth = authMod.getAuth(app);
    let db;
    try {
      db = fsMod.initializeFirestore(app, { localCache: fsMod.persistentLocalCache({ tabManager: fsMod.persistentMultipleTabManager() }) });
    } catch (e) { db = fsMod.getFirestore(app); }
    this.fb = { auth, db, A: authMod, F: fsMod };
    await new Promise(resolve => {
      let first = true;
      authMod.onAuthStateChanged(auth, user => {
        this.user = user;
        if (first) { first = false; resolve(); } else this.emit();
      });
    });
  },

  // ---------- auth ----------
  async signInGoogle() {
    const { auth, A } = this.fb;
    const provider = new A.GoogleAuthProvider();
    try { await A.signInWithPopup(auth, provider); }
    catch (e) {
      if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment')) return A.signInWithRedirect(auth, provider);
      throw e;
    }
  },
  signInEmail(email, pw) { return this.fb.A.signInWithEmailAndPassword(this.fb.auth, email, pw); },
  signUpEmail(email, pw) { return this.fb.A.createUserWithEmailAndPassword(this.fb.auth, email, pw); },
  resetPassword(email) { return this.fb.A.sendPasswordResetEmail(this.fb.auth, email); },
  async signOut() { await this.fb.A.signOut(this.fb.auth); this.saveLocal(null); this.saveChildrenLocal({}); },

  // ---------- remote state ----------
  userDoc() { const { F, db } = this.fb; return F.doc(db, 'users', this.user.uid); },
  async loadRemote() {
    const { F } = this.fb;
    const snap = await F.getDoc(this.userDoc());
    return snap.exists() ? snap.data() : null;
  },
  async recordConsent() {
    const { F } = this.fb;
    await F.setDoc(this.userDoc(), { consent: { version: CONSENT_VERSION, at: F.serverTimestamp() } }, { merge: true });
  },
  hasConsent(remote) { return !!(remote && remote.consent && remote.consent.version >= CONSENT_VERSION); },

  /** Picks the newest of the local and remote states. Returns {state, source}. */
  merge(local, remote) {
    const r = remote && remote.state ? remote.state : null;
    if (local && local.owner && this.user && local.owner !== this.user.uid) local = null; // another account's copy
    if (!r) return { state: local, source: 'local' };
    if (!local) return { state: r, source: 'remote' };
    return (r.updatedAt || 0) > (local.updatedAt || 0) ? { state: r, source: 'remote' } : { state: local, source: 'local' };
  },

  save(state) {
    if (!state) return;
    state.updatedAt = Date.now();
    if (this.user) state.owner = this.user.uid;
    this.saveLocal(state);
    if (!this.user) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(state), 800);
  },
  async flush(state) {
    if (this.writing) { this.pending = state; return; }
    this.writing = true;
    try {
      const { F } = this.fb;
      await F.setDoc(this.userDoc(), { state: JSON.parse(JSON.stringify(state)), updatedAt: F.serverTimestamp() }, { merge: true });
    } catch (e) { console.warn('sync failed', e); }
    this.writing = false;
    if (this.pending) { const s = this.pending; this.pending = null; this.flush(s); }
  },

  /** Review events, grouped by month in users/{uid}/events/{YYYY-MM}. */
  async logEvent(ev) {
    if (!this.user) return;
    const { F, db } = this.fb;
    const month = new Date().toISOString().slice(0, 7);
    try {
      if (this.evMonth !== month) {
        this.evMonth = month;
        const snap = await F.getDoc(F.doc(db, 'users', this.user.uid, 'events', month));
        this.events = snap.exists() ? (snap.data().events || []).slice() : [];
      }
      this.events.push(ev);
      clearTimeout(this.evTimer);
      this.evTimer = setTimeout(() => {
        F.setDoc(F.doc(db, 'users', this.user.uid, 'events', month), { events: this.events }).catch(e => console.warn(e));
      }, 1500);
    } catch (e) { console.warn(e); }
  },

  // ---------- children profiles (users/{uid}/children/{id}) ----------
  // Fields written by the child's device: name, avatar, state, earned, requests.
  // Fields written by the parent: rewards, given, settings changes go through state as well.
  CHILD_KEY: 'sourah-children',
  loadChildrenLocal() { try { return JSON.parse(localStorage.getItem(this.CHILD_KEY) || '{}'); } catch (e) { return {}; } },
  saveChildrenLocal(map) { try { localStorage.setItem(this.CHILD_KEY, JSON.stringify(map)); } catch (e) {} },
  childTimers: {},
  /** fields: list of top-level keys to push to Firestore (others are left untouched). */
  saveChild(map, child, fields) {
    child.updatedAt = Date.now();
    map[child.id] = child; this.saveChildrenLocal(map);
    if (!this.user) return;
    const k = child.id + ':' + fields.join(',');
    clearTimeout(this.childTimers[k]);
    this.childTimers[k] = setTimeout(async () => {
      const { F, db } = this.fb, ref = F.doc(db, 'users', this.user.uid, 'children', child.id);
      const data = { updatedAt: child.updatedAt }; fields.forEach(f => { data[f] = JSON.parse(JSON.stringify(child[f] == null ? null : child[f])); });
      try { await F.updateDoc(ref, data); }
      catch (e) { try { await F.setDoc(ref, JSON.parse(JSON.stringify(child))); } catch (e2) { console.warn('child sync failed', e2); } }
    }, 600);
  },
  async deleteChild(map, id) {
    delete map[id]; this.saveChildrenLocal(map);
    if (this.user) { const { F, db } = this.fb; await F.deleteDoc(F.doc(db, 'users', this.user.uid, 'children', id)).catch(() => {}); }
  },
  /** Live updates of all children (the parent sees the child's progress made on another device). */
  watchChildren(cb) {
    if (!this.user) return () => {};
    const { F, db } = this.fb;
    return F.onSnapshot(F.collection(db, 'users', this.user.uid, 'children'), snap => {
      const rows = {}; snap.forEach(d => { rows[d.id] = Object.assign({ id: d.id }, d.data()); }); cb(rows);
    }, e => console.warn('children listener', e));
  },

  /** Deletes the user's Firestore data, then the account. Throws auth/requires-recent-login if the session is old. */
  async deleteAccount() {
    const { F, A, db } = this.fb;
    const uid = this.user.uid;
    const evs = await F.getDocs(F.collection(db, 'users', uid, 'events'));
    const batch = F.writeBatch(db);
    evs.forEach(d => batch.delete(d.ref));
    const kids = await F.getDocs(F.collection(db, 'users', uid, 'children'));
    kids.forEach(d => batch.delete(d.ref));
    batch.delete(F.doc(db, 'users', uid));
    await batch.commit();
    await A.deleteUser(this.user);
    this.saveLocal(null);
  }
};
