// Chat widget: streaming answers, sources, copy/feedback, follow-up suggestions,
// job-description matching, session persistence and hand-off to a booking or an e-mail.
import { WORKER_URL, CHAT, EMAIL } from './config.js';
import { el, svgIcon, setCalNotes, calLink } from './common.js';
import { renderMarkdown } from './markdown.js';
import { t, lang } from './i18n.js';

const STORE_KEY = 'chat:v2';
const ICON = {
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  up: '<path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/><path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/>',
  down: '<path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z"/><path d="M17 2h3a2 2 0 012 2v7a2 2 0 01-2 2h-3"/>',
  doc: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
};

const $ = (id) => document.getElementById(id);
const listeners = new Set();
let busy = false;

/** Conversation state, persisted per browser tab (sessionStorage). */
const state = {
  messages: [], // { id, role: 'user'|'assistant', content, sources?, rating?, kind?: 'jd', error? }
  suggestions: null, // latest follow-up suggestions from the server
};

const uid = () => Math.random().toString(36).slice(2, 10);

function save() {
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    /* storage full or unavailable — the chat still works for this page view */
  }
}

function load() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORE_KEY) ?? 'null');
    if (saved && Array.isArray(saved.messages)) Object.assign(state, saved);
  } catch {
    /* ignore corrupt state */
  }
}

// ── Rendering ────────────────────────────────────────────────────────────────
function scrollToEnd() {
  const feed = $('messages');
  feed.scrollTop = feed.scrollHeight;
}

function iconButton(icon, label, onClick, extra = {}) {
  return el(
    'button',
    { type: 'button', class: 'msg-action', 'aria-label': label, title: label, onclick: onClick, ...extra },
    svgIcon(ICON[icon], { size: 14 }),
  );
}

function sourcesRow(sources) {
  if (!sources?.length) return null;
  return el(
    'div',
    { class: 'sources' },
    el('span', { class: 'sources-label' }, `${t('chat.sources')}:`),
    sources.map((s) =>
      s.href
        ? el('a', { class: 'source-chip', href: s.href, title: `${s.label} — ${s.title}` }, s.title)
        : el('span', { class: 'source-chip', title: s.label }, `${s.label} · ${s.title}`),
    ),
  );
}

function actionsRow(msg) {
  const copyBtn = iconButton('copy', t('chat.copy'), async () => {
    try {
      await navigator.clipboard.writeText(msg.content);
      copyBtn.replaceChildren(svgIcon(ICON.check, { size: 14 }));
      copyBtn.setAttribute('aria-label', t('chat.copied'));
      setTimeout(() => {
        copyBtn.replaceChildren(svgIcon(ICON.copy, { size: 14 }));
        copyBtn.setAttribute('aria-label', t('chat.copy'));
      }, 1500);
    } catch {
      /* clipboard blocked */
    }
  });

  const rate = (rating) => () => sendFeedback(msg, rating, row);
  const row = el(
    'div',
    { class: 'msg-actions' },
    copyBtn,
    iconButton('up', t('chat.up'), rate('up'), {
      'aria-pressed': String(msg.rating === 'up'),
      dataset: { rating: 'up' },
    }),
    iconButton('down', t('chat.down'), rate('down'), {
      'aria-pressed': String(msg.rating === 'down'),
      dataset: { rating: 'down' },
    }),
    msg.rating ? el('span', { class: 'msg-thanks' }, t('chat.thanks')) : null,
  );
  return row;
}

/** Point booking links inside an answer at the booking URL that carries the chat context. */
function upgradeCalLinks(bubble) {
  const base = calLink().split('?')[0];
  for (const a of bubble.querySelectorAll('a')) {
    if (a.href.startsWith(base)) {
      a.dataset.cal = '';
      a.href = calLink();
    }
  }
}

function renderMessage(msg) {
  const bubble = el('div', { class: 'bubble' });
  if (msg.role === 'assistant') {
    bubble.append(renderMarkdown(msg.content));
    upgradeCalLinks(bubble);
  } else if (msg.kind === 'jd') {
    bubble.append(svgIcon(ICON.doc, { size: 14, cls: 'jd-icon' }), document.createTextNode(` ${msg.content}`));
  } else {
    bubble.textContent = msg.content;
  }

  const wrap = el(
    'div',
    { class: `msg ${msg.role === 'assistant' ? 'bot' : 'user'}${msg.error ? ' error' : ''}`, id: `msg-${msg.id}` },
    bubble,
  );
  if (msg.role === 'assistant' && !msg.error) {
    wrap.append(sourcesRow(msg.sources) ?? '', actionsRow(msg));
  }
  return wrap;
}

function renderSuggestions() {
  const box = $('suggestions');
  const list = state.suggestions ?? [t('sugg.1'), t('sugg.2'), t('sugg.3'), t('sugg.4')];
  box.replaceChildren(
    ...list.map((q) => el('button', { type: 'button', class: 'sugg' }, q)),
    el(
      'button',
      { type: 'button', class: 'sugg sugg-jd', dataset: { action: 'jd' } },
      svgIcon(ICON.doc, { size: 13 }),
      t('sugg.jd'),
    ),
  );
  box.hidden = busy || list.length === 0;
}

function renderHandoff() {
  const exchanges = state.messages.filter((m) => m.role === 'assistant' && !m.error).length;
  $('chat-tools').hidden = state.messages.length === 0;
  const existing = $('handoff');
  if (exchanges < 2) {
    existing?.remove();
    return;
  }
  if (existing) return;
  $('messages').append(
    el(
      'div',
      { class: 'handoff', id: 'handoff' },
      el('p', {}, t('chat.handoff')),
      el(
        'a',
        { class: 'btn btn-primary btn-sm', href: calLink(), 'data-cal': '', target: '_blank', rel: 'noopener' },
        svgIcon(ICON.calendar, { size: 14 }),
        t('chat.handoffBtn'),
      ),
    ),
  );
}

function renderAll() {
  const feed = $('messages');
  feed.querySelectorAll('.msg:not(.greeting), .handoff').forEach((n) => n.remove());
  for (const msg of state.messages) feed.append(renderMessage(msg));
  renderSuggestions();
  updateHandoffLinks();
  renderHandoff();
  scrollToEnd();
}

// ── Hand-off: booking notes + e-mail transcript ─────────────────────────────
function updateHandoffLinks() {
  const questions = state.messages
    .filter((m) => m.role === 'user' && m.kind !== 'jd')
    .map((m) => `- ${m.content.slice(0, 120)}`);
  const sharedJd = state.messages.some((m) => m.kind === 'jd');
  const notes =
    questions.length || sharedJd
      ? [t('cal.notes'), ...questions.slice(-6), sharedJd ? t('cal.jd') : ''].filter(Boolean).join('\n')
      : '';
  setCalNotes(notes.slice(0, 700));

  const transcript = state.messages
    .filter((m) => !m.error)
    .map((m) => `${m.role === 'user' ? t('email.you') : t('email.bot')}: ${m.content}`)
    .join('\n\n');
  const body = `${t('email.intro')}${transcript}`.slice(0, 1800);
  $('chat-email').href =
    `mailto:${EMAIL}?subject=${encodeURIComponent(t('email.subject'))}&body=${encodeURIComponent(body)}`;
}

// ── Busy state ──────────────────────────────────────────────────────────────
function setBusy(value) {
  busy = value;
  $('send-btn').disabled = value;
  $('jd-submit').disabled = value;
  $('messages').setAttribute('aria-busy', String(value));
  $('suggestions').hidden = value || $('suggestions').childElementCount === 0;
  if (value) {
    $('messages').append(
      el(
        'div',
        { class: 'msg bot', id: 'typing' },
        el(
          'div',
          { class: 'typing-dots', role: 'status', 'aria-label': t('chat.typing') },
          el('span'),
          el('span'),
          el('span'),
        ),
      ),
    );
    scrollToEnd();
  } else {
    $('typing')?.remove();
  }
  for (const fn of listeners) fn(value);
}

function errorMessage(status) {
  if (status === 429) return t('chat.error429');
  if (status === 403) return t('chat.error403');
  if (status >= 500) return t('chat.error5xx');
  return t('chat.errorGeneric');
}

// ── Networking ──────────────────────────────────────────────────────────────
async function* readSse(res) {
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    let sep;
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const event = /^event: (.*)$/m.exec(block)?.[1] ?? 'message';
      const data = /^data: (.*)$/m.exec(block)?.[1];
      if (data) yield { event, data: JSON.parse(data) };
    }
  }
}

function historyForServer() {
  return state.messages
    .filter((m) => !m.error)
    .slice(-CHAT.maxHistory)
    .map((m) => ({ role: m.role, content: m.content }));
}

/**
 * Sends the conversation (or a job description) and streams the answer into a new bubble.
 * Returns true on success.
 */
async function request(payload) {
  setBusy(true);
  const msg = { id: uid(), role: 'assistant', content: '', sources: [] };
  let node = null;
  let frame = 0;
  const paint = () => {
    frame = 0;
    const fresh = renderMessage({ ...msg, sources: [], streaming: true });
    fresh.querySelector('.msg-actions')?.remove();
    if (node) node.replaceWith(fresh);
    else {
      $('typing')?.remove();
      $('messages').append(fresh);
    }
    node = fresh;
    scrollToEnd();
  };

  try {
    const res = await fetch(`${WORKER_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify({ ...payload, lang, stream: true }),
    });
    const type = res.headers.get('content-type') ?? '';

    if (!res.ok || !type.includes('text/event-stream')) {
      const data = type.includes('application/json') ? await res.json().catch(() => null) : null;
      if (res.ok && data?.content) {
        msg.content = data.content[0]?.text ?? '';
        msg.sources = data.sources ?? [];
        state.suggestions = data.suggestions ?? state.suggestions;
      } else {
        throw Object.assign(new Error('http'), { status: res.status, serverMessage: data?.error?.message });
      }
    } else {
      for await (const { event, data } of readSse(res)) {
        if (event === 'meta') {
          msg.sources = data.sources ?? [];
          if (data.suggestions?.length) state.suggestions = data.suggestions;
        } else if (event === 'delta') {
          msg.content += data.t;
          if (!frame) frame = requestAnimationFrame(paint);
        } else if (event === 'error') {
          throw Object.assign(new Error('stream'), { status: 502, serverMessage: data.message, partial: true });
        }
      }
    }
    if (frame) cancelAnimationFrame(frame);
    msg.content = msg.content.trim() || t('chat.empty');
    state.messages.push(msg);
    return true;
  } catch (err) {
    if (frame) cancelAnimationFrame(frame);
    const text = err.serverMessage || (err.status ? errorMessage(err.status) : t('chat.errorNetwork'));
    if (msg.content && err.partial) state.messages.push({ ...msg, content: `${msg.content.trim()}…` });
    state.messages.push({ id: uid(), role: 'assistant', content: text, error: true });
    return false;
  } finally {
    node?.remove();
    setBusy(false);
    save();
    renderAll();
    $('chat-input').focus({ preventScroll: true });
  }
}

// ── Public API ──────────────────────────────────────────────────────────────
/** Ask a question. Ignored while an answer is in flight. */
export async function ask(text) {
  const question = text.trim().slice(0, CHAT.maxInputChars);
  if (!question || busy) return false;
  // Drop a trailing error so the retry replaces it.
  while (state.messages.at(-1)?.error) state.messages.pop();
  state.messages.push({ id: uid(), role: 'user', content: question });
  state.suggestions = state.suggestions ?? null;
  save();
  renderAll();
  return request({ messages: historyForServer() });
}

async function matchJobDescription(jd) {
  if (busy) return false;
  const words = jd.split(/\s+/).filter(Boolean).length;
  state.messages.push({ id: uid(), role: 'user', content: t('jd.userMsg', words), kind: 'jd' });
  save();
  renderAll();
  // `messages` is ignored by the current worker in JD mode; it keeps older deployments answering.
  return request({
    mode: 'jd',
    jd,
    messages: [{ role: 'user', content: `Job description:\n${jd}\n\nHow well does he fit this role?` }],
  });
}

function sendFeedback(msg, rating, row) {
  if (msg.rating) return;
  msg.rating = rating;
  save();
  for (const b of row.querySelectorAll('[data-rating]')) {
    b.setAttribute('aria-pressed', String(b.dataset.rating === rating));
    b.disabled = true;
  }
  row.append(el('span', { class: 'msg-thanks' }, t('chat.thanks')));
  const idx = state.messages.indexOf(msg);
  const question = state.messages
    .slice(0, idx)
    .reverse()
    .find((m) => m.role === 'user');
  fetch(`${WORKER_URL}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: msg.id,
      rating,
      question: question?.kind === 'jd' ? '[job description]' : (question?.content ?? ''),
    }),
    keepalive: true,
  }).catch(() => {});
}

function resetConversation() {
  state.messages = [];
  state.suggestions = null;
  save();
  renderAll();
  closeJdPanel();
  $('chat-input').focus();
}

/** Subscribe to busy-state changes (used to disable resume bullets while loading). */
export function onBusyChange(fn) {
  listeners.add(fn);
}

// ── Job-description panel ───────────────────────────────────────────────────
function openJdPanel() {
  $('chat-form').hidden = true;
  $('jd-form').hidden = false;
  $('jd-error').hidden = true;
  $('jd-text').focus();
}

function closeJdPanel() {
  $('jd-form').hidden = true;
  $('chat-form').hidden = false;
}

export function initChat() {
  load();
  renderAll();

  $('chat-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const input = $('chat-input');
    if (busy || !input.value.trim()) return;
    const value = input.value;
    input.value = '';
    ask(value);
  });

  $('suggestions').addEventListener('click', (event) => {
    const btn = event.target.closest('.sugg');
    if (!btn) return;
    if (btn.dataset.action === 'jd') openJdPanel();
    else ask(btn.textContent);
  });

  $('jd-open').addEventListener('click', openJdPanel);
  $('jd-cancel').addEventListener('click', () => {
    closeJdPanel();
    $('chat-input').focus();
  });
  $('jd-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const jd = $('jd-text').value.trim();
    if (jd.length < 40) {
      $('jd-error').textContent = t('jd.tooShort');
      $('jd-error').hidden = false;
      return;
    }
    closeJdPanel();
    $('jd-text').value = '';
    await matchJobDescription(jd);
  });
  $('jd-text').addEventListener('input', () => {
    $('jd-error').hidden = true;
  });
  $('jd-form').addEventListener('keydown', (event) => {
    if (event.key === 'Escape') $('jd-cancel').click();
  });

  $('chat-new').addEventListener('click', resetConversation);

  // Deep link from the Projects page: index.html?ask=<question>
  const params = new URLSearchParams(window.location.search);
  const preset = params.get('ask');
  if (preset) {
    params.delete('ask');
    const qs = params.toString();
    window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash);
    $('chat').scrollIntoView({ block: 'start' });
    ask(preset);
  }
}
