// ─────────────────────────────────────────────
// ✏️  CONFIGURATION — edit these two lines only
// ─────────────────────────────────────────────
const WORKER_URL = 'https://recruiter-proxy.med-taha-elahmar.workers.dev'; // from Cloudflare dashboard
const CAL_LINK   = 'https://cal.eu/mohammed-taha-el-ahmar';             // your Cal.com or Calendly URL
const RESUME_BULLETS_URL = 'https://raw.githubusercontent.com/mohammed-taha-el-ahmar/personal-assistant/main/docs/resume-bullets.json'; // resume content source
// ─────────────────────────────────────────────

document.querySelector('.book-btn').href = CAL_LINK;

const history = [];
let loading = false;

function now() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Safely render text with clickable URLs (no XSS risk)
function renderText(text, bubble) {
  const URL_RE = /https?:\/\/[^\s<>"'\)]+/g;
  let last = 0, match;
  while ((match = URL_RE.exec(text)) !== null) {
    if (match.index > last) {
      bubble.appendChild(document.createTextNode(text.slice(last, match.index)));
    }
    const a = document.createElement('a');
    a.href = match[0];
    a.textContent = match[0];
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    bubble.appendChild(a);
    last = URL_RE.lastIndex;
  }
  if (last < text.length) {
    bubble.appendChild(document.createTextNode(text.slice(last)));
  }
}

function addMessage(role, text) {
  const feed = document.getElementById('messages');
  const wrap = document.createElement('div');
  wrap.className = 'msg ' + role;
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  if (role === 'bot') {
    renderText(text, bubble);
  } else {
    bubble.textContent = text;
  }
  const time = document.createElement('div');
  time.className = 'msg-time';
  time.textContent = now();
  wrap.appendChild(bubble);
  wrap.appendChild(time);
  feed.appendChild(wrap);
  feed.scrollTop = feed.scrollHeight;
}

function showTyping() {
  const feed = document.getElementById('messages');
  const wrap = document.createElement('div');
  wrap.id = 'typing';
  wrap.className = 'msg bot';
  wrap.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
  feed.appendChild(wrap);
  feed.scrollTop = feed.scrollHeight;
}

function removeTyping() {
  const t = document.getElementById('typing');
  if (t) t.remove();
}

// ── Resume explorer ────────────────────────────────────────────────────────
let resumeLoaded = false;

function toggleResume() {
  const body   = document.getElementById('resume-body');
  const header = document.getElementById('resume-toggle');
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
  header.setAttribute('aria-expanded', String(!isOpen));

  if (!isOpen && !resumeLoaded) {
    loadResumeBullets();
  }
}

async function loadResumeBullets() {
  const loadingEl = document.getElementById('resume-loading');
  const rolesEl   = document.getElementById('resume-roles');

  try {
    const res = await fetch(RESUME_BULLETS_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();

    if (!Array.isArray(data.roles)) throw new Error('Invalid format: missing roles array');

    rolesEl.innerHTML = '';
    for (const role of data.roles) {
      const roleDiv = document.createElement('div');
      roleDiv.className = 'resume-role';

      const titleDiv = document.createElement('div');
      titleDiv.className = 'resume-role-title';
      titleDiv.textContent = role.title ?? '';
      roleDiv.appendChild(titleDiv);

      if (role.subtitle) {
        const subDiv = document.createElement('div');
        subDiv.className = 'resume-role-sub';
        subDiv.textContent = role.subtitle;
        roleDiv.appendChild(subDiv);
      }

      const bulletsDiv = document.createElement('div');
      bulletsDiv.className = 'resume-bullets';

      for (const bulletText of (role.bullets ?? [])) {
        const btn = document.createElement('button');
        btn.className = 'resume-bullet';
        btn.onclick = () => explainBullet(btn);

        const dot = document.createElement('span');
        dot.className = 'bullet-dot';
        dot.setAttribute('aria-hidden', 'true');

        const textSpan = document.createElement('span');
        textSpan.className = 'bullet-text';
        textSpan.textContent = bulletText;

        const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        icon.setAttribute('class', 'bullet-icon');
        icon.setAttribute('width', '15');
        icon.setAttribute('height', '15');
        icon.setAttribute('fill', 'none');
        icon.setAttribute('stroke', 'currentColor');
        icon.setAttribute('stroke-width', '2');
        icon.setAttribute('viewBox', '0 0 24 24');
        icon.setAttribute('aria-hidden', 'true');
        icon.innerHTML = '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>';

        btn.appendChild(dot);
        btn.appendChild(textSpan);
        btn.appendChild(icon);
        bulletsDiv.appendChild(btn);
      }

      roleDiv.appendChild(bulletsDiv);
      rolesEl.appendChild(roleDiv);
    }

    loadingEl.style.display = 'none';
    resumeLoaded = true;
  } catch (err) {
    console.error('Failed to load resume bullets:', err);
    loadingEl.className = 'resume-error';
    loadingEl.textContent = 'Could not load resume details. You can still ask questions in the chat below.';
  }
}

function explainBullet(btn) {
  const text = btn.querySelector('.bullet-text').textContent.trim();
  const question = `Tell me more about this: "${text}" — what was the real challenge, the approach taken, and the impact?`;
  hideSuggestions();

  // Scroll chat into view so the user sees the response
  document.querySelector('.chat-card').scrollIntoView({ behavior: 'smooth', block: 'start' });

  doSend(question);
}

function hideSuggestions() {
  const s = document.getElementById('suggestions');
  if (s) s.style.display = 'none';
}

function sendSuggestion(btn) {
  hideSuggestions();
  doSend(btn.textContent.trim());
}

function sendMessage() {
  const inp = document.getElementById('chat-input');
  const text = inp.value.trim();
  if (!text || loading) return;
  inp.value = '';
  hideSuggestions();
  doSend(text);
}

async function doSend(text) {
  loading = true;
  document.getElementById('send-btn').disabled = true;
  addMessage('user', text);
  history.push({ role: 'user', content: text });
  showTyping();

  try {
    const res = await fetch(WORKER_URL + '/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: history
      })
    });

    const data = await res.json();
    removeTyping();

    if (data.error) {
      addMessage('bot', '⚠️ ' + (data.error.message || 'API error. Check your API key.'));
    } else {
      const reply = data.content?.[0]?.text ?? 'Sorry, I couldn\'t get a response.';
      addMessage('bot', reply);
      history.push({ role: 'assistant', content: reply });
    }
  } catch (err) {
    removeTyping();
    addMessage('bot', '⚠️ Network error. Please try again.');
  }

  loading = false;
  document.getElementById('send-btn').disabled = false;
  document.getElementById('chat-input').focus();
}