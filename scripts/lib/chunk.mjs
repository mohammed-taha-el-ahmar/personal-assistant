// Splits the knowledge-base documents into small, self-describing chunks.
// Small models have small context windows, so each chunk carries its own heading path
// ("Current Role — TotalEnergies › Project 1: Centralized Data Hub") and stays under ~MAX_WORDS.

const MAX_WORDS = 120;

export const estimateTokens = (text) => Math.ceil(text.length / 4);

const slug = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);

const words = (s) => s.split(/\s+/).filter(Boolean).length;

/** Split one oversized paragraph on line breaks, then sentences. */
function splitParagraph(para, maxWords) {
  if (words(para) <= maxWords) return [para];
  const units = para.includes('\n') ? para.split('\n') : para.split(/(?<=[.!?])\s+/);
  const out = [];
  let cur = [];
  for (const u of units) {
    if (cur.length && words([...cur, u].join(' ')) > maxWords) {
      out.push(cur.join('\n'));
      cur = [];
    }
    cur.push(u);
  }
  if (cur.length) out.push(cur.join('\n'));
  return out;
}

/**
 * Markdown → chunks. Headings (#..######) and whole-line bold lines ("**Toyota – 1 year**",
 * FAQ questions) open a new section; paragraphs are packed into chunks of ≤ maxWords.
 */
export function chunkMarkdown(docKey, md, { label, pinned = [], maxWords = MAX_WORDS } = {}) {
  const sections = [];
  const stack = []; // heading path by level
  let current = { path: [], paras: [] };
  let para = [];

  const flushPara = () => {
    const text = para.join('\n').trim();
    if (text) current.paras.push(text);
    para = [];
  };
  const openSection = (level, title) => {
    flushPara();
    if (current.paras.length) sections.push(current);
    stack.length = level - 1;
    stack[level - 1] = title;
    current = { path: stack.filter(Boolean).slice(), paras: [] };
  };

  for (const raw of md.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trimEnd();
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    const boldLine = /^\*\*([^*]+)\*\*:?$/.exec(line.trim());
    if (heading) openSection(heading[1].length, heading[2].trim());
    // Whole-line bold = pseudo-heading: level 4 ("**Toyota – 1 year**", FAQ questions),
    // level 5 for "**Context: …**" so it nests under the employer line above it.
    else if (boldLine) openSection(/^context\b/i.test(boldLine[1]) ? 5 : 4, boldLine[1].trim());
    else if (/^-{3,}$/.test(line.trim()) || line.trim() === '') flushPara();
    else para.push(line);
  }
  flushPara();
  if (current.paras.length) sections.push(current);

  // A tiny section that only introduces its children ("**Senior Cloud Data Engineer**, Paris")
  // is folded into the next section instead of becoming a near-empty chunk.
  for (let i = sections.length - 2; i >= 0; i--) {
    const sec = sections[i];
    const next = sections[i + 1];
    const isParent = sec.path.every((part, j) => next.path[j] === part) && next.path.length > sec.path.length;
    if (isParent && words(sec.paras.join(' ')) < 20) {
      next.paras.unshift(...sec.paras);
      sections.splice(i, 1);
    }
  }

  const chunks = [];
  const usedIds = new Set();
  const uniqueId = (base) => {
    let id = base;
    for (let n = 2; usedIds.has(id); n++) id = `${base}-${n}`;
    usedIds.add(id);
    return id;
  };
  for (const section of sections) {
    // Drop the document's own H1 from the path (it is the same for every chunk).
    const pathParts = section.path.length > 1 ? section.path.slice(1) : section.path;
    const title = pathParts.join(' › ') || label;
    const pieces = section.paras.flatMap((p) => splitParagraph(p, maxWords));
    let buf = [];
    const emit = () => {
      if (!buf.length) return;
      chunks.push({
        id: uniqueId(`${docKey}:${slug(pathParts.at(-1) ?? '') || 'intro'}`),
        doc: docKey,
        label,
        title,
        text: buf.join('\n'),
        ...(pinned.some((p) => title === p) ? { pinned: true } : {}),
      });
      buf = [];
    };
    for (const piece of pieces) {
      if (buf.length && words([...buf, piece].join(' ')) > maxWords) emit();
      buf.push(piece);
    }
    emit();
  }
  return chunks;
}

/** Portfolio project → two chunks (overview, design decisions), both linking to its card. */
export function projectChunks(project) {
  const base = { doc: 'portfolio', label: 'Portfolio', title: project.title, href: `projects.html#${project.id}` };
  const overview = [
    project.value,
    project.tags?.length ? `Stack: ${project.tags.join(', ')}` : '',
    project.github ? `Code: ${project.github}` : '',
    project.article ? `Article: ${project.article}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  const chunks = [{ ...base, id: `portfolio:${project.id}`, text: overview }];

  const design = [
    project.architecture ? `Architecture: ${project.architecture}` : '',
    ...(project.decisions ?? []).map((d) => `- ${d}`),
  ].filter(Boolean);
  // Keep each design chunk small: split decisions over several chunks if needed.
  let buf = [];
  let part = 0;
  const flush = () => {
    if (!buf.length) return;
    part++;
    chunks.push({
      ...base,
      id: `portfolio:${project.id}:design${part > 1 ? `-${part}` : ''}`,
      title: `${project.title} › Design`,
      text: buf.join('\n'),
    });
    buf = [];
  };
  for (const line of design) {
    if (buf.length && words([...buf, line].join(' ')) > MAX_WORDS) flush();
    buf.push(line);
  }
  flush();
  return chunks;
}
