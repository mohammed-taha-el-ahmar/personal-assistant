// Text normalisation for lexical retrieval: accent folding, stop words (EN + FR),
// light stemming, and a small FR→EN / synonym map so French questions hit English docs.

const STOP = new Set(
  // English
  (
    'a an the and or but if of to in on at by for with from as is are was were be been being it its this that these those ' +
    'he him his she her they them their we our you your i me my do does did done have has had can could would should will ' +
    'what which who whom whose when where why how about tell more please any some all there here than then so such into ' +
    'over also just very much many most other only own same too not no yes up out get got give us let know ' +
    // French
    'le la les un une des du de d l et ou mais si au aux en dans sur par pour avec sans sous est sont etait ete etre a ai as ' +
    'il elle ils elles on nous vous je j me m mon ma mes ton ta tes son sa ses leur leurs ce cet cette ces qui que qu quoi dont ' +
    'quel quelle quels quelles comment pourquoi quand combien ne pas plus tres bien aussi est-ce peut pouvez parlez dites moi ' +
    'sur-le fait faire avez a-t-il t y'
  ).split(/\s+/),
);

// Query-side expansions (applied after normalisation). Keys: FR words and recruiter jargon.
const EXPAND = {
  salaire: ['salary', 'compensation'],
  remuneration: ['salary', 'compensation'],
  pretentions: ['salary', 'expectations'],
  tjm: ['rate', 'salary', 'consulting'],
  disponibilite: ['availability', 'available', 'notice'],
  disponible: ['availability', 'available'],
  preavis: ['notice', 'period'],
  teletravail: ['remote', 'hybrid'],
  distance: ['remote'],
  demenager: ['relocation'],
  demenagement: ['relocation'],
  mobilite: ['relocation'],
  contrat: ['contract'],
  cdi: ['contract', 'permanent', 'cdi'],
  freelance: ['consulting', 'missions', 'freelance'],
  independant: ['consulting', 'freelance'],
  competence: ['skills'],
  competences: ['skills'],
  experience: ['experience', 'years'],
  experiences: ['experience'],
  projet: ['project'],
  projets: ['project'],
  langue: ['languages'],
  langues: ['languages', 'english', 'french', 'arabic'],
  anglais: ['english'],
  francais: ['french'],
  arabe: ['arabic'],
  diplome: ['education', 'degree'],
  etudes: ['education'],
  formation: ['education', 'training'],
  ecole: ['education'],
  equipe: ['team', 'mentored', 'managed'],
  encadrement: ['mentored', 'managed', 'team'],
  manager: ['managed', 'team', 'mentored'],
  management: ['managed', 'team', 'mentored'],
  lead: ['managed', 'mentored', 'committees', 'training'],
  ia: ['ai', 'genai', 'llm'],
  genai: ['genai', 'llm', 'rag'],
  generative: ['genai', 'llm'],
  generatif: ['genai', 'llm'],
  llm: ['llm', 'genai', 'agent'],
  agent: ['agent', 'agents', 'multi-agent'],
  agents: ['agent', 'multi-agent'],
  donnees: ['data'],
  qualite: ['quality'],
  couts: ['cost'],
  cout: ['cost'],
  nuage: ['cloud'],
  certifie: ['certification', 'certified'],
  certifications: ['certification', 'certified', 'associate', 'professional'],
  stack: ['skills', 'core'],
  tech: ['skills', 'core'],
  technical: ['skills', 'core'],
  technologies: ['skills', 'core'],
  techno: ['skills', 'core'],
  technos: ['skills', 'core'],
  technique: ['skills', 'core'],
  outils: ['tools', 'skills'],
  secteur: ['industries'],
  secteurs: ['industries'],
  industrie: ['industries'],
  appel: ['call', 'book'],
  rendez: ['call', 'book'],
  rdv: ['call', 'book'],
  entretien: ['call', 'book'],
  call: ['call', 'book'],
  available: ['availability'],
  start: ['availability', 'notice'],
  wfh: ['remote'],
  pay: ['salary'],
  rate: ['salary', 'rate'],
  degree: ['education'],
  university: ['education'],
  streaming: ['streaming', 'kafka', 'kinesis', 'real-time'],
  'temps-reel': ['real-time', 'streaming'],
};

// Words that appear in almost every chunk ("**Tech:** …") — replaced by their expansion
// instead of being searched literally.
const REPLACE = new Set(['stack', 'tech', 'technical', 'technologies', 'techno', 'technos', 'technique']);

export function normalize(text) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function stem(token) {
  if (token.length > 5 && token.endsWith('ies')) return token.slice(0, -3) + 'y';
  if (token.length > 4 && token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1);
  return token;
}

/** Document-side tokens. */
export function tokenize(text) {
  return normalize(text)
    .split(/[^a-z0-9+#]+/)
    .filter((t) => t.length > 1 && !STOP.has(t))
    .map(stem);
}

/** Query-side tokens: document tokens plus FR→EN / synonym expansions. */
export function queryTokens(text) {
  const raw = normalize(text)
    .split(/[^a-z0-9+#-]+/)
    .filter(Boolean);
  const out = [];
  for (const t of raw) {
    if (EXPAND[t]) out.push(...EXPAND[t].map((e) => stem(e)));
    if (REPLACE.has(t)) continue;
    for (const part of t.split('-')) {
      if (part.length > 1 && !STOP.has(part)) out.push(stem(part));
    }
  }
  return out;
}

export const estimateTokens = (text) => Math.ceil((text ?? '').length / 4);
