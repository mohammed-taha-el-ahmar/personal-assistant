// Shared page shell for generated pages (articles). Mirrors the header and footer of
// index.html / projects.html, so a generated page looks and behaves like the others:
// same theme toggle, FR/EN switch, config-driven links (js/page.js).
import { escapeHtml } from './articles.mjs';

export const SITE_URL = 'https://www.tahaelahmar.dev';
const NAME = 'Mohammed Taha EL AHMAR';

const SUN =
  '<svg class="icon-sun" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>';
const MOON =
  '<svg class="icon-moon" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>';

/**
 * @param {object} o
 * @param {string} o.pre       relative prefix to the site root ('../' or '../../')
 * @param {string} o.path      canonical path, e.g. '/articles/slug/'
 * @param {string} o.title
 * @param {string} o.description
 * @param {string} o.body      page content (trusted HTML built by the generator)
 * @param {boolean} [o.noindex]
 * @param {'article'|'website'} [o.type]
 */
export function pageShell({ pre, path, title, description, body, noindex = false, type = 'website' }) {
  const url = `${SITE_URL}${path}`;
  const t = escapeHtml(title);
  const d = escapeHtml(description);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${t} — ${NAME}</title>
    <meta name="description" content="${d}" />
    ${noindex ? '<meta name="robots" content="noindex" />' : ''}
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="${type}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:title" content="${t}" />
    <meta property="og:description" content="${d}" />
    <meta property="og:image" content="${SITE_URL}/assets/og.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="theme-color" content="#0f7a5c" />
    <link rel="icon" href="${pre}assets/favicon.svg" type="image/svg+xml" />
    <link rel="alternate" type="application/rss+xml" title="${NAME} — Articles" href="${SITE_URL}/articles/rss.xml" />
    <script src="${pre}js/theme-init.js"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="${pre}css/tokens.css" />
    <link rel="stylesheet" href="${pre}css/base.css" />
    <link rel="stylesheet" href="${pre}css/content.css" />
    <script type="module" src="${pre}js/page.js"></script>
  </head>
  <body>
    <a class="skip-link" href="#content" data-i18n="skip.content">Skip to content</a>
    <header class="site-header">
      <div class="site-header-inner">
        <a class="brand" href="${pre}index.html" aria-label="${NAME} — home">
          <span class="brand-mark" aria-hidden="true">MT</span>
          <span class="brand-name">${NAME}</span>
        </a>
        <nav class="site-nav" aria-label="Main">
          <a href="${pre}index.html" data-i18n="nav.assistant">Assistant</a>
          <a href="${pre}projects.html" data-i18n="nav.projects">Projects</a>
          <a href="${pre}services.html" data-i18n="nav.services">Services</a>
          <a href="${pre}articles/" data-i18n="nav.articles" aria-current="page">Articles</a>
          <a href="#" data-link="cv" data-i18n="nav.cv" hidden>CV</a>
        </nav>
        <div class="header-actions">
          <button class="icon-btn lang-toggle" type="button" data-i18n="header.langShort" data-i18n-aria-label="header.lang" aria-label="Passer en français">FR</button>
          <button class="icon-btn theme-toggle" type="button" data-i18n-aria-label="header.theme" aria-label="Toggle dark mode">${SUN}${MOON}</button>
          <a class="btn btn-primary btn-sm" href="https://cal.eu/mohammed-taha-el-ahmar" data-link="cal" data-i18n="header.book" target="_blank" rel="noopener">Book a call</a>
        </div>
      </div>
    </header>

    <main class="page" id="content">
${body}
    </main>

    <footer class="site-footer">
      <span>© ${NAME}</span>
      <a href="https://linkedin.com/in/mohammed-taha-el-ahmar" data-link="linkedin" target="_blank" rel="noopener">LinkedIn</a>
      <a href="https://github.com/mohammed-taha-el-ahmar" data-link="github" target="_blank" rel="noopener">GitHub</a>
      <a href="${pre}bayanat/en/">Bayanat</a>
      <a href="${SITE_URL}/articles/rss.xml">RSS</a>
      <a href="mailto:med.taha.elahmar@gmail.com" data-link="email" data-link-text>med.taha.elahmar@gmail.com</a>
    </footer>
  </body>
</html>
`;
}

/** Call-to-action band shared by articles and the articles index. */
export function ctaBand(pre) {
  return `      <section class="card cta-band" aria-labelledby="cta-title">
        <div>
          <h2 id="cta-title" data-i18n="cta.title">Facing this in your own platform?</h2>
          <p data-i18n="cta.text">I help teams build reliable data platforms, as a freelance engineer or in a senior role. Ask the assistant, or book a short call.</p>
        </div>
        <div class="actions">
          <a class="btn btn-primary" href="https://cal.eu/mohammed-taha-el-ahmar" data-link="cal" data-i18n="hero.book" target="_blank" rel="noopener">Book a 30-min call</a>
          <a class="btn btn-secondary" href="${pre}services.html" data-i18n="cta.services">See how I work</a>
        </div>
      </section>`;
}
