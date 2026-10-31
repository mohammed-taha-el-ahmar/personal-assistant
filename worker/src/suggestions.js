// Follow-up suggestions derived from what was retrieved — no extra LLM call.

const T = {
  en: {
    portfolio: (t) => `What were the key design decisions in "${t}"?`,
    resume: (t) => `What were his main achievements in ${t}?`,
    remote: 'Is he open to remote work?',
    notice: 'When could he start?',
    certs: 'Which certifications does he hold?',
    genai: "What's his hands-on experience with GenAI?",
    projects: 'Which portfolio project best shows his streaming skills?',
  },
  fr: {
    portfolio: (t) => `Quelles ont été les décisions techniques clés de « ${t} » ?`,
    resume: (t) => `Quelles ont été ses principales réalisations (${t}) ?`,
    remote: 'Est-il ouvert au télétravail ?',
    notice: 'Quand pourrait-il commencer ?',
    certs: 'Quelles certifications possède-t-il ?',
    genai: 'Quelle est son expérience concrète en IA générative ?',
    projects: 'Quel projet illustre le mieux ses compétences en streaming ?',
  },
};

const shortTitle = (title) =>
  title
    .split(' › ')[0]
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/\s+—.*$/, '')
    .trim();

export function followUps({ chunks, question, history, lang = 'en' }) {
  const t = T[lang] ?? T.en;
  const asked = new Set(
    [question, ...history.filter((m) => m.role === 'user').map((m) => m.content)].map((q) => q.toLowerCase()),
  );
  const out = [];
  const push = (s) => {
    if (s && !asked.has(s.toLowerCase()) && !out.includes(s)) out.push(s);
  };

  // Only the best-ranked chunks: weaker matches make for off-topic suggestions.
  for (const c of chunks.filter((x) => !x.pinned).slice(0, 2)) {
    if (c.doc === 'portfolio') push(t.portfolio(shortTitle(c.title)));
    else if (c.doc === 'resume' && c.title.includes('›')) push(t.resume(shortTitle(c.title.split(' › ').pop())));
    if (out.length >= 2) break;
  }
  for (const generic of [t.genai, t.remote, t.notice, t.certs, t.projects]) {
    if (out.length >= 3) break;
    push(generic);
  }
  return out.slice(0, 3);
}
