import { t, setLang, getLang, detectLang, fmtNum, locale, listSep, LANGS } from './i18n.js';
import { Store } from './store.js';
import { Player } from './audio.js';
import { RECITERS, PRIVACY_URL } from './config.js';
import { Recorder, canRecord, saveRecording, listRecordings, deleteRecording, fmtDuration, MAX_SECONDS } from './recorder.js';
import { Social } from './social.js';
import { buildQuiz } from './quiz.js';
import { pickMotivation, BADGES, earnedBadges, nextBadge } from './motivation.js';

const P = window.Planner;
const $app = document.getElementById('app');
const $nav = document.getElementById('nav');
let Q = null;            // Quran data {surahs, names:{fr,en}, pages, juz}
let S = null;            // user state
let view = 'today';
let screen = null;       // 'welcome' | 'auth' | 'consent' | null
let session = null;
let authMode = 'signup';
let authErr = '';
const today = () => P.dayNumber(new Date());

// ---------------- prefs (device only) ----------------
const PREFS_KEY = 'hifz-prefs';
const prefs = (() => { try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'); } catch (e) { return {}; } })();
function savePrefs() { try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (e) {} }

// ---------------- helpers ----------------
const h = (tag, attrs, ...kids) => {
  const el = document.createElement(tag);
  for (const k in (attrs || {})) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) el.append(k.nodeType ? k : document.createTextNode(k));
  return el;
};
const arNum = n => Number(n).toLocaleString('ar-EG');
function toast(msg) { const el = document.getElementById('toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove('show'), 2600); }
function fmtDate(day, opts) { return new Date(day * 864e5).toLocaleDateString(locale(), Object.assign({ weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }, opts || {})); }
function surahsOnPage(p) { const out = []; for (const [s] of Q.pages[p - 1]) if (!out.includes(s)) out.push(s); return out; }
function surahLabel(s) {
  const l = getLang();
  if (l === 'ar') return Q.surahs[s - 1][1];
  const n = Q.names && Q.names[l] && Q.names[l][s];
  return n ? n[0] : Q.surahs[s - 1][2];
}
function pageTitle(p) { return `${t('page_n', { p: fmtNum(p) })} · ${surahsOnPage(p).map(surahLabel).join(listSep())}`; }
const isWord = w => /[ء-يٱ]/.test(w);
const MARKS = /[ً-ٰٟۖ-ࣰۭ-ࣲـ]/;
function splitFirst(w) {
  let i = 0; while (i < w.length && !/[ء-يٱ]/.test(w[i])) i++;
  let j = i + 1; while (j < w.length && MARKS.test(w[j])) j++;
  return [w.slice(0, j), w.slice(j)];
}
function firstLetter(w) {
  const m = w.match(/[ء-يٱ]/); if (!m) return '';
  return ({ 'ٱ': 'ا', 'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ؤ': 'و', 'ئ': 'ي', 'ى': 'ي', 'ة': 'ه' })[m[0]] || m[0];
}
function passageWords(ayahs) { let n = 0; for (const [, , x] of ayahs) for (const w of x.split(' ')) if (isWord(w)) n++; return n; }
function splitParts(ayahs, parts) {
  if (parts <= 1) return [ayahs];
  const words = ayahs.map(a => a[2].split(' ').filter(isWord).length);
  const total = words.reduce((x, y) => x + y, 0), out = []; let cur = [], acc = 0, k = 1;
  ayahs.forEach((a, i) => {
    cur.push(a); acc += words[i];
    const remA = ayahs.length - i - 1, remP = parts - k;
    if (k < parts && (acc >= total * k / parts || remA === remP) && remA >= remP) { out.push(cur); cur = []; k++; }
  });
  if (cur.length) out.push(cur);
  return out;
}
function chipGroup(options, get, set) {
  return h('div', { class: 'chips' }, options.map(([v, label]) => h('button', { class: 'chip' + (get() === v ? ' on' : ''), onclick: () => { set(v); render(); } }, label)));
}
const minuteOptions = () => [[10, t('min', { n: fmtNum(10) })], [15, t('min', { n: fmtNum(15) })], [20, t('min', { n: fmtNum(20) })], [30, t('min', { n: fmtNum(30) })], [45, t('min', { n: fmtNum(45) })], [60, t('hour')]];
const paceOptions = () => [[0.25, t('pace_q')], [0.5, t('pace_h')], [1, t('pace_1')]];
const dirOptions = () => [['nas', t('dir_nas')], ['fatiha', t('dir_fatiha')]];

// ---------------- state ----------------
function newState(settings) { return { v: 2, settings, pages: {}, durations: { sabqi: [], manzil: [], sabaq: [] }, days: [], createdAt: today() }; }
function normalize(st) {
  if (!st) return st;
  st.durations = st.durations || { sabqi: [], manzil: [], sabaq: [] };
  st.days = st.days || []; st.pages = st.pages || {};
  st.settings = Object.assign({ theme: prefs.theme || 'auto', name: '', minutes: 20, pace: 0.5, direction: 'nas', hide: 'first', mode: 'oral', reciter: RECITERS[0][0], repeat: 1, rate: 1 }, st.settings || {});
  return st;
}
function save() { if (kidId && children[kidId]) { children[kidId].state = S; saveKid(['state', 'earned']); } else Store.save(S); }
function recordDuration(kind, secs) { const a = S.durations[kind] || (S.durations[kind] = []); a.push(Math.min(Math.max(secs, 20), 3600)); if (a.length > 30) a.shift(); }
function markActive() { const d = today(); if (!S.days.includes(d)) { S.days.push(d); if (S.days.length > 400) S.days.shift(); } }

// ---------------- audio ----------------
const player = new Player(st => {
  if (st.error) toast(t('audio_error'));
  playingIdx = st.idx == null ? null : st.idx;
  document.querySelectorAll('.aya.playing').forEach(e => e.classList.remove('playing'));
  if (playingIdx != null) { const el = document.querySelector(`.aya[data-ai="${playingIdx}"]`); if (el) el.classList.add('playing'); }
  const btn = document.querySelector('.pbtn'); if (btn) btn.innerHTML = player.playing ? ICON.pause : ICON.play;
});
let playingIdx = null, playerKey = null;
const ICON = {
  play: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>',
  pause: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4.5" width="4" height="15" rx="1"/><rect x="14" y="4.5" width="4" height="15" rx="1"/></svg>'
};
function playerBar(ayahs, key) {
  const st = S.settings;
  const opts = () => ({ reciter: st.reciter, repeat: st.repeat, rate: st.rate });
  if (playerKey !== key) { player.load(ayahs, opts()); playerKey = key; }
  const reload = () => { const was = player.playing; player.load(ayahs, opts()); if (was) player.play(); };
  const btn = h('button', { class: 'pbtn', 'aria-label': t('play'), onclick: () => player.toggle() });
  btn.innerHTML = player.playing ? ICON.pause : ICON.play;
  return h('div', { class: 'player' }, btn,
    h('span', { class: 'lbl' }, t('repeat')),
    [[1, '1×'], [3, '3×'], [5, '5×'], [0, '∞']].map(([v, l]) => h('button', { class: 'opt' + (st.repeat === v ? ' on' : ''), onclick: () => { st.repeat = v; save(); reload(); render(); } }, l)),
    h('span', { class: 'lbl' }, t('speed')),
    [[0.75, '0.75'], [1, '1'], [1.25, '1.25']].map(([v, l]) => h('button', { class: 'opt' + (st.rate === v ? ' on' : ''), onclick: () => { st.rate = v; save(); player.setRate(v); render(); } }, l)));
}
function stopAudio() { player.stop(); playerKey = null; }

// ---------------- passage rendering ----------------
function renderPassage(ayahs, o) {
  o = o || {};
  const box = h('div', { class: 'mushaf' + (o.big ? ' big' : ''), dir: 'rtl', lang: 'ar' });
  let idx = 0;
  ayahs.forEach(([s, a, text], ai) => {
    if (a === 1 && o.showHeaders !== false) {
      box.append(h('span', { class: 'sura-head' }, 'سُورَةُ ' + Q.surahs[s - 1][1]));
      if (s !== 1 && s !== 9) box.append(h('span', { class: 'basmala' }, 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ'));
    }
    const revealed = o.revealedUpTo == null || ai < o.revealedUpTo;
    const cls = ['aya'];
    if (o.revealedUpTo != null && ai === o.revealedUpTo - 1) cls.push('new');
    if (o.forgot && o.forgot.has(ai)) cls.push('forgot');
    if (o.dimAyahs && o.dimAyahs.has(ai)) cls.push('dim');
    if (o.playable && playingIdx === ai) cls.push('playing');
    const ay = h('span', { class: cls.join(' '), 'data-ai': o.playable ? ai : null });
    let wi = 0;
    text.split(' ').forEach(w => {
      if (!isWord(w)) { ay.append(h('span', { class: 'deco' }, w), ' '); return; }
      const i = idx++, wInAyah = wi++;
      let hide = revealed ? 'visible' : (o.hide || 'hidden');
      if (o.ok && o.ok.has(i)) hide = 'visible';
      if (o.errors && o.errors.has(i) && o.mode === 'letter') hide = 'visible';
      const c = ['w'];
      if (o.errors && o.errors.has(i)) c.push('err'); else if (o.ok && o.ok.has(i)) c.push('ok');
      if (o.cur === i) c.push('cur');
      if (o.diff && o.diff.has(i)) c.push('df');
      if (o.onWord && revealed) c.push('tap');
      let el;
      if (hide === 'visible') el = h('span', { class: c.join(' ') }, w);
      else if (hide === 'first') { const [f, r] = splitFirst(w); c.push('veil'); el = h('span', { class: c.join(' ') }, h('span', { class: 'fl' }, f + (r ? '‍' : '')), (r ? '‍' : '') + r); }
      else { c.push('veil'); el = h('span', { class: c.join(' ') }, w); }
      if (o.onWord && revealed) {
        if (o.onMeaning) longPress(el, () => o.onMeaning(s, a, wInAyah));
        el.addEventListener('click', () => { if (el._lp) { el._lp = false; return; } o.onWord(i, ai); });
      } else if (o.onMeaning && revealed) { c.push('tap'); el.classList.add('tap'); el.addEventListener('click', () => o.onMeaning(s, a, wInAyah)); }
      ay.append(el, ' ');
    });
    const end = h('span', { class: 'aya-end' }, arNum(a));
    if (o.onAyahEnd) { end.style.cursor = 'pointer'; end.addEventListener('click', () => o.onAyahEnd(ai)); if (o.onMeaning) longPress(end, () => o.onMeaning(s, a, null)); }
    else if (o.onMeaning) { end.style.cursor = 'pointer'; end.addEventListener('click', () => o.onMeaning(s, a, null)); }
    ay.append(end, ' ');
    box.append(ay);
  });
  return box;
}

// ---------------- render ----------------
function render() {
  applyTheme();
  const showNav = !!S && !session && !screen;
  $nav.hidden = !showNav;
  document.documentElement.dataset.kid = kidId ? '1' : '';
  document.querySelectorAll('.nav button').forEach(b => { b.classList.toggle('on', b.dataset.go === view); b.querySelector('span').textContent = t(b.dataset.go); b.hidden = kidId ? !['today', 'stars'].includes(b.dataset.go) : b.dataset.go === 'stars'; });
  updateBadge();
  document.title = t('app_name');
  $app.innerHTML = '';
  if (screen === 'welcome') return $app.append(viewWelcome());
  if (screen === 'auth') return $app.append(viewAuth());
  if (screen === 'consent') return $app.append(viewConsent());
  if (screen === 'review' && reviewState) return $app.append(viewReview());
  if (screen === 'quiz' && quizState) return $app.append(viewQuiz());
  if (!S) return $app.append(viewOnboarding());
  if (session) {
    $app.append(viewSession());
    const target = session.scrollTo === 'cur' ? $app.querySelector('.w.cur') : session.scrollTo ? $app.querySelector('.aya.new') : null;
    if (target) target.scrollIntoView({ block: 'start', behavior: 'smooth' });
    session.scrollTo = null;
    return;
  }
  if (kidId && !['today', 'stars'].includes(view)) view = 'today';
  const v = kidId ? (view === 'stars' ? viewKidStars() : viewKidToday()) : view === 'planning' ? viewPlanning() : view === 'map' ? viewMap() : view === 'settings' ? viewSettings() : view === 'buddy' ? viewBuddy() : viewToday();
  v.classList.add('fade-in');
  $app.append(v);
}
function applyTheme() {
  const pref = (S && S.settings.theme) || prefs.theme || 'auto';
  const dark = pref === 'dark' || (pref === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const meta = document.querySelector('meta[name=theme-color]'); if (meta) meta.content = dark ? '#0A1C19' : '#0F4C45';
}
if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => render());

// ---------- shared visuals ----------
const SVG = {
  star: (size, fill, stroke) => `<svg width="${size}" height="${size}" viewBox="0 0 48 48"><g fill="${fill}" stroke="${stroke || 'none'}" stroke-width="1.5" stroke-linejoin="round"><rect x="12" y="12" width="24" height="24" rx="2"/><rect x="12" y="12" width="24" height="24" rx="2" transform="rotate(45 24 24)"/></g></svg>`,
  check: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  close: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  flame: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1 3.5 5 5.6 5 10.2A5 5 0 0 1 12 17a5 5 0 0 1-5-4.8c0-2 1-3.4 2.2-4.4.1 1.6.9 2.7 2 3.2C11 8 11.5 4.6 12 2zm0 20a7 7 0 0 1-7-7c0-.6.1-1.2.2-1.8A7 7 0 0 0 12 19a7 7 0 0 0 6.8-5.8c.1.6.2 1.2.2 1.8a7 7 0 0 1-7 7z"/></svg>',
  calendar: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>',
  repeat: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>',
  mic: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5"/></svg>',
  book: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 5c3-1.5 7-1.5 10 1 3-2.5 7-2.5 10-1v14c-3-1.5-7-1.5-10 1-3-2.5-7-2.5-10-1z"/><path d="M12 6v14"/></svg>',
  people: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M16.5 14.6c2.6.2 4.4 1.9 5 4.9"/></svg>',
  target: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>'
};
function ring(pct, size, stroke, color, track, inner) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c * (1 - Math.max(0, Math.min(1, pct)));
  const el = h('div', { class: 'ring', style: `width:${size}px;height:${size}px` });
  el.innerHTML = `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${track}" stroke-width="${stroke}"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}" style="transition:stroke-dashoffset .8s ease"/></svg>`;
  el.append(h('div', { class: 'in' }, inner));
  return el;
}
const html = s => { const d = h('span'); d.innerHTML = s; return d.firstChild; };

document.querySelectorAll('.nav button').forEach(b => b.addEventListener('click', () => { stopAudio(); view = b.dataset.go; render(); window.scrollTo(0, 0); }));

// ---------------- welcome / auth / consent ----------------
function langSwitch() {
  return h('div', { class: 'lang-switch' }, Object.entries(LANGS).map(([k, l]) =>
    h('button', { class: 'chip' + (getLang() === k ? ' on' : ''), onclick: () => { prefs.lang = k; savePrefs(); setLang(k); render(); } }, l)));
}
function viewWelcome() {
  return h('div', { class: 'welcome' },
    h('div', { class: 'lang-switch' }, Object.entries(LANGS).map(([k, l]) =>
      h('button', { class: 'chip' + (getLang() === k ? ' on' : ''), onclick: () => { prefs.lang = k; savePrefs(); setLang(k); render(); } }, l))),
    h('img', { class: 'logo', src: 'icons/icon-512.png', alt: '' }),
    h('div', { class: 'brand' }, 'سُورَة'),
    h('div', { class: 'name' }, 'SOURAH'),
    h('div', { class: 'tag' }, t('tagline')),
    h('ul', { class: 'feats' },
      h('li', null, h('span', { class: 'fi' }, html(SVG.calendar)), t('feat_1')),
      h('li', null, h('span', { class: 'fi' }, html(SVG.repeat)), t('feat_2')),
      h('li', null, h('span', { class: 'fi' }, html(SVG.mic)), t('feat_3'))),
    h('div', { class: 'spacer' }),
    h('button', { class: 'btn gold block', onclick: () => { screen = 'auth'; authMode = 'signup'; authErr = ''; render(); } }, t('with_account')),
    h('button', { class: 'btn ghostlight block', style: 'margin-top:10px', onclick: () => { prefs.skipWelcome = true; savePrefs(); screen = null; render(); } }, t('without_account')),
    h('div', { class: 'note' }, t('without_account_hint')));
}

function viewAuth() {
  let email, pw, consentBox;
  const consentOk = () => { if (!consentBox.checked) { authErr = t('consent_needed'); render(); return false; } sessionStorage.setItem('hifz-consent', '1'); return true; };
  const run = async fn => { try { authErr = ''; await fn(); } catch (e) { authErr = t('auth_error', { msg: (e && e.code ? e.code.replace('auth/', '') : String(e)) }); render(); } };
  return h('div', { style: 'padding-top:calc(14px + env(safe-area-inset-top))' },
    h('button', { class: 'btn ghost', style: 'padding-inline:0', onclick: () => { screen = S ? null : 'welcome'; render(); } }, (getLang() === 'ar' ? '→ ' : '← ') + t('back')),
    h('h1', null, t('sign_in_title')), h('p', { class: 'sub' }, t('sign_in_sub')),
    h('label', { class: 'check' }, consentBox = h('input', { type: 'checkbox', checked: sessionStorage.getItem('hifz-consent') === '1', onchange: e => { if (e.target.checked) sessionStorage.setItem('hifz-consent', '1'); else sessionStorage.removeItem('hifz-consent'); } }),
      h('span', null, t('consent'), ' ', h('a', { class: 'link', href: PRIVACY_URL, target: '_blank' }, t('privacy_link')))),
    h('button', { class: 'btn block', style: 'margin-top:4px', onclick: () => consentOk() && run(() => Store.signInGoogle()) }, t('google')),
    h('div', { class: 'divider' }, t('email')),
    email = h('input', { type: 'email', placeholder: t('email'), autocomplete: 'email' }),
    pw = h('input', { type: 'password', placeholder: t('password'), autocomplete: authMode === 'signup' ? 'new-password' : 'current-password' }),
    authErr ? h('div', { class: 'err-msg' }, authErr) : null,
    h('button', { class: 'btn primary block', onclick: () => consentOk() && run(() => authMode === 'signup' ? Store.signUpEmail(email.value.trim(), pw.value) : Store.signInEmail(email.value.trim(), pw.value)) },
      authMode === 'signup' ? t('sign_up') : t('sign_in')),
    h('div', { class: 'row spread', style: 'margin-top:10px' },
      h('button', { class: 'btn ghost', onclick: () => { authMode = authMode === 'signup' ? 'signin' : 'signup'; authErr = ''; render(); } }, authMode === 'signup' ? t('have_account') : t('no_account')),
      authMode === 'signin' ? h('button', { class: 'btn ghost', onclick: () => run(async () => { await Store.resetPassword(email.value.trim()); toast(t('reset_sent')); }) }, t('forgot_password')) : null));
}
function viewConsent() {
  let box;
  return h('div', { style: 'padding-top:calc(40px + env(safe-area-inset-top))' },
    h('h1', null, t('sign_in_title')),
    h('label', { class: 'check' }, box = h('input', { type: 'checkbox' }), h('span', null, t('consent'), ' ', h('a', { class: 'link', href: PRIVACY_URL, target: '_blank' }, t('privacy_link')))),
    h('div', { class: 'actions' },
      h('button', { class: 'btn', onclick: async () => { await Store.signOut(); screen = 'welcome'; render(); } }, t('sign_out')),
      h('button', { class: 'btn primary', onclick: async () => { if (!box.checked) return toast(t('consent_needed')); sessionStorage.setItem('hifz-consent', '1'); await afterSignIn(); } }, t('continue'))));
}
async function afterSignIn() {
  try {
    const remote = await Store.loadRemote();
    if (!Store.hasConsent(remote)) {
      if (sessionStorage.getItem('hifz-consent') !== '1') { screen = 'consent'; return render(); }
      await Store.recordConsent();
    }
    const { state, source } = Store.merge(normalize(Store.loadLocal()), remote);
    S = normalize(state);
    if (S) { if (source === 'remote') { Store.saveLocal(S); toast(t('merged_remote')); } else save(); }
    screen = null; view = 'today'; prefs.skipWelcome = true; savePrefs();
    Social.start(Store.user.uid);
    startWatchingChildren();
    resumeKid();
  } catch (e) { console.warn(e); toast(t('sync_error')); screen = null; }
  render();
}

// ---------------- onboarding ----------------
const draft = { step: 0, name: '', minutes: 20, pace: 0.5, direction: 'nas', known: new Set() };
function option(on, icon, title, desc, onclick) {
  return h('button', { class: 'option' + (on ? ' on' : ''), onclick }, h('span', { class: 'oi' }, icon), h('div', null, h('b', null, title), desc ? h('span', null, desc) : null), h('span', { class: 'rad' }));
}
function viewOnboarding() {
  const N = 4, k = draft.step;
  const go = d => { draft.step = Math.max(0, Math.min(N - 1, k + d)); render(); window.scrollTo(0, 0); };
  let body;
  if (k === 0) {
    let input;
    body = h('div', null, h('h1', null, t('onb_title')), h('p', { class: 'sub' }, t('onb_sub')),
      h('div', { style: 'margin-top:22px' }, h('label', { style: 'font-weight:700' }, t('name_label')),
        input = h('input', { type: 'text', placeholder: t('name_ph'), value: draft.name, autocomplete: 'given-name', oninput: e => { draft.name = e.target.value; } })),
      h('div', { style: 'margin-top:14px' }, h('label', { style: 'font-weight:700;display:block;margin-bottom:8px' }, t('language')), langSwitch()));
  } else if (k === 1) {
    body = h('div', null, h('h1', null, t('minutes_label')),
      h('div', { class: 'option-list' }, [10, 15, 20, 30, 45, 60].map((v, i) =>
        option(draft.minutes === v, fmtNum(v), t('lvl').split('|')[i], t('per_day', { n: fmtNum(v) }) + (v === 20 ? ' · ' + t('recommended') : ''), () => { draft.minutes = v; render(); }))));
  } else if (k === 2) {
    body = h('div', null, h('h1', null, t('pace_label')), h('p', { class: 'sub' }, t('pace_hint')),
      h('div', { class: 'option-list' },
        option(draft.pace === 0.25, '¼', t('pace_q'), null, () => { draft.pace = 0.25; render(); }),
        option(draft.pace === 0.5, '½', t('pace_h'), null, () => { draft.pace = 0.5; render(); }),
        option(draft.pace === 1, fmtNum(1), t('pace_1'), null, () => { draft.pace = 1; render(); })),
      h('h2', null, t('direction_label')),
      h('div', { class: 'option-list', style: 'margin-top:0' },
        option(draft.direction === 'nas', fmtNum(30), t('dir_nas'), null, () => { draft.direction = 'nas'; render(); }),
        option(draft.direction === 'fatiha', fmtNum(1), t('dir_fatiha'), null, () => { draft.direction = 'fatiha'; render(); })));
  } else {
    body = h('div', null, h('h1', null, t('known_label')), h('p', { class: 'sub' }, t('known_hint')),
      h('div', { class: 'juz-pick', style: 'margin-top:18px' }, Array.from({ length: 30 }, (_, i) => i + 1).map(j =>
        h('button', { class: draft.known.has(j) ? 'on' : '', onclick: () => { draft.known.has(j) ? draft.known.delete(j) : draft.known.add(j); render(); } }, fmtNum(j)))));
  }
  return h('div', { class: 'onb' },
    h('div', { class: 'onb-top' },
      k > 0 ? h('button', { class: 'icon-btn', 'aria-label': t('back'), onclick: () => go(-1) }, getLang() === 'ar' ? '→' : '←') : h('span', { style: 'width:40px' }),
      h('div', { class: 'segs' }, Array.from({ length: N }, (_, i) => h('i', { class: i < k ? 'done' : i === k ? 'cur' : '' }))),
      h('span', { class: 'sub', style: 'font-size:12px;white-space:nowrap' }, t('step_x', { k: fmtNum(k + 1), n: fmtNum(N) }))),
    h('div', null, body),
    h('div', { class: 'sticky' }, h('button', { class: 'btn primary block', onclick: () => k < N - 1 ? go(1) : finishOnboarding() }, k < N - 1 ? t('next') : t('create_plan'))));
}
function finishOnboarding() {
  S = normalize(newState({ minutes: draft.minutes, pace: draft.pace, direction: draft.direction, name: draft.name.trim() }));
  const known = []; for (let p = 1; p <= 604; p++) if (draft.known.has(Q.juz[p - 1])) known.push(p);
  Object.assign(S.pages, P.seedKnownPages(known, today(), 14));
  save(); view = 'today'; render();
}

// ---------------- today ----------------
function verseOfDay(d) {
  const mem = Object.keys(S.pages).filter(k => S.pages[k].status !== 'sabaq').map(Number).sort((a, b) => a - b);
  const pool = mem.length ? mem : [S.settings.direction === 'fatiha' ? 1 : 604];
  const page = pool[d % pool.length];
  const ayahs = Q.pages[page - 1].filter(a => a[2].split(' ').filter(isWord).length <= 22);
  const list = ayahs.length ? ayahs : Q.pages[page - 1];
  return list[(d * 7) % list.length];
}
function greeting() { const hr = new Date().getHours(); return hr < 12 ? t('greet_morning') : hr < 18 ? t('greet_afternoon') : t('greet_evening'); }
function viewToday() {
  const d = today();
  const plan = P.buildSession(S, d);
  const pagesState = Object.values(S.pages);
  const doneRev = pagesState.filter(ps => ps.last === d && ps.status !== 'sabaq' && (ps.reviews || 0) > 0 && !(ps.memorized === d && !ps.seeded)).length;
  const sabaqDone = pagesState.some(ps => ps.lastSabaq === d || (ps.memorized === d && !ps.seeded));
  const memorized = pagesState.filter(ps => ps.status !== 'sabaq').length;
  const Rs = pagesState.map(ps => P.pageR(ps, d)).filter(r => r != null);
  const avgR = Rs.length ? Math.round(100 * Rs.reduce((a, b) => a + b, 0) / Rs.length) : null;
  const streak = P.streak(S.days, d);
  const todo = plan.sabqi.length + plan.manzil.length + (plan.sabaq ? 1 : 0);
  const total = todo + doneRev + (sabaqDone ? 1 : 0);
  const nothing = todo === 0;
  const name = S.settings.name;

  const hero = h('div', { class: 'hero' },
    h('div', { class: 'row spread' },
      h('div', { class: 'salam' }, 'ٱلسَّلَامُ عَلَيۡكُمۡ'),
      h('div', { class: 'streak', title: t('day_streak') }, html(SVG.flame), fmtNum(streak))),
    h('p', { class: 'hello' }, greeting() + (name ? (getLang() === 'ar' ? '، ' : ', ') + name : '')),
    h('div', { class: 'date' }, new Date().toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' })),
    h('div', { class: 'hero-body' },
      ring(total ? (total - todo) / total : 1, 112, 10, 'var(--gold-2)', 'rgba(255,252,245,.15)',
        h('div', null, h('b', null, fmtNum(total - todo) + '/' + fmtNum(total)), h('span', null, t.n('pages', total).replace(/^[\d٠-٩\s,.]+/, '')))),
      h('div', { class: 'hero-side' },
        nothing ? [h('div', { class: 'big' }, t('journey_done')), h('div', { class: 'small' }, t('rest_well'))]
          : [h('div', { class: 'big' }, t('today_journey')), h('div', { class: 'small' }, t('min_left', { n: fmtNum(plan.minutes.total) })),
             h('button', { class: 'btn gold', onclick: () => startSession(plan) }, t('start_session'))])));

  const wrap = h('div', null, hero);
  if (plan.consolidation) wrap.append(h('div', { class: 'banner' }, t(plan.consolidation === 'overload' ? 'overload' : 'fragile')));

  const step = (kind, label, title, desc, mins, done, off) => h('div', { class: `step ${kind}` + (done ? ' done' : '') + (off ? ' off' : '') },
    h('div', { class: 'dot' }, done ? html(SVG.check) : label), h('div', { class: 'txt' }, h('b', null, title), h('span', null, desc)), h('div', { class: 'min' }, mins));
  const sabaqDesc = plan.sabaq
    ? (plan.sabaq.parts > 1 ? t('page_part', { p: fmtNum(plan.sabaq.page), k: fmtNum(plan.sabaq.part + 1), n: fmtNum(plan.sabaq.parts) }) : t('page_n', { p: fmtNum(plan.sabaq.page) })) + ' · ' + surahsOnPage(plan.sabaq.page).map(surahLabel).join(listSep())
    : sabaqDone ? t('done_today') : plan.consolidation ? t('paused') : t('all_done');
  wrap.append(h('h2', null, t('today_journey')), h('div', { class: 'card journey' },
    step('sabqi', fmtNum(1), t('sabqi_title'), plan.sabqi.length ? t.n('sabqi_desc', plan.sabqi.length) : t('nothing_review'), plan.sabqi.length ? t('min_left', { n: fmtNum(plan.minutes.sabqi) }) : '', !plan.sabqi.length && doneRev > 0, !plan.sabqi.length && !doneRev),
    step('manzil', fmtNum(2), t('manzil_title'), plan.manzil.length ? t.n('pages', plan.manzil.length) + (plan.backlog ? listSep() + t('waiting', { n: fmtNum(plan.backlog) }) : '') : t('nothing_due'), plan.manzil.length ? t('min_left', { n: fmtNum(plan.minutes.manzil) }) : '', !plan.manzil.length && doneRev > 0, !plan.manzil.length && !doneRev),
    step('sabaq', fmtNum(3), t('sabaq_title'), sabaqDesc, plan.sabaq ? t('min_left', { n: fmtNum(plan.minutes.sabaq) }) : '', sabaqDone, !plan.sabaq && !sabaqDone)));
  if (nothing) {
    const ahead = nextManzil(d, 5);
    if (ahead.length) wrap.append(h('button', { class: 'btn block', onclick: () => startSession({ sabqi: [], manzil: ahead, sabaq: null }) }, t('ahead')));
  }

  const fam = familySection(); if (fam) wrap.append(fam);
  const qc = quizCard(d); if (qc) wrap.append(qc);
  wrap.append(motivationCard(pickMotivation('start', d)));

  const [vs, va, vt] = verseOfDay(d);
  wrap.append(h('div', { class: 'verse', style: 'cursor:pointer', onclick: () => openMeaning(vs, va, null) }, h('div', { class: 'lbl' }, t('verse_of_day')),
    h('div', { class: 'ar' }, vt + ' ', h('span', { class: 'aya-end' }, arNum(va))),
    h('div', { class: 'ref' }, `${surahLabel(vs)} · ${fmtNum(vs)}:${fmtNum(va)} · `, h('span', { class: 'link' }, t('see_tafsir')))));

  const days = new Set(S.days);
  wrap.append(h('h2', null, t('week_activity')), h('div', { class: 'card' }, h('div', { class: 'week' },
    Array.from({ length: 7 }, (_, i) => d - 6 + i).map(x => h('div', { class: 'd' },
      h('div', { class: 'c' + (days.has(x) ? ' on' : '') + (x === d ? ' now' : '') }, days.has(x) ? html(SVG.check) : new Date(x * 864e5).getUTCDate().toLocaleString(locale())),
      new Date(x * 864e5).toLocaleDateString(locale(), { weekday: 'short', timeZone: 'UTC' }).replace('.', ''))))));

  wrap.append(h('h2', null, t('progress')), h('div', { class: 'card khatm' },
    h('div', { class: 'row spread' }, h('b', null, t('khatm_progress')), h('span', { class: 'sub' }, `${fmtNum(memorized)} / ${fmtNum(604)}`)),
    h('div', { class: 'bar' }, h('i', { style: `width:${Math.max(1.5, 100 * memorized / 604)}%` })),
    h('div', { class: 'kpis' },
      h('div', { class: 'kpi' }, h('b', null, fmtNum(completeJuz())), h('span', null, t('juz_done'))),
      h('div', { class: 'kpi' }, h('b', null, avgR == null ? '–' : fmtNum(avgR) + '%'), h('span', null, t('avg_strength'))),
      h('div', { class: 'kpi' }, h('b', null, fmtNum(streak)), h('span', null, t('day_streak')))),
    (() => { const nb = nextBadge(progressStats()); return nb ? h('div', { class: 'next-badge' }, h('span', null, nb.icon), t('next_badge', { name: t('badge_' + nb.id) })) : null; })()));
  wrap.append(storageNote());
  return wrap;
}

function nextManzil(d, n) {
  return Object.entries(S.pages).filter(([, ps]) => ps.status === 'manzil' && ps.last !== d)
    .map(([k, ps]) => ({ id: +k, R: P.pageR(ps, d) })).sort((a, b) => a.R - b.R).slice(0, n).map(x => x.id);
}
function completeJuz() {
  let c = 0;
  for (let j = 1; j <= 30; j++) { let all = true; for (let p = 1; p <= 604; p++) if (Q.juz[p - 1] === j && (!S.pages[p] || S.pages[p].status === 'sabaq')) { all = false; break; } if (all) c++; }
  return c;
}
function storageNote() {
  let msg;
  if (Store.user) msg = t('saved_account', { email: Store.user.email || '' });
  else if (Store.enabled) msg = t('saved_local');
  else msg = t('saved_local');
  return h('div', { class: 'storage' }, msg, !navigator.onLine && Store.user ? h('div', null, t('offline')) : null);
}

// ---------------- planning ----------------
function viewPlanning() {
  const d = today();
  const f30 = P.forecast(S, d, 30, Q.juz);
  const long = P.forecast(S, d, 1825, Q.juz);
  const W = 340, H = 150, padB = 18, padT = 10, bw = W / 30;
  const maxM = Math.max(S.settings.minutes * 1.2, ...f30.days.map(x => x.minutes.total), 5);
  const y = m => (H - padB) - (m / maxM) * (H - padB - padT);
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('class', 'chart'); svg.setAttribute('role', 'img');
  const mk = (tag, attrs) => { const e = document.createElementNS(svgNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); svg.append(e); return e; };
  const colors = { sabqi: 'var(--sabqi)', manzil: 'var(--manzil)', sabaq: 'var(--sabaq)' };
  const rtl = getLang() === 'ar';
  f30.days.forEach((x, i) => {
    const xi = rtl ? W - (i + 1) * bw : i * bw;
    let base = H - padB;
    [['sabqi', x.minutes.sabqi], ['manzil', x.minutes.manzil], ['sabaq', x.minutes.sabaq]].forEach(([k, m]) => {
      if (!m) return;
      const hgt = (m / maxM) * (H - padB - padT);
      mk('rect', { x: xi + 1, y: base - hgt, width: bw - 2, height: hgt, rx: 1.5, fill: colors[k] });
      base -= hgt;
    });
    if (i % 7 === 0) { const tx = mk('text', { x: Math.min(Math.max(xi + bw / 2, 24), W - 24), y: H - 4, 'text-anchor': 'middle', 'font-size': 9, fill: 'var(--muted)' }); tx.textContent = new Date(x.day * 864e5).toLocaleDateString(locale(), { day: 'numeric', month: 'short', timeZone: 'UTC' }); }
  });
  const by = y(S.settings.minutes);
  mk('line', { x1: 0, x2: W, y1: by, y2: by, stroke: 'var(--muted)', 'stroke-dasharray': '3 3', 'stroke-width': 1 });
  const bl = mk('text', { x: rtl ? 2 : W - 2, y: by - 3, 'text-anchor': rtl ? 'start' : 'end', 'font-size': 9, fill: 'var(--muted)' }); bl.textContent = t('min', { n: fmtNum(S.settings.minutes) });

  const legend = h('div', { class: 'legend', style: 'margin:6px 0 0' },
    ['sabqi', 'manzil', 'sabaq'].map(k => h('span', null, h('i', { style: `background:${colors[k]}` }), t('legend_' + k))));

  const list = h('div', { class: 'daylist' }, f30.days.slice(0, 7).map((x, i) => h('div', { class: 'day' },
    h('div', { class: 'dname' }, i === 0 ? t('today') : fmtDate(x.day)),
    h('div', { class: 'dbar' },
      x.sabqi ? h('span', { class: 'tag sabqi' }, `${t('legend_sabqi')} ${fmtNum(x.sabqi)}`) : null,
      x.manzil ? h('span', { class: 'tag manzil' }, `${t('legend_manzil')} ${fmtNum(x.manzil)}`) : null,
      x.sabaq ? h('span', { class: 'tag sabaq' }, `${t('new_short')} ${t('page_short', { p: fmtNum(x.sabaq.page) })}`) : h('span', null, t('no_new'))),
    h('div', { class: 'dmin' }, t('min', { n: fmtNum(x.minutes.total) })))));

  const goals = h('div', { class: 'card' },
    long.milestones.slice(0, 3).map(m => h('div', { class: 'goal' }, '🎯', h('span', null, t('juz_by', { j: fmtNum(m.juz), d: fmtDate(m.day, { weekday: undefined, year: 'numeric' }) })))),
    h('div', { class: 'goal' }, '📖', h('span', null, long.doneDay != null ? t('khatm_by', { d: fmtDate(long.doneDay, { weekday: undefined, day: undefined, month: 'long', year: 'numeric' }) }) : t('khatm_far'))));

  return h('div', null, h('div', { class: 'page-head' }, h('h1', null, t('planning')), h('p', { class: 'sub' }, t('planning_sub'))),
    h('h2', null, t('next_30')), h('div', { class: 'card' }, svg, legend),
    h('h2', null, t('next_7')), list,
    h('h2', null, t('milestones')), goals);
}

// ---------------- session ----------------
function startSession(plan) {
  const items = [];
  plan.sabqi.forEach(p => items.push({ kind: 'sabqi', page: p }));
  plan.manzil.forEach(p => items.push({ kind: 'manzil', page: p }));
  if (plan.sabaq) items.push({ kind: 'sabaq', page: plan.sabaq.page, part: plan.sabaq.part, parts: plan.sabaq.parts });
  session = { items, i: 0, results: [] };
  beginItem(); render(); window.scrollTo(0, 0);
}
const curItem = () => session.items[session.i];
function itemAyahs(it) { const all = Q.pages[it.page - 1]; return it.kind !== 'sabaq' ? all : (splitParts(all, it.parts)[it.part] || all); }
function beginItem() { const it = curItem(); if (!it) return; stopAudio(); session.step = it.kind === 'sabaq' ? 'learn' : 'test'; session.mode = S.settings.mode || 'oral'; resetTest(); session.t0 = Date.now(); }
function resetTest() { const it = curItem(); recorder.cancel(); session.recording = null; session.recState = null; session.sent = false; session.revealed = 0; session.errors = new Set(); session.ok = new Set(); session.forgot = new Set(); session.cursor = 0; session.learnHide = 'visible'; session.words = passageWords(itemAyahs(it)); }
function endSession() { stopAudio(); recorder.cancel(); session = { summary: session.results, stars: session.stars || 0, items: [], i: 0 }; }
function viewSession() {
  if (session.summary) return viewSummary();
  const it = curItem(), n = session.items.length;
  return h('div', null,
    h('div', { class: 'session-top' },
      h('div', { class: 'topbar' },
        h('button', { class: 'icon-btn', 'aria-label': t('finish'), onclick: () => { if (session.results.length) endSession(); else { stopAudio(); session = null; } render(); } }, html(SVG.close)),
        h('div', { class: 'segs' }, session.items.map((_, i) => h('i', { class: i < session.i ? 'done' : i === session.i ? 'cur' : '' }))),
        h('span', { class: 'sub', style: 'font-weight:700' }, `${fmtNum(session.i + 1)}/${fmtNum(n)}`)),
      h('div', { class: 'item-head' },
        h('span', { class: 'pill ' + it.kind }, t('kind_' + it.kind) + (it.kind === 'sabaq' && it.parts > 1 ? ' · ' + t('part', { k: fmtNum(it.part + 1), n: fmtNum(it.parts) }) : '')),
        h('span', { class: 'item-title' }, pageTitle(it.page)))),
    session.step === 'learn' ? viewLearn(it) : session.step === 'grade' ? viewGrade(it) : session.mode === 'letter' ? viewLetterTest(it) : viewOralTest(it));
}

function modeSwitch() {
  return h('div', { class: 'seg', style: 'margin:10px 0' },
    h('button', { class: session.mode === 'oral' ? 'on' : '', onclick: () => { session.mode = 'oral'; resetTest(); render(); } }, t('oral')),
    h('button', { class: session.mode === 'letter' ? 'on' : '', onclick: () => { session.mode = 'letter'; resetTest(); render(); } }, t('letter')));
}
function viewLearn(it) {
  const all = Q.pages[it.page - 1];
  const ayahs = itemAyahs(it);
  const prev = it.part > 0 ? splitParts(all, it.parts)[it.part - 1].slice(-1) : [];
  const passage = prev.concat(ayahs);
  return h('div', null,
    playerBar(passage, `learn-${it.page}-${it.part}`),
    h('ol', { class: 'steps' }, h('li', null, t('learn_1')), h('li', null, t('learn_2')), h('li', null, t('learn_3')), prev.length ? h('li', null, t('learn_4')) : null, h('li', null, t('learn_5'))),
    h('div', { class: 'seg', style: 'margin:10px 0' }, [['visible', t('hide_text')], ['first', t('hide_first')], ['hidden', t('hide_hidden')]].map(([v, l]) =>
      h('button', { class: session.learnHide === v ? 'on' : '', onclick: () => { session.learnHide = v; render(); } }, l))),
    renderPassage(passage, { hide: session.learnHide, revealedUpTo: session.learnHide === 'visible' ? null : 0, dimAyahs: new Set(prev.length ? [0] : []), big: true, playable: true, onMeaning: openMeaning }),
    h('div', { class: 'sticky' }, h('button', { class: 'btn primary block', onclick: () => { stopAudio(); session.step = 'test'; resetTest(); render(); window.scrollTo(0, 0); } }, t('ready'))));
}
function viewOralTest(it) {
  if (kidId) return viewKidTest(it);
  const ayahs = itemAyahs(it), all = session.revealed >= ayahs.length, hide = S.settings.hide || 'first';
  return h('div', null, modeSwitch(), recBar(),
    h('p', { class: 'help' }, (all ? t('oral_help_marked') : t('oral_help')) + ' ' + t('long_press_hint')),
    h('div', { class: 'seg', style: 'margin:0 0 10px' }, [['first', t('hint_first')], ['hidden', t('hint_hidden')]].map(([v, l]) =>
      h('button', { class: hide === v ? 'on' : '', onclick: () => { S.settings.hide = v; save(); render(); } }, l))),
    renderPassage(ayahs, {
      hide, revealedUpTo: session.revealed, errors: session.errors, forgot: session.forgot, big: true, onMeaning: openMeaning,
      onWord: i => { session.errors.has(i) ? session.errors.delete(i) : session.errors.add(i); render(); },
      onAyahEnd: ai => { if (ai < session.revealed) { session.forgot.has(ai) ? session.forgot.delete(ai) : session.forgot.add(ai); render(); } }
    }),
    h('div', { class: 'sticky' }, all
      ? h('div', null, h('p', { class: 'help center', style: 'margin:0 0 8px' }, t.n('errors', session.errors.size) + (session.forgot.size ? ' · ' + t.n('forgot', session.forgot.size) : '')),
          h('button', { class: 'btn primary block', onclick: () => { session.step = 'grade'; render(); window.scrollTo(0, 0); } }, t('finish_page')))
      : h('div', { class: 'actions' },
          h('button', { class: 'btn', onclick: () => { session.revealed = ayahs.length; render(); } }, t('reveal_all')),
          h('button', { class: 'btn primary', onclick: () => { session.revealed++; session.scrollTo = 'aya'; render(); } }, t('next_ayah')))));
}
const KEYS = ['ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي', 'ء'];
function letterWords(it) { const l = []; for (const [, , x] of itemAyahs(it)) for (const w of x.split(' ')) if (isWord(w)) l.push(w); return l; }
function viewLetterTest(it) {
  const words = letterWords(it), finished = session.cursor >= words.length;
  const press = k => {
    if (finished) return;
    const i = session.cursor;
    if (k !== '?' && firstLetter(words[i]) === k) session.ok.add(i);
    else { session.errors.add(i); try { navigator.vibrate && navigator.vibrate(40); } catch (e) {} }
    session.cursor++; session.scrollTo = 'cur'; render();
  };
  return h('div', null, modeSwitch(), h('p', { class: 'help' }, t('letter_help')),
    renderPassage(itemAyahs(it), { hide: 'hidden', revealedUpTo: 0, ok: session.ok, errors: session.errors, cur: finished ? null : session.cursor, mode: 'letter', big: true }),
    h('div', { class: 'sticky' }, finished
      ? h('button', { class: 'btn primary block', onclick: () => { session.step = 'grade'; render(); window.scrollTo(0, 0); } }, t('finish_n', { e: t.n('errors', session.errors.size) }))
      : h('div', null,
          h('p', { class: 'help center', style: 'margin:0 0 6px' }, t('word_x', { i: fmtNum(session.cursor + 1), n: fmtNum(words.length) }) + ' · ' + t.n('errors', session.errors.size)),
          h('div', { class: 'kbd' }, KEYS.map(k => h('button', { onclick: () => press(k) }, k)), h('button', { class: 'q', onclick: () => press('?') }, '؟'),
            h('button', { class: 'q', style: 'grid-column:span 2', onclick: () => { for (let j = session.cursor; j < words.length; j++) session.errors.add(j); session.cursor = words.length; render(); } }, t('give_up'))))));
}
function viewGrade(it) {
  if (kidId) return viewKidGrade(it);
  const sug = P.gradeFromErrors(session.errors.size, session.words, session.forgot.size > 0);
  const icons = { 1: '↺', 2: '〰', 3: '✓', 4: '★' };
  return h('div', null,
    h('h2', { style: 'margin-top:12px' }, t('how_was_it')),
    h('p', { class: 'help' }, t('proposed', { e: t.n('errors', session.errors.size) })),
    h('div', { class: 'grades' }, [4, 3, 2, 1].map(g => h('button', { class: `grade g${g}` + (g === sug ? ' sug' : ''), onclick: () => gradeItem(g) },
      h('span', { class: 'gi' }, icons[g]), h('div', null, h('b', null, t('g' + g)), h('span', null, t('g' + g + 'd')))))),
    h('div', { class: 'actions' }, h('button', { class: 'btn ghost', onclick: () => { session.step = 'test'; resetTest(); render(); } }, t('retry'))),
    recordingCard(it), mutHint(it),
    playerBar(itemAyahs(it), `grade-${it.page}-${it.part}`),
    renderPassage(itemAyahs(it), { errors: session.errors, forgot: session.forgot, playable: true, onMeaning: openMeaning }));
}

function gradeItem(g) {
  const it = curItem(), d = today(), secs = Math.round((Date.now() - session.t0) / 1000);
  const before = S.pages[it.page], Rb = P.pageR(before, d);
  if (it.kind === 'sabaq') { S.pages[it.page] = P.applySabaq(before, g, d, it.parts); recordDuration('sabaq', secs); }
  else { S.pages[it.page] = P.applyReview(before, g, d); recordDuration(it.kind, secs); }
  if (kidId) { const n = it.kind === 'sabaq' ? (g >= 3 ? 3 : 1) : (g >= 4 ? 2 : g >= 2 ? 1 : 0); kid().earned = (kid().earned || 0) + n; session.stars = (session.stars || 0) + n; }
  markActive(); save();
  Store.logEvent({ t: Date.now(), p: it.page, k: it.kind, g, d: secs, e: session.errors.size, w: session.words, m: session.mode, r: Rb == null ? null : Math.round(Rb * 1000) / 1000, part: it.part == null ? null : it.part });
  session.results.push({ ...it, grade: g, errors: session.errors.size, secs, after: S.pages[it.page] });
  if (it.kind === 'sabaq' && g < 3) toast(t('redo_tomorrow'));
  persistRecording(it, g);
  session.i++;
  if (session.i >= session.items.length) endSession(); else beginItem();
  render(); window.scrollTo(0, 0);
}
function viewSummary() {
  if (kidId) return viewKidSummary();
  const res = session.summary;
  const lapses = res.filter(r => r.kind !== 'sabaq' && r.grade === 1).length;
  const errs = res.reduce((a, r) => a + r.errors, 0);
  const mins = Math.max(1, Math.round(res.reduce((a, r) => a + (r.secs || 0), 0) / 60));
  const sab = res.find(r => r.kind === 'sabaq');
  const streak = P.streak(S.days, today());
  const burst = html(`<svg class="burst" viewBox="0 0 160 160"><g transform="translate(80 80)">${Array.from({ length: 12 }, (_, i) => `<rect x="-2" y="-74" width="4" height="16" rx="2" fill="var(--gold-2)" transform="rotate(${i * 30})"/>`).join('')}<g fill="var(--gold)" stroke="var(--gold-2)" stroke-width="2"><rect x="-34" y="-34" width="68" height="68" rx="6"/><rect x="-34" y="-34" width="68" height="68" rx="6" transform="rotate(45)"/></g><circle r="22" fill="var(--paper)"/><path d="M-10 0l7 7 13-14" fill="none" stroke="var(--brand-2)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></g></svg>`);
  return h('div', { class: 'celebrate' }, burst,
    h('h1', null, t('mashallah')),
    h('p', { class: 'sub' }, t('session_stats', { n: t.n('pages', res.length), m: fmtNum(mins) })),
    h('div', { class: 'stat-row' },
      h('div', { class: 's' }, h('b', null, fmtNum(streak)), h('span', null, t('day_streak'))),
      h('div', { class: 's' }, h('b', null, fmtNum(errs)), h('span', null, t.n('errors', errs).replace(/^[\d٠-٩\s,.]+/, ''))),
      h('div', { class: 's' }, h('b', null, fmtNum(res.length)), h('span', null, t.n('worked', res.length)))),
    sab ? h('div', { class: 'card', style: 'text-align:start' }, h('b', null, t('sum_sabaq')),
      sab.grade < 3 ? t('sum_sabaq_redo') : sab.after.status === 'sabqi' ? t('sum_sabaq_page', { p: fmtNum(sab.page) }) : t('sum_sabaq_part')) : null,
    lapses ? h('div', { class: 'card', style: 'text-align:start' }, t.n('to_reinforce', lapses)) : null,
    newBadgesCard(),
    motivationCard(pickMotivation(errs > 5 || res.some(r => r.grade <= 2) ? 'struggle' : sab && sab.after.status === 'sabqi' ? 'new' : 'review', today()), { label: t('motivation_lbl') }),
    (() => { const nx = P.forecast(S, today() + 1, 1, Q.juz).days[0]; return h('div', { class: 'card', style: 'text-align:start;display:flex;gap:12px;align-items:center' },
      h('span', { class: 'gic', style: 'width:40px;height:40px;border-radius:12px;background:var(--gold-soft);display:grid;place-items:center;color:var(--gold-ink);flex:none' }, html(SVG.calendar)),
      h('div', null, h('b', { style: 'display:block' }, t('next_session')), h('span', { class: 'sub' }, t('min_left', { n: fmtNum(nx.minutes.total) }) + ' · ' + t.n('pages', nx.sabqi + nx.manzil + (nx.sabaq ? 1 : 0))))); })(),
    h('button', { class: 'btn primary block', style: 'margin-top:20px', onclick: () => { session = null; view = 'today'; render(); window.scrollTo(0, 0); } }, t('finish')));
}

// ---------------- map ----------------
function cellColor(ps, d) {
  if (!ps) return 'var(--empty)';
  if (ps.status === 'sabaq') return 'var(--sabqi)';
  const R = P.pageR(ps, d);
  return R >= 0.9 ? 'var(--good)' : R >= 0.8 ? 'var(--warn)' : 'var(--bad)';
}
function juzPages(j) { const out = []; for (let p = 1; p <= 604; p++) if (Q.juz[p - 1] === j) out.push(p); return out; }
function viewMap() {
  const d = today();
  const order = Array.from({ length: 30 }, (_, i) => i + 1); if (S.settings.direction === 'nas') order.reverse();
  return h('div', null,
    h('div', { class: 'page-head' }, h('h1', null, t('map_title')), h('p', { class: 'sub' }, t('map_sub'))),
    (() => { const n = memorizedMutPairs().length; return n ? h('button', { class: 'card mut-cta', onclick: openMutReview }, h('span', { class: 'gic' }, '≈'), h('div', null, h('b', null, t('mut_review')), h('span', { class: 'sub' }, t('mut_pairs', { n: fmtNum(n) }))), h('span', { class: 'chev' }, '›')) : null; })(),
    h('div', { class: 'legend', style: 'margin:6px 0 14px' },
      [['var(--good)', 'solid'], ['var(--warn)', 'watch'], ['var(--bad)', 'weak'], ['var(--sabqi)', 'in_progress']].map(([c, k]) => h('span', null, h('i', { style: `background:${c}` }), t(k)))),
    h('h2', null, t('badges')), badgesGrid(S),
    h('h2', null, t('juz_list')),
    h('div', { class: 'juzgrid' }, order.map(j => {
      const pages = juzPages(j);
      const mem = pages.filter(p => S.pages[p] && S.pages[p].status !== 'sabaq');
      const Rs = mem.map(p => P.pageR(S.pages[p], d));
      const avg = Rs.length ? Rs.reduce((a, b) => a + b, 0) / Rs.length : null;
      const col = avg == null ? 'var(--line)' : avg >= 0.9 ? 'var(--good)' : avg >= 0.8 ? 'var(--warn)' : 'var(--bad)';
      const full = mem.length === pages.length;
      return h('button', { class: 'juzcard' + (full ? ' full' : ''), onclick: () => openJuz(j) },
        ring(mem.length / pages.length, 64, 6, col, 'var(--empty)', h('b', null, arNum(j))),
        h('div', { style: 'font-weight:800;font-size:14px' }, t('juz', { j: fmtNum(j) })),
        h('small', null, t('pages_in_juz', { k: fmtNum(mem.length), n: fmtNum(pages.length) })));
    })));
}
function sheet(content) {
  const bg = h('div', { class: 'sheet-bg', onclick: () => close() }, h('div', { class: 'sheet', onclick: e => e.stopPropagation() }, content));
  const close = () => { bg.remove(); stopAudio(); };
  document.body.append(bg);
  return close;
}
function openJuz(j) {
  const d = today(), pages = juzPages(j);
  let close;
  close = sheet(h('div', null,
    h('div', { class: 'row spread' }, h('h2', { style: 'margin:0' }, t('juz', { j: fmtNum(j) })), h('button', { class: 'icon-btn', onclick: () => close() }, html(SVG.close))),
    h('p', { class: 'sub', style: 'margin:4px 0 14px' }, t('pages_in_juz', { k: fmtNum(pages.filter(p => S.pages[p] && S.pages[p].status !== 'sabaq').length), n: fmtNum(pages.length) })),
    h('div', { class: 'grid' }, pages.map(p => h('button', { class: 'cell' + (S.pages[p] ? '' : ' none'), style: `background:${cellColor(S.pages[p], d)}`, onclick: () => { close(); openPage(p); } }, fmtNum(p))))));
}
function openPage(p) {
  const d = today(), ps = S.pages[p], R = P.pageR(ps, d);
  const status = !ps ? t('st_none') : ps.status === 'sabaq' ? t('st_sabaq', { k: fmtNum((ps.part || 0) + 1), n: fmtNum(ps.parts) }) : t('st_' + ps.status);
  const nextDay = ps && ps.status !== 'sabaq' ? (ps.status === 'sabqi' ? ps.last + 1 : ps.last + P.interval(ps.S)) : null;
  let close;
  const body = h('div', null,
    h('div', { class: 'row spread' }, h('h2', { style: 'margin:0' }, t('page_n', { p: fmtNum(p) })), h('button', { class: 'icon-btn', onclick: () => close() }, html(SVG.close))),
    h('p', { class: 'sub' }, `${t('juz', { j: fmtNum(Q.juz[p - 1]) })} · ${surahsOnPage(p).map(s => getLang() === 'ar' ? Q.surahs[s - 1][1] : `${surahLabel(s)} (${Q.surahs[s - 1][1]})`).join(listSep())}`),
    h('div', { class: 'card flat' }, h('dl', { class: 'kv', style: 'margin:0' },
      h('dt', null, t('status')), h('dd', null, status),
      R != null ? [h('dt', null, t('strength')), h('dd', null, fmtNum(Math.round(R * 100)) + '%')] : null,
      ps && ps.S && ps.status !== 'sabaq' ? [h('dt', null, t('stability')), h('dd', null, t.n('days', Math.round(ps.S)))] : null,
      nextDay != null ? [h('dt', null, t('next_review')), h('dd', null, nextDay <= d ? t('today_lower') : fmtDate(nextDay))] : null,
      ps && ps.lapses ? [h('dt', null, t('lapses')), h('dd', null, fmtNum(ps.lapses))] : null)),
    h('div', { class: 'actions' },
      ps && ps.status !== 'sabaq' ? h('button', { class: 'btn primary', onclick: () => { close(); startSession({ sabqi: ps.status === 'sabqi' ? [p] : [], manzil: ps.status === 'manzil' ? [p] : [], sabaq: null }); } }, t('review_now')) : null,
      !ps || ps.status === 'sabaq' ? h('button', { class: 'btn', onclick: () => { S.pages[p] = P.seedKnownPages([p], d, 7)[p]; save(); close(); render(); toast(t('marked_known', { p: fmtNum(p) })); } }, t('already_known')) : null,
      ps ? h('button', { class: 'btn ghost', onclick: () => { delete S.pages[p]; save(); close(); render(); toast(t('page_reset', { p: fmtNum(p) })); } }, t('reset_page')) : null),
    mutCountPage(p) ? h('button', { class: 'btn block', style: 'margin-top:10px', onclick: () => { close(); openMutPage(p); } }, t('mut_on_page', { n: fmtNum(mutCountPage(p)) })) : null,
    playerBar(Q.pages[p - 1], 'sheet-' + p),
    h('p', { class: 'sub mn-hint' }, t('tap_for_meaning')),
    renderPassage(Q.pages[p - 1], { playable: true, onMeaning: (s, a, w) => { close(); openMeaning(s, a, w); } }),
    h('h2', null, t('my_recordings')), recordingsList(p));
  close = sheet(body);
}

// ---------------- settings ----------------
function viewSettings() {
  const st = S.settings;
  const set = (k, v) => { st[k] = v; save(); render(); };
  let importBox, timeInput, nameInput;
  return h('div', null, h('div', { class: 'page-head' }, h('h1', null, t('settings'))),
    h('div', { class: 'group-title' }, t('plan')),
    h('div', { class: 'group' },
      h('div', { class: 'field' }, h('label', null, t('minutes_short')), chipGroup(minuteOptions(), () => st.minutes, v => set('minutes', v))),
      h('div', { class: 'field' }, h('label', null, t('pace_short')), chipGroup(paceOptions(), () => st.pace, v => set('pace', v)), h('div', { class: 'hint' }, t('pace_applies'))),
      h('div', { class: 'field' }, h('label', null, t('direction_label')), chipGroup(dirOptions(), () => st.direction, v => set('direction', v))),
      h('div', { class: 'field' }, h('label', null, t('default_mode')), chipGroup([['oral', t('oral')], ['letter', t('letter')]], () => st.mode, v => set('mode', v)))),
    h('div', { class: 'group-title' }, t('preferences')),
    h('div', { class: 'group' },
      h('div', { class: 'field' }, h('label', null, t('name_label')), nameInput = h('input', { type: 'text', value: st.name || '', placeholder: t('name_ph'), onchange: e => set('name', e.target.value.trim()) })),
      h('div', { class: 'field' }, h('label', null, t('language')), langSwitch()),
      h('div', { class: 'field' }, h('label', null, t('theme')), h('div', { class: 'seg' }, [['auto', t('theme_auto')], ['light', t('theme_light')], ['dark', t('theme_dark')]].map(([v, l]) =>
        h('button', { class: (st.theme || 'auto') === v ? 'on' : '', onclick: () => { prefs.theme = v; savePrefs(); set('theme', v); } }, l)))),
      h('div', { class: 'field' }, h('label', null, t('reciter')),
        h('select', { onchange: e => { stopAudio(); set('reciter', e.target.value); } }, RECITERS.map(([id, nm]) => h('option', { value: id, selected: st.reciter === id }, nm)))),
      h('div', { class: 'field' }, h('label', null, t('reminder')),
        h('div', { class: 'row' }, timeInput = h('input', { type: 'time', value: prefs.reminder || '07:30', style: 'max-width:130px;margin:0' }),
          h('button', { class: 'btn', onclick: () => { prefs.reminder = timeInput.value; savePrefs(); downloadReminder(timeInput.value); } }, t('add_reminder'))),
        h('div', { class: 'hint' }, t('reminder_hint')))),
    h('div', { class: 'group-title' }, t('family')),
    h('div', { class: 'group' }, h('div', { class: 'field' },
      Object.values(children).map(c => h('button', { class: 'li', style: 'margin-bottom:8px', onclick: () => openChildDashboard(c.id) }, h('span', { class: 'kid-av' }, c.avatar), h('div', null, h('b', null, c.name), h('span', null, `${fmtNum(progressStats(c.state).pages)} p. · ⭐ ${fmtNum(starsAvailable(c))}`)), h('span', { class: 'chev' }, '›'))),
      h('button', { class: 'btn primary block', onclick: openAddChild }, '+ ' + t('add_child')),
      h('p', { class: 'hint sub', style: 'font-size:13px' }, t('family_hint')),
      pinHash() ? h('button', { class: 'btn ghost', style: 'padding-inline:0', onclick: () => askPin(t('parent_area'), () => setParentPin()) }, t('change_pin')) : null)),
    h('div', { class: 'group-title' }, t('account')),
    h('div', { class: 'group' }, h('div', { class: 'field' }, accountBlock())),
    h('div', { class: 'group-title' }, t('my_data')),
    h('div', { class: 'group' }, h('div', { class: 'field' },
      h('div', { class: 'actions', style: 'margin-top:0' },
        h('button', { class: 'btn', onclick: exportData }, t('export')),
        h('button', { class: 'btn', onclick: () => { importBox.hidden = !importBox.hidden; } }, t('import'))),
      importBox = h('div', { hidden: true, style: 'margin-top:10px' }, h('textarea', { id: 'imp', placeholder: t('import_ph') }),
        h('button', { class: 'btn primary', style: 'margin-top:8px', onclick: () => {
          try { const x = JSON.parse(document.getElementById('imp').value); if (!x.pages || !x.settings) throw 0; S = normalize(x); save(); toast(t('imported')); render(); } catch (e) { toast(t('bad_json')); } } }, t('import_do')))),
      h('div', { class: 'field' }, h('button', { class: 'btn ghost danger', style: 'padding-inline:0', onclick: confirmReset }, t('reset_all')))),
    h('div', { class: 'group-title' }, t('about')),
    h('p', { class: 'sub', style: 'padding:0 4px' }, t('about_text'), ' ', h('a', { class: 'link', href: PRIVACY_URL, target: '_blank' }, t('privacy_link'))),
    storageNote());
}

function accountBlock() {
  if (!Store.enabled) return h('p', { class: 'sub' }, t('accounts_off'));
  if (!Store.user) return h('button', { class: 'btn primary block', onclick: () => { screen = 'auth'; authMode = 'signup'; authErr = ''; render(); } }, t('with_account'));
  return h('div', null, h('p', { class: 'sub' }, t('signed_in_as', { email: Store.user.email || '' })),
    h('div', { class: 'actions' },
      h('button', { class: 'btn', onclick: async () => { Social.stop(); if (unwatchChildren) unwatchChildren(); children = {}; await Store.signOut(); S = null; screen = 'welcome'; render(); } }, t('sign_out')),
      h('button', { class: 'btn ghost', style: 'color:var(--bad)', onclick: confirmDeleteAccount }, t('delete_account'))));
}
function confirmDeleteAccount() {
  let close;
  close = sheet(h('div', null, h('h2', { style: 'margin-top:0' }, t('delete_title')), h('p', { class: 'sub' }, t('delete_body')),
    h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => close() }, t('cancel')),
      h('button', { class: 'btn primary', style: 'background:var(--bad);border-color:var(--bad)', onclick: async () => {
        close();
        try { await Social.deleteAllMine().catch(() => {}); await Store.deleteAccount(); S = null; screen = 'welcome'; toast(t('deleted')); render(); }
        catch (e) { toast(e && e.code === 'auth/requires-recent-login' ? t('delete_relogin') : t('sync_error')); }
      } }, t('delete')))));
}
function confirmReset() {
  let close;
  close = sheet(h('div', null, h('h2', { style: 'margin-top:0' }, t('reset_title')), h('p', { class: 'sub' }, t('reset_body')),
    h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => close() }, t('cancel')),
      h('button', { class: 'btn primary', style: 'background:var(--bad);border-color:var(--bad)', onclick: () => {
        close(); S = null; Store.saveLocal(null);
        if (Store.user) { const { F } = Store.fb; F.setDoc(Store.userDoc(), { state: null }, { merge: true }).catch(() => {}); }
        render(); } }, t('erase')))));
}
function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = h('a', { href: url, download: name }); document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function exportData() { download(`sourah-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(S, null, 1), 'application/json'); }
function downloadReminder(time) {
  const [hh, mm] = time.split(':');
  const dt = new Date(); const ymd = `${dt.getFullYear()}${String(dt.getMonth() + 1).padStart(2, '0')}${String(dt.getDate()).padStart(2, '0')}`;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sourah//FR', 'BEGIN:VEVENT', `UID:sourah-daily-${Date.now()}@sourah`, `DTSTAMP:${stamp}`,
    `DTSTART:${ymd}T${hh}${mm}00`, 'DURATION:PT20M', 'RRULE:FREQ=DAILY', `SUMMARY:${t('reminder_title')}`, `URL:${location.origin}${location.pathname}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${t('reminder_title')}`, 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  download('sourah-rappel.ics', ics, 'text/calendar');
}


function updateBadge() {
  const b = document.querySelector('.nav button[data-go=buddy] .badge'); if (!b) return;
  const n = Store.user ? Social.pendingToReview().length + Social.unseenFeedback().length : 0;
  b.textContent = n ? String(n) : ''; b.hidden = !n;
}
Social.onChange(() => {
  updateBadge();
  const busy = document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName);
  if (!session && !screen && view === 'buddy' && !busy && !document.querySelector('.sheet-bg')) render();
});
function mutHint(it) {
  const ayahs = itemAyahs(it); let idx = 0; const hit = new Set();
  ayahs.forEach(([s, a, x]) => { x.split(' ').forEach(w => { if (!isWord(w)) return; if (session.errors.has(idx) && mutOf(s, a).length) hit.add(s + ':' + a); idx++; }); });
  ayahs.forEach(([s, a], ai) => { if (session.forgot.has(ai) && mutOf(s, a).length) hit.add(s + ':' + a); });
  if (!hit.size) return null;
  return h('button', { class: 'card mut-cta', onclick: () => openMutPage(it.page) }, h('span', { class: 'gic' }, '≈'),
    h('div', null, h('b', null, t('mut_hint')), h('span', { class: 'sub' }, t('mut_hint_sub'))), h('span', { class: 'chev' }, '›'));
}

// ================= v2: recording, buddy review, mutashabihat =================

// ---------- recording during the oral test ----------
const recorder = new Recorder(secs => { const el = document.getElementById('rec-time'); if (el) el.textContent = fmtDuration(secs); if (secs >= MAX_SECONDS) stopRecording(); });
async function startRecording() {
  try { await recorder.start(); session.recState = 'on'; render(); }
  catch (e) { console.warn(e); toast(t('mic_denied')); }
}
async function stopRecording() {
  const r = await recorder.stop();
  if (session && r) { session.recording = r; session.recState = 'done'; render(); }
}
function recBar() {
  if (!canRecord()) return null;
  if (session.recState === 'on') return h('div', { class: 'recbar on' }, h('span', { class: 'recdot' }), h('b', null, t('recording')), h('span', { id: 'rec-time', class: 'rectime' }, '0:00'),
    h('button', { class: 'btn', onclick: stopRecording }, '■ ' + t('stop')));
  if (session.recState === 'done') return h('div', { class: 'recbar' }, html(SVG.mic), h('span', null, t('recorded', { d: fmtDuration(session.recording.duration) })),
    h('button', { class: 'btn ghost', onclick: () => { session.recording = null; session.recState = null; render(); } }, t('redo')));
  return h('button', { class: 'recbar idle', onclick: startRecording }, h('span', { class: 'recdot' }), h('span', null, t('record_hint')));
}
function audioEl(blob) {
  const url = URL.createObjectURL(blob);
  const a = h('audio', { controls: true, src: url, preload: 'metadata', class: 'rec-audio' });
  // MediaRecorder webm files carry no duration: seek to the end once so the player shows it
  a.addEventListener('loadedmetadata', function fix() {
    if (a.duration === Infinity) { a.addEventListener('timeupdate', function back() { a.removeEventListener('timeupdate', back); a.currentTime = 0; }); a.currentTime = 1e101; }
  }, { once: true });
  return a;
}
/** Shown in the grade view when the recitation was recorded. */
function recordingCard(it) {
  if (!session.recording) return null;
  const canSend = Store.user && Social.data.asLearner.length;
  return h('div', { class: 'card rec-card' },
    h('div', { class: 'row spread' }, h('b', null, t('your_recording')), h('span', { class: 'sub' }, fmtDuration(session.recording.duration))),
    h('p', { class: 'help', style: 'margin:4px 0 8px' }, t('relisten_hint')),
    audioEl(session.recording.blob),
    Store.user ? h('div', { class: 'actions' },
      canSend
        ? h('button', { class: 'btn primary', disabled: session.sent, onclick: async e => {
            e.target.disabled = true; e.target.textContent = t('sending');
            try { await shareRecording(session.recording, it); session.sent = true; toast(t('sent_ok')); } catch (err) { console.warn(err); toast(t('send_error')); }
            render(); } }, session.sent ? t('sent_ok') : t('send_review'))
        : h('p', { class: 'sub', style: 'margin:0' }, t('invite_first'))) : null);
}
async function persistRecording(it, g) {
  if (!session.recording) return null;
  const rec = Object.assign({ id: 'r' + Date.now(), page: it.page, part: it.part == null ? null : it.part, parts: it.parts || 1, kind: it.kind, createdAt: Date.now(), grade: g, errors: [...session.errors] }, session.recording);
  try { await saveRecording(rec); } catch (e) { console.warn(e); }
  return rec;
}
function shareRecording(rec, it) {
  return Social.send(rec, { learnerName: displayName(), page: it.page, part: it.part == null ? null : it.part, parts: it.parts || 1 });
}
function displayName() { return (S && S.settings.name) || (Store.user && (Store.user.displayName || (Store.user.email || '').split('@')[0])) || ''; }

// ---------- buddy tab ----------
let inviteCode = null, codeInput = '';
function viewBuddy() {
  const wrap = h('div', null, h('div', { class: 'page-head' }, h('h1', null, t('buddy')), h('p', { class: 'sub' }, t('buddy_sub'))));
  if (!Store.enabled || !Store.user) {
    wrap.append(h('div', { class: 'card center', style: 'padding:24px 18px' }, html(SVG.people), h('h2', { style: 'margin:8px 0 6px' }, t('buddy_need_account')), h('p', { class: 'sub' }, t('buddy_need_account_sub')),
      Store.enabled ? h('button', { class: 'btn primary block', style: 'margin-top:14px', onclick: () => { screen = 'auth'; authMode = 'signup'; authErr = ''; render(); } }, t('with_account')) : h('p', { class: 'sub', style: 'margin-top:10px' }, t('accounts_off'))));
    wrap.append(h('h2', null, t('my_recordings')), recordingsList(null));
    return wrap;
  }
  const D = Social.data;
  const pending = Social.pendingToReview();
  if (pending.length) wrap.append(h('h2', null, t('to_review') + ` (${fmtNum(pending.length)})`), h('div', { class: 'list' }, pending.map(r =>
    h('button', { class: 'li', onclick: () => openReview(r) }, h('span', { class: 'av' }, initials(r.learnerName)),
      h('div', null, h('b', null, r.learnerName || '—'), h('span', null, `${pageLabel(r)} · ${fmtDuration(r.duration || 0)}`)), h('span', { class: 'chev' }, '›')))));

  // my reviewers
  wrap.append(h('h2', null, t('my_reviewers')), h('div', { class: 'card' },
    D.asLearner.length ? D.asLearner.map(p => h('div', { class: 'person' }, h('span', { class: 'av' }, initials(p.reviewerName)), h('b', null, p.reviewerName || '—'),
      h('button', { class: 'btn ghost danger', onclick: () => Social.unpair(p.id) }, t('remove')))) : h('p', { class: 'sub', style: 'margin:0 0 10px' }, t('no_reviewer_yet')),
    inviteCode ? h('div', { class: 'code-box' }, h('span', { class: 'sub' }, t('share_code')), h('div', { class: 'code' }, inviteCode),
      h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => shareInvite(inviteCode) }, t('share')), h('button', { class: 'btn ghost', onclick: () => { inviteCode = null; render(); } }, t('close'))),
      h('p', { class: 'hint sub', style: 'font-size:12px;margin-top:6px' }, t('code_valid')))
      : h('button', { class: 'btn primary block', style: 'margin-top:6px', onclick: async () => { try { inviteCode = await Social.createInvite(displayName()); } catch (e) { toast(t('sync_error')); } render(); } }, t('invite_reviewer'))));

  // people I review
  let inp;
  wrap.append(h('h2', null, t('i_review')), h('div', { class: 'card' },
    D.asReviewer.length ? D.asReviewer.map(p => h('div', { class: 'person' }, h('span', { class: 'av' }, initials(p.learnerName)), h('b', null, p.learnerName || '—'),
      h('button', { class: 'btn ghost danger', onclick: () => Social.unpair(p.id) }, t('remove')))) : h('p', { class: 'sub', style: 'margin:0 0 10px' }, t('enter_code_hint')),
    h('div', { class: 'row' }, inp = h('input', { type: 'text', placeholder: 'ABC123', value: codeInput, maxlength: 8, style: 'margin:0;text-transform:uppercase;letter-spacing:.2em;font-weight:800', oninput: e => { codeInput = e.target.value; } }),
      h('button', { class: 'btn primary', onclick: async () => {
        try { const name = await Social.redeemInvite(inp.value, displayName()); codeInput = ''; toast(t('paired_ok', { name: name || '' })); }
        catch (e) { toast(t(e.message === 'invite_expired' ? 'code_expired' : e.message === 'invite_self' ? 'code_self' : 'code_invalid')); }
        render(); } }, t('join')))));

  // my feedback
  if (D.mine.length) wrap.append(h('h2', null, t('my_feedback')), h('div', { class: 'list' }, D.mine.map(r =>
    h('button', { class: 'li' + (r.status === 'done' && !r.seen ? ' new' : ''), onclick: () => r.status === 'done' ? openFeedback(r) : null },
      h('span', { class: 'av ' + (r.status === 'done' ? 'ok' : '') }, r.status === 'done' ? html(SVG.check) : '…'),
      h('div', null, h('b', null, pageLabel(r)), h('span', null, r.status === 'done' ? t('reviewed_by', { name: (r.review && r.review.byName) || '' }) + ' · ' + t('g' + r.review.grade) + (r.review.voice ? ' · 🎙' : '') : t('waiting_review'))),
      h('span', { class: 'chev' }, r.status === 'done' ? '›' : '')))));

  wrap.append(h('h2', null, t('my_recordings')), recordingsList(null));
  return wrap;
}
function initials(n) { return (n || '?').trim().split(/\s+/).map(x => x[0]).join('').slice(0, 2).toUpperCase() || '?'; }
function pageLabel(r) { return t('page_n', { p: fmtNum(r.page) }) + (r.parts > 1 ? ' · ' + t('part', { k: fmtNum(r.part + 1), n: fmtNum(r.parts) }) : ''); }
async function shareInvite(code) {
  const text = t('invite_text', { code, url: location.origin + location.pathname });
  try { if (navigator.share) { await navigator.share({ text }); return; } } catch (e) { return; }
  try { await navigator.clipboard.writeText(text); toast(t('copied')); } catch (e) { toast(code); }
}
function recordingsList(page) {
  const box = h('div', { class: 'list' }, h('p', { class: 'sub' }, '…'));
  listRecordings(page).then(recs => {
    box.innerHTML = '';
    if (!recs.length) { box.append(h('p', { class: 'sub' }, t('no_recordings'))); return; }
    recs.slice(0, 20).forEach(r => {
      const row = h('div', { class: 'li static' }, h('span', { class: 'av' }, html(SVG.mic)),
        h('div', null, h('b', null, pageLabel(r)), h('span', null, `${new Date(r.createdAt).toLocaleDateString(locale(), { day: 'numeric', month: 'short' })} · ${fmtDuration(r.duration)}` + (r.grade ? ' · ' + t('g' + r.grade) : ''))),
        h('button', { class: 'icon-btn', 'aria-label': t('play'), onclick: () => openRecording(r) }, html(ICON.play)));
      box.append(row);
    });
  }).catch(() => { box.innerHTML = ''; box.append(h('p', { class: 'sub' }, t('no_recordings'))); });
  return box;
}
function partAyahs(page, part, parts) { const all = Q.pages[page - 1]; return parts > 1 && part != null ? (splitParts(all, parts)[part] || all) : all; }
function openRecording(r) {
  let close;
  const errs = new Set(r.errors || []);
  close = sheet(h('div', null,
    h('div', { class: 'row spread' }, h('h2', { style: 'margin:0' }, pageLabel(r)), h('button', { class: 'icon-btn', onclick: () => close() }, html(SVG.close))),
    h('p', { class: 'sub' }, t('relisten_hint')),
    audioEl(r.blob),
    h('div', { class: 'actions' },
      Store.user && Social.data.asLearner.length ? h('button', { class: 'btn primary', onclick: async e => { e.target.disabled = true; try { await shareRecording(r, r); toast(t('sent_ok')); close(); } catch (err) { toast(t('send_error')); e.target.disabled = false; } } }, t('send_review')) : null,
      h('button', { class: 'btn ghost danger', onclick: async () => { await deleteRecording(r.id); close(); render(); } }, t('delete'))),
    renderPassage(partAyahs(r.page, r.part, r.parts), { errors: errs, onMeaning: (s, a, w) => { close(); openMeaning(s, a, w); } })));
}

// ---------- reviewer: annotate a recitation ----------
function openReview(r) { voiceRec.cancel(); screen = 'review'; reviewState = { r, blob: null, errors: new Set(), forgot: new Set(), grade: null, comment: '', voice: null, voiceState: null }; render(); window.scrollTo(0, 0);
  Social.loadAudio(r).then(b => { if (reviewState && reviewState.r === r) { reviewState.blob = b; render(); } }).catch(() => toast(t('audio_error'))); }
let reviewState = null;
function viewReview() {
  const st = reviewState, r = st.r, ayahs = partAyahs(r.page, r.part, r.parts);
  const sug = P.gradeFromErrors(st.errors.size, passageWords(ayahs), st.forgot.size > 0);
  const grade = st.grade || sug;
  let ta;
  return h('div', null,
    h('div', { class: 'session-top' }, h('div', { class: 'topbar' },
      h('button', { class: 'icon-btn', onclick: () => { voiceRec.cancel(); screen = null; reviewState = null; render(); } }, html(SVG.close)),
      h('div', { style: 'flex:1' }, h('b', null, r.learnerName || '—'), h('div', { class: 'sub' }, pageLabel(r))))),
    h('p', { class: 'help' }, t('review_help')),
    st.blob ? audioEl(st.blob) : h('div', { class: 'card sub' }, t('loading_audio')),
    h('div', { style: 'height:10px' }),
    renderPassage(ayahs, { errors: st.errors, forgot: st.forgot, big: true, onMeaning: openMeaning,
      onWord: i => { st.errors.has(i) ? st.errors.delete(i) : st.errors.add(i); render(); },
      onAyahEnd: ai => { st.forgot.has(ai) ? st.forgot.delete(ai) : st.forgot.add(ai); render(); } }),
    h('h2', null, t('your_grade')),
    h('div', { class: 'grades' }, [4, 3, 2, 1].map(g => h('button', { class: `grade g${g}` + (g === grade ? ' sug' : ''), onclick: () => { st.grade = g; render(); } },
      h('span', { class: 'gi' }, { 1: '↺', 2: '〰', 3: '✓', 4: '★' }[g]), h('div', null, h('b', null, t('g' + g)), h('span', null, t('g' + g + 'd')))))),
    h('h2', null, t('comment')),
    ta = h('textarea', { placeholder: t('comment_ph'), style: 'min-height:90px;font:15px var(--font)', oninput: e => { st.comment = e.target.value; } }, st.comment),
    voiceCommentBar(st),
    h('div', { class: 'sticky' }, h('button', { class: 'btn primary block', onclick: async e => {
      e.target.disabled = true;
      try {
        if (voiceRec.recording) await stopVoice();
        const voice = st.voice ? await Social.sendVoice(r.id, st.voice) : null;
        await Social.submitReview(r.id, Object.assign({ byName: displayName(), errors: [...st.errors], forgot: [...st.forgot], grade, comment: st.comment.trim() }, voice ? { voice } : {})); toast(t('review_sent')); screen = null; reviewState = null; view = 'buddy'; }
      catch (err) { console.warn(err); toast(t('send_error')); e.target.disabled = false; }
      render(); } }, t('send_correction'))));
}


// ---------- reviewer's spoken comment ----------
const voiceRec = new Recorder(secs => { const el = document.getElementById('voice-time'); if (el) el.textContent = fmtDuration(secs); if (secs >= VOICE_MAX) stopVoice(); });
const VOICE_MAX = 180;
async function startVoice() {
  try { await voiceRec.start(); reviewState.voiceState = 'on'; render(); }
  catch (e) { console.warn(e); toast(t('mic_denied')); }
}
async function stopVoice() {
  const r = await voiceRec.stop();
  if (reviewState && r) { reviewState.voice = r; reviewState.voiceState = 'done'; render(); }
}
function voiceCommentBar(st) {
  if (!canRecord()) return null;
  if (st.voiceState === 'on') return h('div', { class: 'recbar on', style: 'margin-top:10px' }, h('span', { class: 'recdot' }), h('b', null, t('recording')), h('span', { id: 'voice-time', class: 'rectime' }, '0:00'),
    h('button', { class: 'btn', onclick: stopVoice }, '■ ' + t('stop')));
  if (st.voiceState === 'done') return h('div', { class: 'voice-box', style: 'margin-top:10px' },
    h('div', { class: 'row spread' }, h('span', { class: 'voice-lbl' }, html(SVG.mic), t('voice_comment') + ' · ' + fmtDuration(st.voice.duration)),
      h('button', { class: 'btn ghost', onclick: () => { st.voice = null; st.voiceState = null; render(); } }, t('redo'))),
    audioEl(st.voice.blob));
  return h('button', { class: 'recbar idle', style: 'margin-top:10px', onclick: startVoice }, h('span', { class: 'recdot' }), h('span', null, t('record_voice')));
}

// ---------- learner: read the feedback ----------
function openFeedback(r) {
  const rv = r.review || {};
  if (!r.seen) Social.markSeen(r.id).catch(() => {});
  let close;
  close = sheet(h('div', null,
    h('div', { class: 'row spread' }, h('h2', { style: 'margin:0' }, pageLabel(r)), h('button', { class: 'icon-btn', onclick: () => close() }, html(SVG.close))),
    h('p', { class: 'sub' }, t('reviewed_by', { name: rv.byName || '' })),
    h('div', { class: 'card flat' }, h('div', { class: 'row' }, h('span', { class: `grade g${rv.grade}`, style: 'border:0;padding:0;background:none' }, h('span', { class: 'gi' }, { 1: '↺', 2: '〰', 3: '✓', 4: '★' }[rv.grade])),
      h('div', null, h('b', null, t('g' + rv.grade)), h('div', { class: 'sub' }, t.n('errors', (rv.errors || []).length) + ((rv.forgot || []).length ? ' · ' + t.n('forgot', rv.forgot.length) : '')))),
      rv.comment ? h('blockquote', { class: 'comment' }, rv.comment) : null,
      rv.voice ? (() => { const box = h('div', { class: 'voice-box' }, h('div', { class: 'voice-lbl' }, html(SVG.mic), t('voice_from', { name: rv.byName || '' }) + ' · ' + fmtDuration(rv.voice.duration || 0)), h('div', { class: 'sub' }, t('loading_audio')));
        Social.loadVoice(r).then(b => { box.lastChild.replaceWith(audioEl(b)); }).catch(() => { box.lastChild.textContent = t('audio_error'); });
        return box; })() : null),
    h('div', { class: 'actions' }, S.pages[r.page] && S.pages[r.page].status !== 'sabaq' ? h('button', { class: 'btn primary', onclick: () => { reviewTomorrow(r.page); close(); toast(t('planned_tomorrow')); render(); } }, t('review_tomorrow')) : null),
    renderPassage(partAyahs(r.page, r.part, r.parts), { errors: new Set(rv.errors || []), forgot: new Set(rv.forgot || []), onMeaning: (s, a, w) => { close(); openMeaning(s, a, w); } })));
}
function reviewTomorrow(p) {
  const ps = S.pages[p], d = today();
  if (!ps || ps.status === 'sabaq') return;
  ps.last = ps.status === 'sabqi' ? d : d + 1 - P.interval(ps.S);
  save();
}

// ---------- mutashabihat ----------
const DIAC = /[ً-ٰٟۖ-ࣰۭ-ࣲـ]/g;
const NMAP = { 'ٱ': 'ا', 'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ى': 'ي', 'ة': 'ه', 'ؤ': 'و', 'ئ': 'ي' };
const normWord = w => w.replace(DIAC, '').replace(/[ٱأإآىةؤئ]/g, c => NMAP[c]);
let AY = null;
function ayahIndex() { if (!AY) { AY = {}; Q.pages.forEach((pg, i) => pg.forEach(([s, a, x]) => { AY[s + ':' + a] = { s, a, text: x, page: i + 1 }; })); } return AY; }
function mutOf(s, a) { return (Q.mut && Q.mut[s + ':' + a]) || []; }
function mutCountPage(p) { return Q.pages[p - 1].reduce((n, [s, a]) => n + (mutOf(s, a).length ? 1 : 0), 0); }
/** Indices of words of A that are not in the longest common word subsequence with B. */
function diffWords(textA, textB) {
  const A = textA.split(' ').filter(isWord).map(normWord), B = textB.split(' ').filter(isWord).map(normWord);
  const L = Array.from({ length: A.length + 1 }, () => new Array(B.length + 1).fill(0));
  for (let i = A.length - 1; i >= 0; i--) for (let j = B.length - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const keep = new Set(); let i = 0, j = 0;
  while (i < A.length && j < B.length) { if (A[i] === B[j]) { keep.add(i); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++; }
  const out = new Set(); A.forEach((_, k) => { if (!keep.has(k)) out.add(k); });
  return out;
}
function mutPair(keyA, keyB) {
  const ix = ayahIndex(), A = ix[keyA], B = ix[keyB];
  const one = (X, Y) => h('div', { class: 'mut-side' },
    h('div', { class: 'mut-ref' }, `${surahLabel(X.s)} ${fmtNum(X.s)}:${fmtNum(X.a)} · ${t('page_n', { p: fmtNum(X.page) })}`),
    renderPassage([[X.s, X.a, X.text]], { showHeaders: false, diff: diffWords(X.text, Y.text), onMeaning: (s, a, w) => { document.querySelectorAll('.sheet-bg').forEach(e => e.remove()); openMeaning(s, a, w); } }));
  return h('div', { class: 'mut-pair' }, one(A, B), one(B, A));
}
function openMutPage(p) {
  let close;
  const items = Q.pages[p - 1].filter(([s, a]) => mutOf(s, a).length);
  close = sheet(h('div', null,
    h('div', { class: 'row spread' }, h('h2', { style: 'margin:0' }, t('mut_title')), h('button', { class: 'icon-btn', onclick: () => close() }, html(SVG.close))),
    h('p', { class: 'sub', style: 'margin-bottom:10px' }, t('mut_sub')),
    items.map(([s, a]) => mutOf(s, a).slice(0, 3).map(([k]) => mutPair(s + ':' + a, k)))));
}
/** Pairs where both ayahs are on memorized pages, weakest first. */
function memorizedMutPairs() {
  const ix = ayahIndex(), d = today(), seen = new Set(), out = [];
  const mem = p => S.pages[p] && S.pages[p].status !== 'sabaq';
  for (const key in Q.mut || {}) {
    const A = ix[key]; if (!A || !mem(A.page)) continue;
    for (const [k] of Q.mut[key]) {
      const B = ix[k]; if (!B || !mem(B.page) || A.page === B.page && Math.abs(A.a - B.a) < 2) continue;
      const id = [key, k].sort().join('|'); if (seen.has(id)) continue; seen.add(id);
      if (A.text === B.text) continue; // identical refrains: nothing to tell apart
      const r = Math.min(P.pageR(S.pages[A.page], d), P.pageR(S.pages[B.page], d));
      out.push({ a: key, b: k, r });
    }
  }
  return out.sort((x, y) => x.r - y.r);
}
function openMutReview() {
  const pairs = memorizedMutPairs();
  let i = 0, close;
  const body = h('div');
  const draw = () => {
    body.innerHTML = '';
    body.append(h('div', { class: 'row spread' }, h('h2', { style: 'margin:0' }, t('mut_review')), h('button', { class: 'icon-btn', onclick: () => close() }, html(SVG.close))));
    if (!pairs.length) { body.append(h('p', { class: 'sub' }, t('mut_none'))); return; }
    body.append(h('p', { class: 'sub', style: 'margin-bottom:10px' }, `${fmtNum(i + 1)} / ${fmtNum(pairs.length)} · ${t('mut_review_sub')}`),
      mutPair(pairs[i].a, pairs[i].b),
      h('div', { class: 'actions' },
        h('button', { class: 'btn', disabled: i === 0, onclick: () => { i--; draw(); } }, t('previous')),
        h('button', { class: 'btn primary', onclick: () => { if (i < pairs.length - 1) { i++; draw(); } else { close(); toast(t('mut_done')); } } }, i < pairs.length - 1 ? t('next') : t('finish'))));
  };
  draw();
  close = sheet(body);
}


function longPress(el, fn) {
  let tm = null;
  const start = () => { el._lp = false; tm = setTimeout(() => { el._lp = true; try { navigator.vibrate && navigator.vibrate(15); } catch (e) {} fn(); }, 450); };
  const cancel = () => clearTimeout(tm);
  el.addEventListener('pointerdown', start); el.addEventListener('pointerup', cancel); el.addEventListener('pointerleave', cancel); el.addEventListener('pointercancel', cancel);
  el.addEventListener('contextmenu', e => e.preventDefault());
}
// ================= meaning: translation, tafsir, word by word =================
const MEANING = new Map();
function loadMeaning(page) {
  if (!MEANING.has(page)) MEANING.set(page, fetch(`meaning/${page}.json`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).catch(e => { MEANING.delete(page); throw e; }));
  return MEANING.get(page);
}
const TAFSIRS = [['fr', 'Al-Mukhtasar (FR)'], ['en', 'Al-Mukhtasar (EN)'], ['ar', 'التفسير الميسر']];
/** Gharib entries look like "﴿phrase﴾: explanation" separated by blank lines. Returns the entries that contain the word. */
function gharibFor(gh, word) {
  if (!gh || !word) return [];
  const w = normWord(word).replace(/^(و|ف)(?=..)/, '');
  return gh.split(/\n\s*\n/).filter(line => { const m = line.match(/﴿([^﴾]+)﴾/); return m && m[1].split(/\s+/).some(x => { const n = normWord(x); return n === normWord(word) || n.endsWith(w); }); });
}
function openMeaning(s, a, wi) {
  const ix = ayahIndex()[s + ':' + a]; if (!ix) return;
  const lang = getLang();
  let tab = prefs.tafsir || (lang === 'ar' ? 'ar' : lang === 'en' ? 'en' : 'fr');
  let close;
  const words = ix.text.split(' ').filter(isWord);
  const body = h('div', null,
    h('div', { class: 'row spread' }, h('h2', { style: 'margin:0' }, wi != null ? t('word_meaning') : t('verse_meaning')), h('button', { class: 'icon-btn', 'aria-label': t('close'), onclick: () => close() }, html(SVG.close))),
    h('p', { class: 'sub', style: 'margin:2px 0 10px' }, `${surahLabel(s)} · ${fmtNum(s)}:${fmtNum(a)} · ${t('page_n', { p: fmtNum(ix.page) })}`),
    renderPassage([[s, a, ix.text]], { showHeaders: false, diff: wi != null ? new Set([wi]) : null, onMeaning: (s2, a2, w2) => { close(); openMeaning(s2, a2, w2); } }),
    h('div', { class: 'mn-body' }, h('p', { class: 'sub' }, t('loading'))));
  close = sheet(body);
  const slot = body.querySelector('.mn-body');
  loadMeaning(ix.page).then(M => {
    const m = M[s + ':' + a] || {};
    slot.innerHTML = '';
    if (wi != null) {
      const w = (m.w || [])[wi], gh = gharibFor(m.gh, words[wi]);
      slot.append(h('div', { class: 'card flat mn-word' },
        h('div', { class: 'mn-ar' }, words[wi] || ''),
        w ? h('div', { class: 'mn-tr' }, w[1] ? h('i', null, w[1]) : null, w[0] ? h('b', null, w[0]) : null, lang !== 'en' && w[0] ? h('span', { class: 'sub' }, ' ' + t('in_english')) : null) : null,
        gh.length ? h('div', { class: 'mn-gh', dir: 'rtl', lang: 'ar' }, gh.map(x => h('p', null, x))) : null,
        !w && !gh.length ? h('p', { class: 'sub' }, t('no_word_meaning')) : null));
    }
    const tr = lang === 'en' ? m.en : lang === 'fr' ? m.fr : null;
    if (tr) slot.append(h('div', { class: 'mn-sec' }, h('div', { class: 'mn-lbl' }, t('translation')), h('p', { class: 'mn-text' }, tr)));
    const tafBox = h('div');
    const drawTaf = () => {
      tafBox.innerHTML = '';
      const txt = (m.tf || {})[tab] || '', from = (m.tfFrom || {})[tab];
      tafBox.append(h('div', { class: 'mn-sec' },
        h('div', { class: 'mn-lbl' }, t('tafsir')),
        h('div', { class: 'seg mini' }, TAFSIRS.map(([k, label]) => h('button', { class: tab === k ? 'on' : '', onclick: () => { tab = k; prefs.tafsir = k; savePrefs(); drawTaf(); } }, label))),
        from ? h('p', { class: 'sub', style: 'font-size:12.5px' }, t('tafsir_grouped', { a: fmtNum(from) })) : null,
        h('div', { class: 'mn-text', dir: tab === 'ar' ? 'rtl' : 'ltr', lang: tab }, txt ? txt.split(/\n\s*\n|\n/).filter(Boolean).map(p => h('p', null, p)) : h('p', { class: 'sub' }, '—'))));
    };
    drawTaf(); slot.append(tafBox,
      h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => { stopAudio(); player.load([[s, a]], { reciter: S.settings.reciter, repeat: 1, rate: S.settings.rate }); playerKey = 'meaning'; player.play(); } }, '▶ ' + t('listen_ayah'))),
      h('p', { class: 'sub', style: 'font-size:11.5px;margin-top:14px' }, t('meaning_sources')));
  }).catch(() => { slot.innerHTML = ''; slot.append(h('p', { class: 'sub' }, t('meaning_offline'))); });
}


// ================= daily quiz =================
let quizState = null;
const QUIZ_N = 10;
function memorizedForQuiz() {
  const d = today();
  return Object.keys(S.pages).filter(k => S.pages[k].status !== 'sabaq').map(k => ({ page: +k, R: P.pageR(S.pages[k], d) }));
}
function quizCard(d) {
  const mem = memorizedForQuiz();
  if (!mem.length) return null;
  const done = S.quiz && S.quiz.day === d;
  return h('button', { class: 'card quiz-cta' + (done ? ' done' : ''), onclick: () => done ? null : startQuiz() },
    h('span', { class: 'qi' }, done ? html(SVG.check) : '?'),
    h('div', null, h('b', null, t('quiz_title')), h('span', { class: 'sub' }, done ? t('quiz_done', { s: fmtNum(S.quiz.score), n: fmtNum(S.quiz.total) }) : t('quiz_sub', { n: fmtNum(QUIZ_N), m: fmtNum(3) }))),
    done ? null : h('span', { class: 'btn gold', style: 'padding:9px 14px' }, t('quiz_start')));
}
function startQuiz() {
  const qs = buildQuiz(Q, memorizedForQuiz(), today(), QUIZ_N);
  if (!qs.length) return toast(t('quiz_none'));
  quizState = { qs, i: 0, picked: null, score: 0, wrong: [], t0: Date.now() };
  screen = 'quiz'; stopAudio(); render(); window.scrollTo(0, 0);
}
function quizPrompt(q) {
  const ayah = [[q.s, q.a, q.prompt]];
  return renderPassage(ayah, { showHeaders: false, big: true });
}
function viewQuiz() {
  const st = quizState;
  if (st.i >= st.qs.length) return viewQuizResult();
  const q = st.qs[st.i], answered = st.picked != null;
  const label = { next: 'q_next', prev: 'q_prev', word: 'q_word', surah: 'q_surah' }[q.type];
  const choiceText = (c, k) => q.type === 'surah' ? h('span', null, h('b', null, surahLabel(c)), getLang() === 'ar' ? null : h('span', { class: 'ar-name' }, Q.surahs[c - 1][1])) : h('span', { class: 'ar-choice' }, c);
  return h('div', { class: 'quiz' },
    h('div', { class: 'session-top' }, h('div', { class: 'topbar' },
      h('button', { class: 'icon-btn', 'aria-label': t('close'), onclick: () => { quizState = null; screen = null; render(); } }, html(SVG.close)),
      h('div', { class: 'segs' }, st.qs.map((x, i) => h('i', { class: i < st.i ? (st.wrong.includes(i) ? 'bad' : 'done') : i === st.i ? 'cur' : '' }))),
      h('span', { class: 'sub', style: 'font-weight:700' }, `${fmtNum(st.i + 1)}/${fmtNum(st.qs.length)}`))),
    h('div', { class: 'q-label' }, t(label)),
    q.type === 'surah' || q.type === 'word' ? null : h('p', { class: 'sub', style: 'margin:0 0 8px' }, `${surahLabel(q.s)} · ${fmtNum(q.s)}:${fmtNum(q.a)}`),
    quizPrompt(q),
    h('div', { class: 'choices' }, q.choices.map((c, k) => {
      let cls = 'choice';
      if (answered) cls += k === q.answer ? ' right' : k === st.picked ? ' wrong' : ' faded';
      return h('button', { class: cls, disabled: answered, onclick: () => pickAnswer(k) }, h('span', { class: 'letter' }, 'ABCD'[k]), choiceText(c, k));
    })),
    answered ? h('div', { class: 'q-feedback ' + (st.picked === q.answer ? 'ok' : 'ko') },
      h('b', null, st.picked === q.answer ? t('correct') : t('wrong_answer')),
      h('button', { class: 'link', style: 'background:none;border:0;padding:0', onclick: () => openMeaning(q.s, q.type === 'next' || q.type === 'prev' ? +q.target.split(':')[1] : q.a, null) }, t('see_tafsir'))) : null,
    answered ? h('div', { class: 'sticky' }, h('button', { class: 'btn primary block', onclick: () => { st.i++; st.picked = null; if (st.i >= st.qs.length) finishQuiz(); render(); window.scrollTo(0, 0); } }, st.i < st.qs.length - 1 ? t('next') : t('quiz_see_result'))) : null);
}
function pickAnswer(k) {
  const st = quizState, q = st.qs[st.i];
  if (st.picked != null) return;
  st.picked = k;
  if (k === q.answer) st.score++; else { st.wrong.push(st.i); try { navigator.vibrate && navigator.vibrate(60); } catch (e) {} }
  render();
}
function finishQuiz() {
  const st = quizState, d = today();
  S.quiz = { day: d, score: st.score, total: st.qs.length };
  S.quizLog = (S.quizLog || []).concat([{ day: d, score: st.score, total: st.qs.length }]).slice(-60);
  const pages = new Set(st.wrong.map(i => st.qs[i].page));
  pages.forEach(p => { const ps = S.pages[p]; if (ps && ps.status === 'manzil' && ps.last + P.interval(ps.S) > d + 1) reviewTomorrow(p); });
  if (kidId) { kid().earned = (kid().earned || 0) + st.score; }
  markActive(); save();
  Store.logEvent({ t: Date.now(), k: 'quiz', g: st.score, n: st.qs.length, d: Math.round((Date.now() - st.t0) / 1000), wrong: st.wrong.map(i => st.qs[i].key) });
}
function viewQuizResult() {
  const st = quizState, pct = st.score / st.qs.length;
  const msg = pct >= 0.9 ? t('quiz_great') : pct >= 0.6 ? t('quiz_good') : t('quiz_low');
  return h('div', { class: 'celebrate' },
    ring(pct, 150, 12, pct >= 0.6 ? 'var(--gold)' : 'var(--sabqi)', 'var(--empty)', h('div', null, h('b', { style: 'font-size:34px' }, `${fmtNum(st.score)}/${fmtNum(st.qs.length)}`))),
    h('h1', null, t('quiz_result')), h('p', { class: 'sub' }, msg),
    st.wrong.length ? h('div', { class: 'card', style: 'text-align:start' }, h('b', null, t('quiz_missed')),
      h('div', { class: 'list', style: 'margin-top:8px' }, st.wrong.map(i => { const q = st.qs[i]; return h('button', { class: 'li', onclick: () => openMeaning(q.s, q.a, null) },
        h('span', { class: 'av' }, '!'), h('div', null, h('b', null, `${surahLabel(q.s)} ${fmtNum(q.s)}:${fmtNum(q.a)}`), h('span', null, t({ next: 'q_next', prev: 'q_prev', word: 'q_word', surah: 'q_surah' }[q.type]))), h('span', { class: 'chev' }, '›')); })),
      h('p', { class: 'sub', style: 'font-size:13px;margin-top:10px' }, t('quiz_review_note'))) : null,
    h('button', { class: 'btn primary block', style: 'margin-top:18px', onclick: () => { quizState = null; screen = null; view = 'today'; render(); window.scrollTo(0, 0); } }, t('finish')));
}

// ================= motivation, badges, children mode, parent tracking =================

// ---------- motivation cards ----------
function motivationCard(pick, opts) {
  if (!pick) return null;
  opts = opts || {};
  const lang = getLang();
  const card = h('div', { class: 'motiv' + (opts.kid ? ' kid' : '') });
  if (pick.type === 'hadith') {
    const it = pick.item;
    card.append(h('div', { class: 'lbl' }, opts.label || t('reminder_of_day')));
    if (opts.kid && it.kid) card.append(h('p', { class: 'kid-line' }, it.kid[lang] || it.kid.fr));
    card.append(h('p', { class: 'ar', dir: 'rtl', lang: 'ar' }, '« ' + it.ar + ' »'));
    if (lang !== 'ar' && !(opts.kid && it.kid)) card.append(h('p', { class: 'tr' }, it[lang] || it.fr));
    card.append(h('div', { class: 'src' }, t('prophet_said') + ' · ' + (it.src[lang] || it.src.fr)));
  } else {
    const ix = ayahIndex()[pick.item.key]; if (!ix) return null;
    card.append(h('div', { class: 'lbl' }, opts.label || t('reminder_of_day')),
      h('p', { class: 'ar', dir: 'rtl', lang: 'ar' }, '﴿ ' + ix.text + ' ﴾'));
    const tr = h('p', { class: 'tr' }); card.append(tr);
    if (lang !== 'ar') loadMeaning(ix.page).then(M => { tr.textContent = (M[pick.item.key] || {})[lang] || ''; }).catch(() => {});
    card.append(h('div', { class: 'src' }, `${surahLabel(ix.s)} · ${fmtNum(ix.s)}:${fmtNum(ix.a)}`));
    card.style.cursor = 'pointer'; card.addEventListener('click', () => openMeaning(ix.s, ix.a, null));
  }
  return card;
}

// ---------- badges ----------
function progressStats(st) {
  st = st || S;
  const d = today(), mem = new Set(Object.keys(st.pages).filter(k => st.pages[k].status !== 'sabaq').map(Number));
  let surahs = 0;
  for (let s = 1; s <= 114; s++) { let all = true, any = false; Q.pages.forEach((pg, i) => { if (pg.some(x => x[0] === s)) { any = true; if (!mem.has(i + 1)) all = false; } }); if (any && all) surahs++; }
  let juz = 0; for (let j = 1; j <= 30; j++) { let all = true; for (let p = 1; p <= 604; p++) if (Q.juz[p - 1] === j && !mem.has(p)) { all = false; break; } if (all) juz++; }
  const reviews = Object.values(st.pages).reduce((a, ps) => a + (ps.reviews || 0), 0);
  return { pages: mem.size, surahs, juz, streak: P.streak(st.days || [], d), reviews, perfectQuiz: (st.quizLog || []).some(q => q.score === q.total && q.total >= 10) };
}
function badgeChip(b, on) { return h('div', { class: 'badge-chip' + (on ? ' on' : '') }, h('span', { class: 'bi' }, b.icon), h('span', { class: 'bn' }, t('badge_' + b.id))); }
function badgesGrid(st) {
  const got = new Set(earnedBadges(progressStats(st)));
  return h('div', { class: 'badges' }, BADGES.map(b => badgeChip(b, got.has(b.id))));
}
/** Badges earned since last time they were shown; marks them as seen. */
function takeNewBadges() {
  const got = earnedBadges(progressStats());
  const seen = new Set(S.badgesSeen || []);
  const fresh = got.filter(id => !seen.has(id));
  if (fresh.length) { S.badgesSeen = got; save(); }
  return fresh.map(id => BADGES.find(b => b.id === id));
}

// ---------- children ----------
const AVATARS = ['🦁', '🐢', '🐪', '🦉', '🐝', '🐬', '🦋', '🐼', '🌙', '⭐'];
let children = Store.loadChildrenLocal();
let kidId = null, mainS = null, unwatchChildren = null;
const kid = () => (kidId ? children[kidId] : null);
const sha = async s => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('sourah:' + s)))).map(b => b.toString(16).padStart(2, '0')).join('');
function pinHash() { return (mainS || S || {}).settings && (mainS || S).settings.pinHash || prefs.pinHash || null; }
function starsAvailable(c) { const spent = (c.rewards || []).filter(r => c.given && c.given[r.id]).reduce((a, r) => a + r.cost, 0); return Math.max(0, (c.earned || 0) - spent); }
function saveKid(fields) { const c = kid(); if (c) Store.saveChild(children, c, fields); }
function childToday(c) {
  const d = today(), st = c.state || {};
  return (st.days || []).includes(d);
}
function enterKid(id) {
  if (!children[id]) return;
  if (!kidId) mainS = S;
  kidId = id; prefs.kid = id; savePrefs();
  S = normalize(children[id].state || newState({ minutes: 10, pace: 0.25, direction: 'nas' }));
  applyPlan(children[id]);
  session = null; screen = null; view = 'today'; render(); window.scrollTo(0, 0);
}
function exitKid() {
  if (!kidId) return;
  saveKid(['state', 'earned']);
  S = mainS || normalize(Store.loadLocal()); mainS = null;
  kidId = null; prefs.kid = null; savePrefs();
  session = null; screen = null; view = 'today'; render(); window.scrollTo(0, 0);
}
/** The parent's plan changes (minutes, pace) are applied on the child's device. */
function applyPlan(c) { if (c && c.plan && S) { Object.assign(S.settings, c.plan); } }
function startWatchingChildren() {
  if (unwatchChildren) unwatchChildren();
  unwatchChildren = Store.watchChildren(remote => {
    let changed = false;
    for (const id in remote) {
      const r = remote[id], l = children[id];
      if (!l || (r.updatedAt || 0) > (l.updatedAt || 0) || JSON.stringify(r.given) !== JSON.stringify(l.given) || JSON.stringify(r.rewards) !== JSON.stringify(l.rewards) || JSON.stringify(r.plan) !== JSON.stringify(l.plan)) {
        // keep the state this device is currently writing for the active child
        const keepState = id === kidId && l && (l.updatedAt || 0) > (r.updatedAt || 0);
        children[id] = Object.assign({}, r, keepState ? { state: l.state, earned: l.earned, requests: l.requests } : {});
        changed = true;
      }
    }
    for (const id in children) if (!remote[id] && children[id].synced) { delete children[id]; changed = true; }
    Object.values(children).forEach(c => { if (remote[c.id]) c.synced = true; });
    if (!changed) return;
    Store.saveChildrenLocal(children);
    if (prefs.kid && !kidId && !session) resumeKid();
    if (kidId && children[kidId] && !session) { if ((children[kidId].updatedAt || 0) >= (S.updatedAt || 0)) S = normalize(children[kidId].state); applyPlan(children[kidId]); }
    if (!session && !screen && !document.querySelector('.sheet-bg') && !(document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName))) render();
  });
}

// ---------- PIN ----------
function askPin(title, onOk, setNew) {
  let close, val = '', first = null;
  const dots = h('div', { class: 'pin-dots' });
  const msg = h('p', { class: 'sub center' }, setNew ? t('pin_choose') : t('pin_enter'));
  const draw = () => { dots.innerHTML = ''; for (let i = 0; i < 4; i++) dots.append(h('i', { class: i < val.length ? 'on' : '' })); };
  const press = async k => {
    if (k === '⌫') { val = val.slice(0, -1); draw(); return; }
    if (val.length >= 4) return;
    val += k; draw();
    if (val.length < 4) return;
    if (setNew) {
      if (first == null) { first = val; val = ''; msg.textContent = t('pin_confirm'); setTimeout(draw, 150); return; }
      if (first !== val) { first = null; val = ''; msg.textContent = t('pin_mismatch'); setTimeout(draw, 150); return; }
      const hsh = await sha(val); close(); onOk(hsh); return;
    }
    const ok = (await sha(val)) === pinHash();
    if (ok) { close(); onOk(); } else { val = ''; msg.textContent = t('pin_wrong'); dots.classList.add('shake'); setTimeout(() => { dots.classList.remove('shake'); draw(); }, 300); }
  };
  draw();
  close = sheet(h('div', { class: 'pin' }, h('h2', { class: 'center', style: 'margin-top:4px' }, title), msg, dots,
    h('div', { class: 'pin-pad' }, ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map(k => k ? h('button', { onclick: () => press(k) }, k) : h('span')))));
}
function setParentPin(then) {
  askPin(t('pin_title_new'), hsh => {
    prefs.pinHash = hsh; savePrefs();
    const target = mainS || S; target.settings.pinHash = hsh;
    if (mainS) Store.save(mainS); else save();
    toast(t('pin_saved')); if (then) then();
  }, true);
}

// ---------- add / edit a child (parent) ----------
function openAddChild() {
  if (!pinHash()) return setParentPin(openAddChild);
  const f = { name: '', avatar: AVATARS[0], minutes: 10, pace: 0.25, known: new Set() };
  let close;
  const body = h('div');
  const draw = () => {
    body.innerHTML = '';
    let nameInput;
    body.append(
      h('div', { class: 'row spread' }, h('h2', { style: 'margin:0' }, t('add_child')), h('button', { class: 'icon-btn', onclick: () => close() }, html(SVG.close))),
      h('div', { class: 'field' }, h('label', null, t('child_name')), nameInput = h('input', { type: 'text', value: f.name, placeholder: t('name_ph'), oninput: e => { f.name = e.target.value; } })),
      h('div', { class: 'field' }, h('label', null, t('avatar')), h('div', { class: 'avatars' }, AVATARS.map(a => h('button', { class: 'av-pick' + (f.avatar === a ? ' on' : ''), onclick: () => { f.avatar = a; draw(); } }, a)))),
      h('div', { class: 'field' }, h('label', null, t('minutes_short')), h('div', { class: 'chips' }, [5, 10, 15, 20].map(v => h('button', { class: 'chip' + (f.minutes === v ? ' on' : ''), onclick: () => { f.minutes = v; draw(); } }, t('min', { n: fmtNum(v) }))))),
      h('div', { class: 'field' }, h('label', null, t('pace_short')), h('div', { class: 'chips' }, [[0.25, t('pace_q')], [0.5, t('pace_h')]].map(([v, l]) => h('button', { class: 'chip' + (f.pace === v ? ' on' : ''), onclick: () => { f.pace = v; draw(); } }, l)))),
      h('div', { class: 'field' }, h('label', null, t('known_label')), h('div', { class: 'juz-pick' }, [30, 29, 28, 27, 26, 1].map(j => h('button', { class: f.known.has(j) ? 'on' : '', onclick: () => { f.known.has(j) ? f.known.delete(j) : f.known.add(j); draw(); } }, fmtNum(j))))),
      h('button', { class: 'btn primary block', onclick: () => {
        if (!f.name.trim()) { toast(t('child_name_needed')); return; }
        const id = 'c' + Date.now().toString(36);
        const st = normalize(newState({ minutes: f.minutes, pace: f.pace, direction: 'nas', name: f.name.trim(), mode: 'oral' }));
        st.settings.repeat = 3;
        const known = []; for (let p = 1; p <= 604; p++) if (f.known.has(Q.juz[p - 1])) known.push(p);
        Object.assign(st.pages, P.seedKnownPages(known, today(), 14));
        const c = { id, name: f.name.trim(), avatar: f.avatar, createdAt: Date.now(), state: st, earned: 0, requests: {}, rewards: defaultRewards(), given: {}, plan: { minutes: f.minutes, pace: f.pace } };
        children[id] = c; Store.saveChild(children, c, Object.keys(c));
        close(); render(); toast(t('child_added', { name: c.name }));
      } }, t('add_child')));
  };
  draw();
  close = sheet(body);
}
function defaultRewards() { return [{ id: 'r1', title: t('reward_default_1'), cost: 20 }, { id: 'r2', title: t('reward_default_2'), cost: 50 }, { id: 'r3', title: t('reward_default_3'), cost: 120 }]; }

// ---------- parent: family card + child dashboard ----------
function familySection() {
  const list = Object.values(children);
  if (!list.length) return null;
  return h('div', null, h('h2', null, t('my_family')),
    h('div', { class: 'family' }, list.map(c => {
      const st = progressStats(c.state), req = Object.keys(c.requests || {}).filter(r => !(c.given || {})[r]).length;
      return h('button', { class: 'kid-card', onclick: () => openChildDashboard(c.id) },
        req ? h('i', { class: 'badge' }, String(req)) : null,
        h('span', { class: 'kid-av' }, c.avatar), h('b', null, c.name),
        h('span', { class: 'kid-st ' + (childToday(c) ? 'ok' : '') }, childToday(c) ? '✓ ' + t('done_today_short') : t('not_yet_today')),
        h('span', { class: 'sub', style: 'font-size:12px' }, `🔥 ${fmtNum(st.streak)} · ⭐ ${fmtNum(starsAvailable(c))} · ${fmtNum(st.pages)} p.`));
    })));
}
function openChildDashboard(id) {
  let close;
  const body = h('div');
  const draw = () => {
    const c = children[id]; if (!c) { close(); return; }
    const st = c.state || {}, stats = progressStats(st), d = today();
    const plan = P.buildSession(normalize(JSON.parse(JSON.stringify(st))), d);
    const days = new Set(st.days || []);
    const pending = (c.rewards || []).filter(r => (c.requests || {})[r.id] && !(c.given || {})[r.id]);
    let newTitle, newCost;
    body.innerHTML = '';
    body.append(
      h('div', { class: 'row spread' }, h('div', { class: 'row' }, h('span', { class: 'kid-av big' }, c.avatar), h('div', null, h('h2', { style: 'margin:0' }, c.name), h('span', { class: 'sub' }, childToday(c) ? '✓ ' + t('child_done_today') : t('child_not_today')))),
        h('button', { class: 'icon-btn', onclick: () => close() }, html(SVG.close))),
      pending.length ? h('div', { class: 'card', style: 'border-color:var(--gold)' }, h('b', null, t('reward_requests')), pending.map(r => h('div', { class: 'person' }, h('span', { class: 'av' }, '🎁'), h('b', null, `${r.title} · ${fmtNum(r.cost)} ⭐`),
        h('button', { class: 'btn primary', onclick: () => { c.given = Object.assign({}, c.given, { [r.id]: Date.now() }); Store.saveChild(children, c, ['given']); toast(t('reward_given')); draw(); } }, t('give_reward'))))) : null,
      h('div', { class: 'kpis' },
        h('div', { class: 'kpi' }, h('b', null, fmtNum(stats.pages)), h('span', null, t('pages_of'))),
        h('div', { class: 'kpi' }, h('b', null, fmtNum(stats.streak)), h('span', null, t('day_streak'))),
        h('div', { class: 'kpi' }, h('b', null, fmtNum(starsAvailable(c))), h('span', null, t('stars')))),
      h('h2', null, t('week_activity')),
      h('div', { class: 'week' }, Array.from({ length: 7 }, (_, i) => d - 6 + i).map(x => h('div', { class: 'd' }, h('div', { class: 'c' + (days.has(x) ? ' on' : '') + (x === d ? ' now' : '') }, days.has(x) ? html(SVG.check) : ''), new Date(x * 864e5).toLocaleDateString(locale(), { weekday: 'short', timeZone: 'UTC' })))),
      h('div', { class: 'card flat' }, h('dl', { class: 'kv', style: 'margin:0' },
        h('dt', null, t('current_sabaq')), h('dd', null, (() => { const np = plan.sabaq ? plan.sabaq.page : P.nextSabaqPage(st.pages || {}, (st.settings || {}).direction); return np ? t('page_n', { p: fmtNum(np) }) + ' · ' + surahsOnPage(np).map(surahLabel).join(listSep()) : '—'; })()),
        h('dt', null, t('today_load')), h('dd', null, t('min_left', { n: fmtNum(plan.minutes.total) })),
        h('dt', null, t('juz_done')), h('dd', null, fmtNum(stats.juz)),
        st.quiz ? [h('dt', null, t('last_quiz')), h('dd', null, `${fmtNum(st.quiz.score)}/${fmtNum(st.quiz.total)}`)] : null)),
      h('h2', null, t('badges_word')), badgesGrid(st),
      h('h2', null, t('rewards')),
      h('div', { class: 'list' }, (c.rewards || []).map(r => h('div', { class: 'li static' }, h('span', { class: 'av' }, (c.given || {})[r.id] ? '✓' : '🎁'),
        h('div', null, h('b', null, r.title), h('span', null, `${fmtNum(r.cost)} ⭐` + ((c.given || {})[r.id] ? ' · ' + t('given') : (c.requests || {})[r.id] ? ' · ' + t('requested') : ''))),
        h('button', { class: 'btn ghost danger', onclick: () => { c.rewards = c.rewards.filter(x => x.id !== r.id); Store.saveChild(children, c, ['rewards']); draw(); } }, '✕')))),
      h('div', { class: 'row', style: 'margin-top:8px' }, newTitle = h('input', { type: 'text', placeholder: t('reward_ph'), style: 'margin:0' }), newCost = h('input', { type: 'text', inputmode: 'numeric', placeholder: '⭐', style: 'margin:0;max-width:70px' }),
        h('button', { class: 'btn', onclick: () => { const cost = parseInt(newCost.value, 10); if (!newTitle.value.trim() || !(cost > 0)) return toast(t('reward_invalid')); c.rewards = (c.rewards || []).concat([{ id: 'r' + Date.now().toString(36), title: newTitle.value.trim(), cost }]); Store.saveChild(children, c, ['rewards']); draw(); } }, '+')),
      h('h2', null, t('plan')),
      h('div', { class: 'chips' }, [5, 10, 15, 20].map(v => h('button', { class: 'chip' + ((c.plan || {}).minutes === v ? ' on' : ''), onclick: () => { c.plan = Object.assign({}, c.plan, { minutes: v }); Store.saveChild(children, c, ['plan']); draw(); } }, t('min', { n: fmtNum(v) })))),
      h('div', { class: 'chips', style: 'margin-top:8px' }, [[0.25, t('pace_q')], [0.5, t('pace_h')], [1, t('pace_1')]].map(([v, l]) => h('button', { class: 'chip' + ((c.plan || {}).pace === v ? ' on' : ''), onclick: () => { c.plan = Object.assign({}, c.plan, { pace: v }); Store.saveChild(children, c, ['plan']); draw(); } }, l))),
      motivationCard(pickMotivation('parent', d), { label: t('for_parents') }),
      h('div', { class: 'actions' },
        h('button', { class: 'btn gold', onclick: () => { close(); enterKid(id); } }, t('open_kid_mode')),
        h('button', { class: 'btn ghost danger', onclick: () => { if (confirmText(t('delete_child_q', { name: c.name }))) { Store.deleteChild(children, id); close(); render(); } } }, t('delete'))));
  };
  draw();
  close = sheet(body);
}
function confirmText(msg) { try { return window.confirm(msg); } catch (e) { return true; } }

// ---------- child views ----------
function viewKidToday() {
  const c = kid(), d = today(), plan = P.buildSession(S, d);
  const todo = plan.sabqi.length + plan.manzil.length + (plan.sabaq ? 1 : 0);
  const stars = starsAvailable(c);
  const next = (c.rewards || []).filter(r => !(c.given || {})[r.id]).sort((a, b) => a.cost - b.cost)[0];
  const stats = progressStats();
  const wrap = h('div', { class: 'kid-today' },
    h('div', { class: 'hero kid' },
      h('div', { class: 'row spread' }, h('div', { class: 'streak' }, '⭐ ' + fmtNum(stars)), h('button', { class: 'lock', 'aria-label': t('parent_area'), onclick: () => askPin(t('parent_area'), exitKid) }, '🔒')),
      h('div', { class: 'kid-hello' }, h('span', { class: 'kid-av xl' }, c.avatar), h('div', null, h('div', { class: 'salam' }, 'ٱلسَّلَامُ عَلَيۡكُمۡ'), h('p', { class: 'hello' }, t('kid_hello', { name: c.name })))),
      todo ? h('button', { class: 'btn gold block kid-go', onclick: () => startSession(plan) }, t('kid_go'), h('small', null, t('min_left', { n: fmtNum(plan.minutes.total) })))
        : h('div', { class: 'kid-done' }, '🎉 ' + t('kid_done'))));
  wrap.append(h('div', { class: 'kid-steps' },
    h('div', { class: 'kstep' + (plan.sabqi.length + plan.manzil.length ? '' : ' ok') }, h('span', null, plan.sabqi.length + plan.manzil.length ? '🔁' : '✅'), h('b', null, t('kid_review')), h('small', null, plan.sabqi.length + plan.manzil.length ? t.n('pages', plan.sabqi.length + plan.manzil.length) : t('kid_ok'))),
    h('div', { class: 'kstep' + (plan.sabaq ? '' : ' ok') }, h('span', null, plan.sabaq ? '✨' : '✅'), h('b', null, t('kid_new')), h('small', null, plan.sabaq ? surahsOnPage(plan.sabaq.page).map(surahLabel).join(listSep()) : t('kid_ok')))));
  const qc = quizCard(d); if (qc) wrap.append(qc);
  if (next) {
    const req = (c.requests || {})[next.id];
    wrap.append(h('div', { class: 'card reward' }, h('div', { class: 'row spread' }, h('b', null, '🎁 ' + next.title), h('span', { class: 'sub' }, `${fmtNum(Math.min(stars, next.cost))}/${fmtNum(next.cost)} ⭐`)),
      h('div', { class: 'khatm' }, h('div', { class: 'bar' }, h('i', { style: `width:${Math.min(100, 100 * stars / next.cost)}%` }))),
      req ? h('p', { class: 'sub', style: 'margin:0' }, '⏳ ' + t('reward_waiting')) : stars >= next.cost ? h('button', { class: 'btn gold block', onclick: () => { c.requests = Object.assign({}, c.requests, { [next.id]: Date.now() }); saveKid(['requests']); toast(t('reward_asked')); render(); } }, t('ask_reward')) : h('p', { class: 'sub', style: 'margin:0' }, t('stars_to_go', { n: fmtNum(next.cost - stars) }))));
  }
  wrap.append(motivationCard(pickMotivation('kid', d), { kid: true, label: t('kid_hadith') }));
  const got = new Set(earnedBadges(stats));
  wrap.append(h('h2', null, t('my_badges')), h('div', { class: 'badges' }, BADGES.slice(0, 8).map(b => badgeChip(b, got.has(b.id)))));
  return wrap;
}
function viewKidStars() {
  const c = kid(), stars = starsAvailable(c);
  return h('div', null,
    h('div', { class: 'page-head center' }, h('div', { style: 'font-size:64px;line-height:1' }, '⭐'), h('h1', null, t('kid_stars_title', { n: fmtNum(stars) })), h('p', { class: 'sub' }, t('kid_stars_sub'))),
    h('h2', null, t('rewards')),
    h('div', { class: 'list' }, (c.rewards || []).map(r => { const given = (c.given || {})[r.id], req = (c.requests || {})[r.id]; return h('div', { class: 'li static' + (given ? '' : '') },
      h('span', { class: 'av' }, given ? '✅' : '🎁'), h('div', null, h('b', null, r.title), h('div', { class: 'khatm' }, h('div', { class: 'bar', style: 'margin:6px 0 0' }, h('i', { style: `width:${given ? 100 : Math.min(100, 100 * stars / r.cost)}%` })))),
      h('span', { class: 'sub' }, given ? t('given') : req ? '⏳' : `${fmtNum(r.cost)} ⭐`)); })),
    h('h2', null, t('my_badges')), badgesGrid(S));
}

function resumeKid() { if (prefs.kid && children[prefs.kid] && !kidId && S) { mainS = S; kidId = prefs.kid; S = normalize(children[kidId].state); applyPlan(children[kidId]); } }
function newBadgesCard() {
  const fresh = takeNewBadges();
  if (!fresh.length) return null;
  return h('div', { class: 'card new-badges' }, h('b', null, t('new_badge')), h('div', { class: 'badges' }, fresh.map(b => badgeChip(b, true))));
}
function viewKidTest(it) {
  const ayahs = itemAyahs(it), all = session.revealed >= ayahs.length;
  return h('div', null,
    h('p', { class: 'help kid-help' }, all ? t('kid_test_done') : t('kid_test_help')),
    renderPassage(ayahs, { hide: 'first', revealedUpTo: session.revealed, big: true, onMeaning: openMeaning }),
    h('div', { class: 'sticky' }, all
      ? h('button', { class: 'btn primary block', onclick: () => { session.step = 'grade'; render(); window.scrollTo(0, 0); } }, t('kid_finished'))
      : h('div', { class: 'actions' },
          h('button', { class: 'btn', onclick: () => { session.revealed = ayahs.length; render(); } }, t('reveal_all')),
          h('button', { class: 'btn primary', onclick: () => { session.revealed++; session.scrollTo = 'aya'; render(); } }, t('next_ayah')))));
}
function viewKidGrade(it) {
  return h('div', null,
    h('h2', { style: 'margin-top:12px;font-size:22px' }, t('kid_how')),
    h('p', { class: 'help' }, t('kid_grade_hint')),
    h('div', { class: 'kid-grades' },
      h('button', { class: 'kg g4', onclick: () => gradeItem(4) }, h('span', null, '⭐⭐⭐'), t('kid_g4')),
      h('button', { class: 'kg g3', onclick: () => gradeItem(3) }, h('span', null, '⭐⭐'), t('kid_g3')),
      h('button', { class: 'kg g2', onclick: () => gradeItem(2) }, h('span', null, '⭐'), t('kid_g2'))),
    h('button', { class: 'btn ghost block', onclick: () => gradeItem(1) }, t('kid_g1')),
    renderPassage(itemAyahs(it), { onMeaning: openMeaning }));
}
function viewKidSummary() {
  const res = session.summary, stars = session.stars || 0;
  return h('div', { class: 'celebrate kid' },
    h('div', { class: 'kid-stars-burst' }, '⭐'),
    h('h1', null, t('kid_bravo', { name: kid().name })),
    h('p', { class: 'big-stars' }, '+' + fmtNum(stars) + ' ⭐'),
    h('p', { class: 'sub' }, t('kid_total', { n: fmtNum(starsAvailable(kid())) })),
    newBadgesCard(),
    motivationCard(pickMotivation(res.some(r => r.grade <= 2) ? 'struggle' : 'kid', today()), { kid: true, label: t('kid_hadith') }),
    h('button', { class: 'btn gold block', style: 'margin-top:18px', onclick: () => { session = null; view = 'today'; render(); window.scrollTo(0, 0); } }, t('finish')));
}

// ---------------- boot ----------------
async function boot() {
  setLang(prefs.lang || detectLang());
  $app.innerHTML = `<div class="loading">${t('loading')}</div>`;
  try {
    const qp = fetch('quran.json').then(r => r.json());
    const sp = Store.init().catch(e => { console.warn('firebase init failed', e); Store.enabled = false; });
    Q = await qp;
    try { Q.mut = await fetch('mutashabihat.json').then(r => r.json()); } catch (e) { Q.mut = {}; }
    await Promise.race([sp, new Promise(r => setTimeout(r, 8000))]);
    Store.onChange(async user => { if (user) await afterSignIn(); else render(); });
    if (Store.user) return afterSignIn();
    S = normalize(Store.loadLocal());
    if (S && S.owner) { S = null; Store.saveLocal(null); } // a signed-out account's copy is not shown
    if (!S && Store.enabled && !prefs.skipWelcome) screen = 'welcome';
    resumeKid();
    render();
  } catch (e) {
    console.error(e);
    $app.innerHTML = `<div class="loading">${t('load_error')}</div>`;
  }
}
window.addEventListener('online', () => render());
window.addEventListener('offline', () => { if (!session) render(); });
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
boot();
