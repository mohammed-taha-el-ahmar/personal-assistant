import { getCollection } from 'astro:content';
import type { Lang } from '../i18n';

export async function analyses(lang: Lang) {
  const all = lang === 'en' ? await getCollection('analysisEn') : await getCollection('analysisAr');
  return all
    .filter((e) => e.data.status === 'published')
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export async function approvedBriefs() {
  const all = await getCollection('brief');
  return all
    .filter((e) => e.data.status === 'approved' && e.data.pillar !== 'off_topic')
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export async function sentIssues() {
  const all = await getCollection('newsletter');
  return all.filter((e) => e.data.status === 'sent').sort((a, b) => b.data.issue - a.data.issue);
}
