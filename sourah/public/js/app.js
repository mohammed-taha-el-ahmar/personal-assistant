import { t, setLang, getLang, detectLang, fmtNum, locale, listSep, LANGS } from './i18n.js';
import { Store } from './store.js';
import { Player } from './audio.js';
import { RECITERS, PRIVACY_URL } from './config.js';

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
function save() { Store.save(S); }
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
    text.split(' ').forEach(w => {
      if (!isWord(w)) { ay.append(h('span', { class: 'deco' }, w), ' '); return; }
      const i = idx++;
      let hide = revealed ? 'visible' : (o.hide || 'hidden');
      if (o.ok && o.ok.has(i)) hide = 'visible';
      if (o.errors && o.errors.has(i) && o.mode === 'letter') hide = 'visible';
      const c = ['w'];
      if (o.errors && o.errors.has(i)) c.push('err'); else if (o.ok && o.ok.has(i)) c.push('ok');
      if (o.cur === i) c.push('cur');
      if (o.onWord && revealed) c.push('tap');
      let el;
      if (hide === 'visible') el = h('span', { class: c.join(' ') }, w);
      else if (hide === 'first') { const [f, r] = splitFirst(w); c.push('veil'); el = h('span', { class: c.join(' ') }, h('span', { class: 'fl' }, f + (r ? '‍' : '')), (r ? '‍' : '') + r); }
      else { c.push('veil'); el = h('span', { class: c.join(' ') }, w); }
      if (o.onWord && revealed) el.addEventListener('click', () => o.onWord(i, ai));
      ay.append(el, ' ');
    });
    const end = h('span', { class: 'aya-end' }, arNum(a));
    if (o.onAyahEnd) { end.style.cursor = 'pointer'; end.addEventListener('click', () => o.onAyahEnd(ai)); }
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
  document.querySelectorAll('.nav button').forEach(b => { b.classList.toggle('on', b.dataset.go === view); b.querySelector('span').textContent = t(b.dataset.go); });
  document.title = t('app_name');
  $app.innerHTML = '';
  if (screen === 'welcome') return $app.append(viewWelcome());
  if (screen === 'auth') return $app.append(viewAuth());
  if (screen === 'consent') return $app.append(viewConsent());
  if (!S) return $app.append(viewOnboarding());
  if (session) {
    $app.append(viewSession());
    const target = session.scrollTo === 'cur' ? $app.querySelector('.w.cur') : session.scrollTo ? $app.querySelector('.aya.new') : null;
    if (target) target.scrollIntoView({ block: 'start', behavior: 'smooth' });
    session.scrollTo = null;
    return;
  }
  const v = view === 'planning' ? viewPlanning() : view === 'map' ? viewMap() : view === 'settings' ? viewSettings() : viewToday();
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
    h('label', { class: 'check' }, consentBox = h('input', { type: 'checkbox', checked: sessionStorage.getItem('hifz-consent') === '1' }),
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
  const doneRev = pagesState.filter(ps => ps.last === d && ps.status !== 'sabaq' && !(ps.memorized === d && !ps.seeded)).length;
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

  const [vs, va, vt] = verseOfDay(d);
  wrap.append(h('div', { class: 'verse' }, h('div', { class: 'lbl' }, t('verse_of_day')),
    h('div', { class: 'ar' }, vt + ' ', h('span', { class: 'aya-end' }, arNum(va))),
    h('div', { class: 'ref' }, `${surahLabel(vs)} · ${fmtNum(vs)}:${fmtNum(va)}`)));

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
      h('div', { class: 'kpi' }, h('b', null, fmtNum(streak)), h('span', null, t('day_streak'))))));
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
function resetTest() { const it = curItem(); session.revealed = 0; session.errors = new Set(); session.ok = new Set(); session.forgot = new Set(); session.cursor = 0; session.learnHide = 'visible'; session.words = passageWords(itemAyahs(it)); }
function endSession() { stopAudio(); session = { summary: session.results, items: [], i: 0 }; }
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
    h('ol', { class: 'steps' }, h('li', null, t('learn_1')), h('li', null, t('learn_2')), h('li', null, t('learn_3')), prev.length ? h('li', null, t('learn_4')) : null),
    h('div', { class: 'seg', style: 'margin:10px 0' }, [['visible', t('hide_text')], ['first', t('hide_first')], ['hidden', t('hide_hidden')]].map(([v, l]) =>
      h('button', { class: session.learnHide === v ? 'on' : '', onclick: () => { session.learnHide = v; render(); } }, l))),
    renderPassage(passage, { hide: session.learnHide, revealedUpTo: session.learnHide === 'visible' ? null : 0, dimAyahs: new Set(prev.length ? [0] : []), big: true, playable: true }),
    h('div', { class: 'sticky' }, h('button', { class: 'btn primary block', onclick: () => { stopAudio(); session.step = 'test'; resetTest(); render(); window.scrollTo(0, 0); } }, t('ready'))));
}
function viewOralTest(it) {
  const ayahs = itemAyahs(it), all = session.revealed >= ayahs.length, hide = S.settings.hide || 'first';
  return h('div', null, modeSwitch(),
    h('p', { class: 'help' }, all ? t('oral_help_marked') : t('oral_help')),
    h('div', { class: 'seg', style: 'margin:0 0 10px' }, [['first', t('hint_first')], ['hidden', t('hint_hidden')]].map(([v, l]) =>
      h('button', { class: hide === v ? 'on' : '', onclick: () => { S.settings.hide = v; save(); render(); } }, l))),
    renderPassage(ayahs, {
      hide, revealedUpTo: session.revealed, errors: session.errors, forgot: session.forgot, big: true,
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
  const sug = P.gradeFromErrors(session.errors.size, session.words, session.forgot.size > 0);
  const icons = { 1: '↺', 2: '〰', 3: '✓', 4: '★' };
  return h('div', null,
    h('h2', { style: 'margin-top:12px' }, t('how_was_it')),
    h('p', { class: 'help' }, t('proposed', { e: t.n('errors', session.errors.size) })),
    h('div', { class: 'grades' }, [4, 3, 2, 1].map(g => h('button', { class: `grade g${g}` + (g === sug ? ' sug' : ''), onclick: () => gradeItem(g) },
      h('span', { class: 'gi' }, icons[g]), h('div', null, h('b', null, t('g' + g)), h('span', null, t('g' + g + 'd')))))),
    h('div', { class: 'actions' }, h('button', { class: 'btn ghost', onclick: () => { session.step = 'test'; resetTest(); render(); } }, t('retry'))),
    playerBar(itemAyahs(it), `grade-${it.page}-${it.part}`),
    renderPassage(itemAyahs(it), { errors: session.errors, forgot: session.forgot, playable: true }));
}

function gradeItem(g) {
  const it = curItem(), d = today(), secs = Math.round((Date.now() - session.t0) / 1000);
  const before = S.pages[it.page], Rb = P.pageR(before, d);
  if (it.kind === 'sabaq') { S.pages[it.page] = P.applySabaq(before, g, d, it.parts); recordDuration('sabaq', secs); }
  else { S.pages[it.page] = P.applyReview(before, g, d); recordDuration(it.kind, secs); }
  markActive(); save();
  Store.logEvent({ t: Date.now(), p: it.page, k: it.kind, g, d: secs, e: session.errors.size, w: session.words, m: session.mode, r: Rb == null ? null : Math.round(Rb * 1000) / 1000, part: it.part == null ? null : it.part });
  session.results.push({ ...it, grade: g, errors: session.errors.size, secs, after: S.pages[it.page] });
  if (it.kind === 'sabaq' && g < 3) toast(t('redo_tomorrow'));
  session.i++;
  if (session.i >= session.items.length) endSession(); else beginItem();
  render(); window.scrollTo(0, 0);
}
function viewSummary() {
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
    h('div', { class: 'legend', style: 'margin:6px 0 14px' },
      [['var(--good)', 'solid'], ['var(--warn)', 'watch'], ['var(--bad)', 'weak'], ['var(--sabqi)', 'in_progress']].map(([c, k]) => h('span', null, h('i', { style: `background:${c}` }), t(k)))),
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
    playerBar(Q.pages[p - 1], 'sheet-' + p),
    renderPassage(Q.pages[p - 1], { playable: true }));
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
      h('button', { class: 'btn', onclick: async () => { await Store.signOut(); S = null; screen = 'welcome'; render(); } }, t('sign_out')),
      h('button', { class: 'btn ghost', style: 'color:var(--bad)', onclick: confirmDeleteAccount }, t('delete_account'))));
}
function confirmDeleteAccount() {
  let close;
  close = sheet(h('div', null, h('h2', { style: 'margin-top:0' }, t('delete_title')), h('p', { class: 'sub' }, t('delete_body')),
    h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => close() }, t('cancel')),
      h('button', { class: 'btn primary', style: 'background:var(--bad);border-color:var(--bad)', onclick: async () => {
        close();
        try { await Store.deleteAccount(); S = null; screen = 'welcome'; toast(t('deleted')); render(); }
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

// ---------------- boot ----------------
async function boot() {
  setLang(prefs.lang || detectLang());
  $app.innerHTML = `<div class="loading">${t('loading')}</div>`;
  try {
    const qp = fetch('quran.json').then(r => r.json());
    const sp = Store.init().catch(e => { console.warn('firebase init failed', e); Store.enabled = false; });
    Q = await qp;
    await Promise.race([sp, new Promise(r => setTimeout(r, 8000))]);
    Store.onChange(async user => { if (user) await afterSignIn(); else render(); });
    if (Store.user) return afterSignIn();
    S = normalize(Store.loadLocal());
    if (S && S.owner) { S = null; Store.saveLocal(null); } // a signed-out account's copy is not shown
    if (!S && Store.enabled && !prefs.skipWelcome) screen = 'welcome';
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
