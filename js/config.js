// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for site-wide settings.
// Every page and module imports from here — never hard-code these elsewhere.
// Links in the HTML carry `data-link="<key>"` and are rewritten from LINKS on load,
// so the static hrefs in the markup are only a no-JS fallback.
// ─────────────────────────────────────────────────────────────────────────────

export const WORKER_URL = 'https://recruiter-proxy.med-taha-elahmar.workers.dev';

export const LINKS = {
  cal: 'https://cal.eu/mohammed-taha-el-ahmar',
  linkedin: 'https://linkedin.com/in/mohammed-taha-el-ahmar',
  github: 'https://github.com/mohammed-taha-el-ahmar',
  email: 'mailto:med.taha.elahmar@gmail.com',
  // Set to e.g. 'assets/cv.pdf' once the PDF is committed; the CV nav item stays hidden while null.
  cv: null,
};

export const EMAIL = 'med.taha.elahmar@gmail.com';

// Data is served from the same origin as the site (versioned with each deploy).
export const DATA = {
  resume: 'docs/resume-bullets.json',
  projects: 'docs/projects.json',
};

// Chat limits (mirrored server-side in worker/src/config.js)
export const CHAT = {
  maxHistory: 12, // messages sent to the worker
  maxInputChars: 1000,
};
