// Projects page: loads docs/projects.json, renders a filterable card grid with deep links (#project-id).
import { DATA } from './config.js';
import { el, svgIcon, fetchJson, initPage } from './common.js';
import { ICONS, PROJECT_ICONS } from './icons.js';
import { t } from './i18n.js';

const STATUS = {
  live: { label: t('status.live'), cls: 'status-live' },
  complete: { label: t('status.complete'), cls: 'status-live' },
  in_progress: { label: t('status.in_progress'), cls: 'status-progress' },
  planned: { label: t('status.planned'), cls: 'status-planned' },
};

// Filter chips → a project matches when any of its tags is in the list.
const CATEGORIES = [
  { id: 'all', label: t('filter.all') },
  {
    id: 'genai',
    label: t('filter.genai'),
    tags: [
      'LLM',
      'RAG',
      'Multi-Agent',
      'Agentic AI',
      'Tool-Calling Agent',
      'Tool Calling',
      'Azure OpenAI',
      'AWS Bedrock',
      'Groq',
      'LLM-as-Judge',
    ],
  },
  {
    id: 'streaming',
    label: t('filter.streaming'),
    tags: ['Kafka', 'Kinesis', 'Real-Time', 'Spark Structured Streaming', 'Event Hubs', 'Stream Analytics'],
  },
  { id: 'mlops', label: t('filter.mlops'), tags: ['MLOps', 'MLflow', 'Azure ML', 'LightGBM', 'Real-Time ML'] },
  {
    id: 'orchestration',
    label: t('filter.orchestration'),
    tags: ['Airflow', 'Apache Airflow', 'dbt', 'Data Factory', 'Kubernetes'],
  },
  { id: 'aws', label: 'AWS', tags: ['AWS'] },
  { id: 'azure', label: 'Azure', tags: ['Azure'] },
  { id: 'gcp', label: 'GCP', tags: ['GCP'] },
];

const state = { query: '', category: 'all' };
const $ = (id) => document.getElementById(id);

// ── Architecture string → flow of steps ─────────────────────────────────────
// "A → B [x | y] → C | D → E" becomes rows of steps; brackets are kept intact.
function splitTopLevel(text, sep) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '[' || ch === '(') depth++;
    else if (ch === ']' || ch === ')') depth = Math.max(0, depth - 1);
    else if (depth === 0 && text.startsWith(sep, i)) {
      parts.push(text.slice(start, i));
      start = i + sep.length;
      i += sep.length - 1;
    }
  }
  parts.push(text.slice(start));
  return parts.map((p) => p.trim()).filter(Boolean);
}

function architectureFlow(text) {
  const wrap = el('div', { class: 'flow' });
  for (const row of splitTopLevel(text, ' | ')) {
    const line = el('ol', { class: 'flow-row' });
    for (const step of splitTopLevel(row, '→')) line.append(el('li', { class: 'flow-step' }, step));
    wrap.append(line);
  }
  return wrap;
}

// ── Card ────────────────────────────────────────────────────────────────────
function mediaBlock(project) {
  const { media } = project;
  if (!media?.url) return null;
  let node;
  if (media.type === 'image' || media.type === 'gif') {
    node = el('img', { src: media.url, alt: `${project.title} — demo screenshot`, loading: 'lazy', decoding: 'async' });
  } else if (media.type === 'video') {
    node = el('video', {
      src: media.url,
      muted: true,
      loop: true,
      playsInline: true,
      autoplay: true,
      'aria-label': `${project.title} — demo video`,
    });
  } else if (media.type === 'youtube') {
    node = el('iframe', {
      src: media.url,
      title: `${project.title} — demo video`,
      loading: 'lazy',
      allow: 'encrypted-media; picture-in-picture',
      allowFullscreen: true,
    });
  } else return null;

  const wrap = el('div', { class: 'project-media' }, node);
  // A broken image falls back to the compact icon header instead of an empty 16:9 box.
  node.addEventListener('error', () => {
    wrap.replaceWith(iconBlock(project));
  });
  return wrap;
}

function iconBlock(project) {
  return el(
    'div',
    { class: 'project-media project-media--icon' },
    svgIcon(PROJECT_ICONS[project.icon] || PROJECT_ICONS.default, { size: 28 }),
  );
}

function linkButton(href, icon, label, { fill = 'none' } = {}) {
  return el(
    'a',
    { class: 'project-link', href, target: '_blank', rel: 'noopener noreferrer' },
    svgIcon(ICONS[icon], { size: 14, fill }),
    label,
  );
}

function section(title, ...content) {
  return el('section', { class: 'project-section' }, el('h3', { class: 'project-section-title' }, title), ...content);
}

function projectCard(project) {
  const status = STATUS[project.status] || STATUS.planned;
  const bodyId = `details-${project.id}`;
  const tags = project.tags ?? [];

  const toggle = el(
    'button',
    { type: 'button', class: 'project-toggle', 'aria-expanded': 'false', 'aria-controls': bodyId },
    t('projects.toggle'),
    svgIcon(ICONS.chevron, { size: 16, cls: 'chevron' }),
  );

  const details = el(
    'div',
    { class: 'project-details', id: bodyId, hidden: true },
    project.architecture ? section(t('projects.architecture'), architectureFlow(project.architecture)) : null,
    project.decisions?.length
      ? section(
          t('projects.decisions'),
          el(
            'ul',
            { class: 'decisions' },
            project.decisions.map((d) =>
              el('li', {}, svgIcon(ICONS.check, { size: 14, cls: 'decision-icon' }), el('span', {}, d)),
            ),
          ),
        )
      : null,
    tags.length
      ? section(
          t('projects.stack'),
          el(
            'div',
            { class: 'tags' },
            tags.map((t) => el('span', { class: 'tag' }, t)),
          ),
        )
      : null,
  );

  const links = el(
    'div',
    { class: 'project-links' },
    project.github
      ? linkButton(project.github, 'github', t('projects.code'), { fill: 'currentColor' })
      : el('span', { class: 'project-link is-disabled' }, t('projects.codeSoon')),
    project.article ? linkButton(project.article, 'article', t('projects.article')) : null,
    el(
      'a',
      {
        class: 'project-link project-link--accent',
        href: `index.html?ask=${encodeURIComponent(t('projects.askQuestion', project.title))}`,
      },
      svgIcon(ICONS.chat, { size: 14 }),
      t('projects.ask'),
    ),
    el(
      'a',
      {
        class: 'project-link project-link--icon',
        href: `#${project.id}`,
        'aria-label': `${t('projects.link')}: ${project.title}`,
        title: t('projects.link'),
      },
      svgIcon(ICONS.link, { size: 14 }),
    ),
  );

  const card = el(
    'article',
    { class: 'project-card card', id: project.id, 'aria-labelledby': `title-${project.id}` },
    mediaBlock(project) || iconBlock(project),
    el(
      'div',
      { class: 'project-main' },
      el(
        'div',
        { class: 'project-title-row' },
        el('h2', { class: 'project-title', id: `title-${project.id}` }, project.title),
        el('span', { class: `project-status ${status.cls}` }, status.label),
      ),
      el('p', { class: 'project-value' }, project.value ?? ''),
      el(
        'div',
        { class: 'tags project-tags-preview' },
        tags.slice(0, 5).map((t) => el('span', { class: 'tag' }, t)),
      ),
      toggle,
      details,
      links,
    ),
  );

  card.dataset.search = [project.title, project.value, project.architecture, ...(project.decisions ?? []), ...tags]
    .join(' ')
    .toLowerCase();
  card.dataset.tags = JSON.stringify(tags);
  toggle.addEventListener('click', () => setExpanded(card, toggle.getAttribute('aria-expanded') !== 'true'));
  return card;
}

function setExpanded(card, open) {
  const toggle = card.querySelector('.project-toggle');
  toggle.setAttribute('aria-expanded', String(open));
  card.querySelector('.project-details').hidden = !open;
  card.classList.toggle('is-expanded', open);
}

// ── Filtering ───────────────────────────────────────────────────────────────
function matchesCategory(card) {
  const cat = CATEGORIES.find((c) => c.id === state.category);
  if (!cat?.tags) return true;
  const tags = JSON.parse(card.dataset.tags);
  return tags.some((t) => cat.tags.includes(t));
}

function applyFilters() {
  const q = state.query.trim().toLowerCase();
  let visible = 0;
  for (const card of $('project-list').querySelectorAll('.project-card')) {
    const show = (!q || card.dataset.search.includes(q)) && matchesCategory(card);
    card.hidden = !show;
    if (show) visible++;
  }
  $('result-count').textContent = t('projects.count', visible);
  $('no-results').hidden = visible > 0;
}

function renderFilters(projects) {
  const bar = $('filters');
  for (const cat of CATEGORIES) {
    const count = cat.tags
      ? projects.filter((p) => (p.tags ?? []).some((t) => cat.tags.includes(t))).length
      : projects.length;
    if (!count) continue;
    bar.append(
      el(
        'button',
        {
          type: 'button',
          class: 'filter-chip',
          'aria-pressed': String(cat.id === state.category),
          dataset: { category: cat.id },
        },
        cat.label,
        el('span', { class: 'filter-count' }, count),
      ),
    );
  }
  bar.addEventListener('click', (event) => {
    const chip = event.target.closest('.filter-chip');
    if (!chip) return;
    state.category = chip.dataset.category;
    for (const c of bar.children) c.setAttribute('aria-pressed', String(c === chip));
    applyFilters();
  });
}

function openFromHash() {
  const id = decodeURIComponent(window.location.hash.slice(1));
  if (!id) return;
  const card = document.getElementById(id);
  if (!card || !card.classList.contains('project-card')) return;
  // Clear filters so the linked card is guaranteed to be visible.
  state.query = '';
  state.category = 'all';
  $('project-search').value = '';
  for (const chip of $('filters').children) chip.setAttribute('aria-pressed', String(chip.dataset.category === 'all'));
  applyFilters();
  setExpanded(card, true);
  card.scrollIntoView({ block: 'start' });
}

async function init() {
  initPage();
  const list = $('project-list');
  const status = $('projects-status');

  $('project-search').addEventListener('input', (event) => {
    state.query = event.target.value;
    applyFilters();
  });

  try {
    const data = await fetchJson(DATA.projects);
    if (!Array.isArray(data.projects)) throw new Error('Invalid format: missing projects array');
    const projects = data.projects.filter((p) => p.status !== 'private');
    status.remove();
    list.append(...projects.map(projectCard));
    renderFilters(projects);
    applyFilters();
    openFromHash();
    window.addEventListener('hashchange', openFromHash);
  } catch (err) {
    console.error('Failed to load projects:', err);
    status.classList.add('is-error');
    status.textContent = t('projects.error');
  } finally {
    list.setAttribute('aria-busy', 'false');
  }
}

init();
