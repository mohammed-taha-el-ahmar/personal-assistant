import { defineConfig } from 'astro/config';

// Served at https://www.tahaelahmar.dev/bayanat/. Override with SITE_URL / SITE_BASE
// (repository variables) if the site ever moves.
export default defineConfig({
  site: process.env.SITE_URL || 'https://www.tahaelahmar.dev',
  base: process.env.SITE_BASE || '/bayanat/',
  trailingSlash: 'always',
  output: 'static',
  build: { format: 'directory' },
});
