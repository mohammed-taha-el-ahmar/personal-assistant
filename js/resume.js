// Experience explorer: renders roles from docs/resume-bullets.json; each bullet asks the assistant.
import { DATA } from './config.js';
import { el, fetchJson } from './common.js';
import { ask, onBusyChange } from './chat.js';
import { t } from './i18n.js';

const VISIBLE_BULLETS = 3;

function bulletButton(text) {
  return el(
    'li',
    {},
    el(
      'button',
      {
        type: 'button',
        class: 'resume-bullet',
        onclick: () => explain(text),
      },
      el('span', { class: 'bullet-dot', 'aria-hidden': 'true' }),
      el('span', { class: 'bullet-text' }, text),
      el('span', { class: 'bullet-ask', 'aria-hidden': 'true' }, t('resume.ask')),
    ),
  );
}

function roleBlock(role, index) {
  const bullets = role.bullets ?? [];
  const list = el('ul', { class: 'resume-bullets', id: `role-${index}-bullets` });
  bullets.forEach((text, i) => {
    const item = bulletButton(text);
    if (i >= VISIBLE_BULLETS) item.hidden = true;
    list.append(item);
  });

  const extra = bullets.length - VISIBLE_BULLETS;
  const more =
    extra > 0
      ? el(
          'button',
          {
            type: 'button',
            class: 'resume-more',
            'aria-expanded': 'false',
            'aria-controls': list.id,
            onclick: (event) => {
              const btn = event.currentTarget;
              const open = btn.getAttribute('aria-expanded') === 'true';
              [...list.children].slice(VISIBLE_BULLETS).forEach((li) => (li.hidden = open));
              btn.setAttribute('aria-expanded', String(!open));
              btn.textContent = open ? t('resume.more', extra) : t('resume.less');
            },
          },
          t('resume.more', extra),
        )
      : null;

  return el(
    'article',
    { class: 'resume-role' },
    el('h3', { class: 'resume-role-title' }, role.title ?? ''),
    role.subtitle ? el('p', { class: 'resume-role-sub' }, role.subtitle) : null,
    list,
    more,
  );
}

function explain(text) {
  const question = t('chat.explain', text);
  const chat = document.getElementById('chat');
  // On the single-column layout the chat sits above; bring it into view.
  if (chat.getBoundingClientRect().top < 0) chat.scrollIntoView({ behavior: 'smooth', block: 'start' });
  ask(question);
}

export async function initResume() {
  const container = document.getElementById('resume-roles');
  const status = document.getElementById('resume-status');

  onBusyChange((busy) => {
    for (const btn of container.querySelectorAll('.resume-bullet')) btn.disabled = busy;
  });

  try {
    const data = await fetchJson(DATA.resume);
    if (!Array.isArray(data.roles)) throw new Error('Invalid format: missing roles array');
    status.remove();
    container.append(...data.roles.map(roleBlock));
  } catch (err) {
    console.error('Failed to load resume:', err);
    status.classList.add('is-error');
    status.textContent = t('resume.error');
  } finally {
    container.setAttribute('aria-busy', 'false');
  }
}
