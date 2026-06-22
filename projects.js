// ── Projects page: data loading, rendering, search, interactions ────────────

// ✏️ Point this at your repo's raw JSON file
const PROJECTS_JSON_URL = 'https://raw.githubusercontent.com/mohammed-taha-el-ahmar/personal-assistant/main/docs/projects.json';

// ── Icon library ──────────────────────────────────────────────────────────
// Each entry is the inner SVG markup (paths/shapes only) for a 24x24 viewBox.
// Add new keys here as needed; "default" is used when a project's "icon"
// field is missing or doesn't match a known key.
const ICONS = {
  kafka: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  airflow: '<circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 10v6M4.22 4.22l4.24 4.24m7.08 7.08l4.24 4.24M1 12h6m10 0h6M4.22 19.78l4.24-4.24m7.08-7.08l4.24-4.24"/>',
  dbt: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
  capstone: '<path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
  default: '<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>',
};

const GITHUB_ICON_SVG = `<svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.349-1.088.635-1.339-2.221-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>`;
const CHAT_ICON_SVG   = `<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>`;
const CHECK_ICON_SVG  = `<svg class="decision-icon" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>`;
const CHEVRON_SVG     = `<svg class="project-chevron" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>`;

const STATUS_LABELS = {
  live:        { label: 'Live',        cls: 'status-live' },
  in_progress: { label: 'In Progress', cls: 'status-progress' },
  planned:     { label: 'Planned',     cls: 'status-planned' },
  private:     { label: 'Private',     cls: 'status-planned' }, // never rendered
};

let allProjects = [];

// ── Media rendering ───────────────────────────────────────────────────────
// media schema (all optional — pass null/omit for no media):
//   { "type": "image",   "url": "https://..." }   → <img>
//   { "type": "gif",     "url": "https://..." }   → <img> (gifs render fine as <img>)
//   { "type": "video",   "url": "https://....mp4" } → <video autoplay loop muted>
//   { "type": "youtube", "url": "https://www.youtube.com/embed/VIDEO_ID" } → <iframe>
function buildMediaElement(media) {
  if (!media || !media.type || !media.url) return null;

  let inner;
  switch (media.type) {
    case 'image':
    case 'gif': {
      const img = document.createElement('img');
      img.src = media.url;
      img.alt = '';
      img.loading = 'lazy';
      inner = img;
      break;
    }
    case 'video': {
      const video = document.createElement('video');
      video.src = media.url;
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      inner = video;
      break;
    }
    case 'youtube': {
      const iframe = document.createElement('iframe');
      iframe.src = media.url;
      iframe.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;
      iframe.loading = 'lazy';
      inner = iframe;
      break;
    }
    default:
      return null;
  }
  return inner;
}

// ── Card builder ──────────────────────────────────────────────────────────
function buildProjectCard(project, index) {
  const card = document.createElement('section');
  card.className = 'project-card';

  // Searchable text blob, lowercased once and stored on the element
  const searchable = [
    project.title,
    project.value,
    project.architecture,
    ...(project.decisions || []),
    ...(project.tags || []),
  ].join(' ').toLowerCase();
  card.dataset.search = searchable;

  const headerId = `header-${project.id}`;
  const bodyId   = `body-${project.id}`;

  // ── Media (if present) ──
  const mediaEl = buildMediaElement(project.media);
  if (mediaEl) {
    const wrap = document.createElement('div');
    wrap.className = 'project-media-wrap';
    wrap.appendChild(mediaEl);

    const badge = document.createElement('div');
    badge.className = 'project-icon-badge';
    badge.setAttribute('aria-hidden', 'true');
    badge.innerHTML = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">${ICONS[project.icon] || ICONS.default}</svg>`;
    wrap.appendChild(badge);

    card.appendChild(wrap);
  }

  // ── Header ──
  const header = document.createElement('div');
  header.className = 'project-header' + (mediaEl ? '' : ' no-media');
  header.id = headerId;
  header.setAttribute('role', 'button');
  header.setAttribute('tabindex', '0');
  header.setAttribute('aria-expanded', 'false');
  header.onclick = () => toggleProject(project.id);
  header.onkeydown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleProject(project.id); }
  };

  // Icon (only shown inline when there's no media)
  if (!mediaEl) {
    const iconWrap = document.createElement('div');
    iconWrap.className = 'project-icon';
    iconWrap.setAttribute('aria-hidden', 'true');
    iconWrap.innerHTML = `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">${ICONS[project.icon] || ICONS.default}</svg>`;
    header.appendChild(iconWrap);
  }

  const headerText = document.createElement('div');
  headerText.className = 'project-header-text';

  const titleRow = document.createElement('div');
  titleRow.className = 'project-title-row';

  const title = document.createElement('span');
  title.className = 'project-title';
  title.textContent = project.title;
  titleRow.appendChild(title);

  const statusInfo = STATUS_LABELS[project.status] || STATUS_LABELS.planned;
  const status = document.createElement('span');
  status.className = `project-status ${statusInfo.cls}`;
  status.textContent = statusInfo.label;
  titleRow.appendChild(status);

  headerText.appendChild(titleRow);

  const value = document.createElement('div');
  value.className = 'project-value';
  value.textContent = project.value;
  headerText.appendChild(value);

  header.appendChild(headerText);
  header.insertAdjacentHTML('beforeend', CHEVRON_SVG);

  card.appendChild(header);

  // ── Body ──
  const body = document.createElement('div');
  body.className = 'project-body';
  body.id = bodyId;
  body.hidden = true;

  // Architecture
  if (project.architecture) {
    const section = document.createElement('div');
    section.className = 'project-section';
    section.innerHTML = `<div class="project-section-title">Architecture</div>`;
    const diagram = document.createElement('div');
    diagram.className = 'project-diagram';
    diagram.textContent = project.architecture;
    section.appendChild(diagram);
    body.appendChild(section);
  }

  // Decisions
  if (project.decisions && project.decisions.length) {
    const section = document.createElement('div');
    section.className = 'project-section';
    section.innerHTML = `<div class="project-section-title">Key Decisions</div>`;
    const list = document.createElement('div');
    list.className = 'project-decisions';
    for (const decision of project.decisions) {
      const item = document.createElement('div');
      item.className = 'decision-item';
      item.insertAdjacentHTML('beforeend', CHECK_ICON_SVG);
      const span = document.createElement('span');
      span.textContent = decision;
      item.appendChild(span);
      list.appendChild(item);
    }
    section.appendChild(list);
    body.appendChild(section);
  }

  // Tags
  if (project.tags && project.tags.length) {
    const section = document.createElement('div');
    section.className = 'project-section';
    section.innerHTML = `<div class="project-section-title">Stack</div>`;
    const tagsWrap = document.createElement('div');
    tagsWrap.className = 'project-tags';
    for (const tag of project.tags) {
      const tagEl = document.createElement('span');
      tagEl.className = 'tag';
      tagEl.textContent = tag;
      tagsWrap.appendChild(tagEl);
    }
    section.appendChild(tagsWrap);
    body.appendChild(section);
  }

  // Links
  const links = document.createElement('div');
  links.className = 'project-links';

  if (project.github) {
    const a = document.createElement('a');
    a.className = 'project-link';
    a.href = project.github;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.innerHTML = GITHUB_ICON_SVG + ' View on GitHub';
    links.appendChild(a);
  } else {
    const span = document.createElement('span');
    span.className = 'project-link disabled';
    span.innerHTML = GITHUB_ICON_SVG + ' GitHub — coming soon';
    links.appendChild(span);
  }

  const askBtn = document.createElement('button');
  askBtn.className = 'ask-chatbot-link';
  askBtn.innerHTML = CHAT_ICON_SVG + ' Ask the assistant about this';
  askBtn.onclick = () => askAboutProject(project.title);
  links.appendChild(askBtn);

  body.appendChild(links);
  card.appendChild(body);

  return card;
}

// ── Expand/collapse ───────────────────────────────────────────────────────
function toggleProject(id) {
  const header = document.getElementById('header-' + id);
  const body   = document.getElementById('body-' + id);
  const isOpen = header.getAttribute('aria-expanded') === 'true';

  header.setAttribute('aria-expanded', String(!isOpen));
  body.hidden = isOpen;
}

// ── Ask the assistant (navigates to chatbot with pre-filled question) ───────
function askAboutProject(projectName) {
  const question = `Tell me more about the ${projectName} project — what problem does it solve and what were the key technical decisions?`;
  const url = `index.html?ask=${encodeURIComponent(question)}`;
  window.location.href = url;
}

// ── Search / filter ──────────────────────────────────────────────────────
function filterProjects(query) {
  const q = query.trim().toLowerCase();
  const list = document.getElementById('project-list');
  const noResults = document.getElementById('no-results');
  const noResultsQuery = document.getElementById('no-results-query');

  let visibleCount = 0;
  for (const card of list.children) {
    if (!card.dataset || !card.dataset.search) continue; // skip loading/error nodes
    const matches = q === '' || card.dataset.search.includes(q);
    card.hidden = !matches;
    if (matches) visibleCount++;
  }

  if (q !== '' && visibleCount === 0) {
    noResultsQuery.textContent = query.trim();
    noResults.hidden = false;
  } else {
    noResults.hidden = true;
  }
}

// ── Load + render ─────────────────────────────────────────────────────────
async function loadProjects() {
  const list = document.getElementById('project-list');
  const loading = document.getElementById('projects-loading');

  try {
    const res = await fetch(PROJECTS_JSON_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();

    if (!Array.isArray(data.projects)) throw new Error('Invalid format: missing projects array');

    allProjects = data.projects;
    loading.remove();

    data.projects
      .filter(p => p.status !== 'private')
      .forEach((project, i) => {
        list.appendChild(buildProjectCard(project, i));
      });
  } catch (err) {
    console.error('Failed to load projects:', err);
    loading.className = 'resume-error';
    loading.textContent = 'Could not load projects. Please try again later.';
  }
}

loadProjects();
