import fs from 'node:fs';
import path from 'node:path';
import { load as loadYaml } from 'js-yaml';
import type { Lang } from '../i18n';

/** Prefix a site-relative path with the configured base ('/' or '/<repo>/'). */
export function url(p: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const clean = p.startsWith('/') ? p : `/${p}`;
  return `${base}${clean}`;
}

export interface TrackerRow {
  id: string;
  rule: Record<Lang, string>;
  scope: Record<Lang, string>;
  key_date: string | null;      // ISO date, or null when not set
  key_date_note?: Record<Lang, string>;
  status: 'postponed' | 'pending' | 'in_force' | 'applies';
  source_url: string;
  last_checked: string;
}

/** The tracker is a hand-maintained YAML file, updated when watch notes are approved. */
export function loadTracker(): TrackerRow[] {
  const file = path.resolve(process.cwd(), '../content/tracker.yaml');
  const doc = loadYaml(fs.readFileSync(file, 'utf-8')) as { rows: TrackerRow[] };
  // YAML parses bare dates as Date objects: normalise to ISO strings.
  const iso = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : (v as string | null));
  return (doc.rows ?? []).map((r) => ({ ...r, key_date: iso(r.key_date), last_checked: iso(r.last_checked) as string }));
}

/** Public settings, injected at build time (see README). */
export const SUBSCRIBE_URL = import.meta.env.PUBLIC_SUBSCRIBE_URL || '';
export const CONTACT_EMAIL = import.meta.env.PUBLIC_CONTACT_EMAIL || 'med.taha.elahmar@gmail.com';
export const CF_BEACON = import.meta.env.PUBLIC_CF_BEACON || '';
