// UI strings in English and French. Content data (resume lines, projects) stays in English;
// the assistant answers in the language of each question.
//
// Static markup carries data-i18n="key" (text), data-i18n-placeholder, data-i18n-aria-label, data-i18n-title.
// Dynamic code calls t('key', ...args).

const STRINGS = {
  en: {
    'skip.chat': 'Skip to the assistant',
    'skip.projects': 'Skip to projects',
    'nav.assistant': 'Assistant',
    'nav.projects': 'Projects',
    'nav.cv': 'CV',
    'header.book': 'Book a call',
    'header.theme': 'Toggle dark mode',
    'header.lang': 'Passer en français',
    'header.langShort': 'FR',

    'hero.badge': 'Open to senior & lead roles',
    'hero.title': 'Senior Cloud Data Engineer · Paris, France · TotalEnergies, ex-Deloitte',
    'metric.exp': 'Experience',
    'metric.expValue': '9+ yrs',
    'metric.certs': 'Cloud certifications',
    'metric.faster': 'Faster data-product delivery',
    'metric.langs': 'Languages',
    'tags.data': 'Data',
    'tags.cloud': 'Cloud',
    'tags.ai': 'AI',
    'hero.book': 'Book a 30-min call',
    'hero.projects': 'View projects & demos',
    'hero.cv': 'Download CV',
    'mobile.book': 'Book a 30-min call',

    'chat.title': 'Ask me anything',
    'chat.status': 'AI assistant · answers from his resume, FAQ & projects',
    'chat.greet1': "Hi! I'm an AI assistant that knows Mohammed Taha's background.",
    'chat.greet2':
      "Ask about his experience, tech stack, certifications or the kind of role he's looking for, paste a job description to check the fit — or click any resume line for the story behind it.",
    'chat.suggestions': 'Suggested questions',
    'sugg.1': "What's his main tech stack?",
    'sugg.2': 'What kind of roles is he looking for?',
    'sugg.3': 'Tell me about his certifications',
    'sugg.4': "What's his experience with GenAI?",
    'sugg.jd': 'Match a job description',
    'chat.inputLabel': 'Your question',
    'chat.placeholder': 'Ask about experience, skills, availability…',
    'chat.send': 'Send message',
    'chat.typing': 'Assistant is typing',
    'chat.new': 'New conversation',
    'chat.email': 'Email this conversation to him',
    'chat.jdOpen': 'Match a job description',
    'chat.copy': 'Copy answer',
    'chat.copied': 'Copied',
    'chat.up': 'Helpful',
    'chat.down': 'Not helpful',
    'chat.thanks': 'Thanks for the feedback',
    'chat.sources': 'Sources',
    'chat.handoff': 'Continue on a call — your questions will be added to the booking notes.',
    'chat.handoffBtn': 'Book with this context',
    'chat.errorNetwork': 'Network error — please check your connection and try again.',
    'chat.error429': 'You have sent a lot of questions — please wait a few minutes and try again.',
    'chat.error403':
      'This site is not allowed to reach the assistant right now. Please try again later or book a call.',
    'chat.error5xx': 'The assistant is temporarily unavailable. Please try again in a moment.',
    'chat.errorGeneric': 'Something went wrong. Please try again.',
    'chat.empty': "Sorry, I couldn't get a response.",
    'chat.explain': (text) =>
      `Tell me more about this: "${text}" — what was the real challenge, the approach taken, and the impact?`,

    'jd.title': 'Match a job description',
    'jd.hint': 'Paste the job description; the assistant compares it with his experience and projects.',
    'jd.label': 'Job description',
    'jd.placeholder': 'Paste the job description here…',
    'jd.submit': 'Check the fit',
    'jd.cancel': 'Cancel',
    'jd.tooShort': 'Please paste a few lines of the job description.',
    'jd.userMsg': (words) => `Shared a job description (${words} words) — how well does he fit?`,

    'email.subject': 'Conversation with your website assistant',
    'email.intro': 'Hi Mohammed Taha,\n\nHere is the conversation I had with your website assistant:\n\n',
    'email.you': 'Me',
    'email.bot': 'Assistant',
    'cal.notes': 'Questions asked via the website assistant:',
    'cal.jd': '(also shared a job description)',

    'resume.title': 'Experience',
    'resume.sub': 'Click any line to ask the assistant for the story behind it',
    'resume.loading': 'Loading experience…',
    'resume.error': 'Could not load experience details. You can still ask the assistant.',
    'resume.more': (n) => `Show ${n} more`,
    'resume.less': 'Show less',
    'resume.ask': 'Ask →',

    'projects.badge': 'Hands-on technical demos',
    'projects.title': 'Projects & Technical Demos',
    'projects.intro':
      'Self-contained data engineering and GenAI builds, each focused on a real operational problem rather than a tech-stack showcase. Open any card for the architecture, the key decisions behind it, and the code.',
    'projects.searchLabel': 'Filter projects by keyword',
    'projects.searchPlaceholder': 'Search — e.g. Kafka, data quality, Snowflake…',
    'projects.filters': 'Filter by area',
    'projects.loading': 'Loading projects…',
    'projects.error': 'Could not load projects. Please try again later.',
    'projects.none': 'No projects match these filters. Try another keyword or area.',
    'projects.count': (n) => `${n} project${n === 1 ? '' : 's'}`,
    'projects.toggle': 'Architecture & decisions',
    'projects.architecture': 'Architecture',
    'projects.decisions': 'Key decisions',
    'projects.stack': 'Stack',
    'projects.code': 'Code',
    'projects.codeSoon': 'Code coming soon',
    'projects.article': 'Article',
    'projects.ask': 'Ask the assistant',
    'projects.link': 'Link to this project',
    'projects.askQuestion': (title) =>
      `Tell me more about the ${title} project — what problem does it solve and what were the key technical decisions?`,
    'filter.all': 'All',
    'filter.genai': 'GenAI & agents',
    'filter.streaming': 'Streaming',
    'filter.mlops': 'ML & MLOps',
    'filter.orchestration': 'Orchestration',
    'status.live': 'Live',
    'status.complete': 'Complete',
    'status.in_progress': 'In progress',
    'status.planned': 'Planned',
  },

  fr: {
    'skip.chat': "Aller à l'assistant",
    'skip.projects': 'Aller aux projets',
    'nav.assistant': 'Assistant',
    'nav.projects': 'Projets',
    'nav.cv': 'CV',
    'header.book': 'Prendre rendez-vous',
    'header.theme': 'Basculer le mode sombre',
    'header.lang': 'Switch to English',
    'header.langShort': 'EN',

    'hero.badge': 'Ouvert aux postes senior & lead',
    'hero.title': 'Senior Cloud Data Engineer · Paris · TotalEnergies, ex-Deloitte',
    'metric.exp': "D'expérience",
    'metric.expValue': '9+ ans',
    'metric.certs': 'Certifications cloud',
    'metric.faster': 'Livraison de data products accélérée',
    'metric.langs': 'Langues',
    'tags.data': 'Data',
    'tags.cloud': 'Cloud',
    'tags.ai': 'IA',
    'hero.book': 'Réserver un appel de 30 min',
    'hero.projects': 'Voir les projets & démos',
    'hero.cv': 'Télécharger le CV',
    'mobile.book': 'Réserver un appel de 30 min',

    'chat.title': 'Posez-moi vos questions',
    'chat.status': 'Assistant IA · répond à partir de son CV, de la FAQ et des projets',
    'chat.greet1': 'Bonjour ! Je suis un assistant IA qui connaît le parcours de Mohammed Taha.',
    'chat.greet2':
      "Posez vos questions sur son expérience, sa stack, ses certifications ou le poste qu'il recherche, collez une offre d'emploi pour évaluer l'adéquation — ou cliquez sur une ligne du CV pour en savoir plus.",
    'chat.suggestions': 'Questions suggérées',
    'sugg.1': 'Quelle est sa stack technique principale ?',
    'sugg.2': 'Quel type de poste recherche-t-il ?',
    'sugg.3': 'Quelles certifications possède-t-il ?',
    'sugg.4': 'Quelle est son expérience en IA générative ?',
    'sugg.jd': 'Analyser une offre d’emploi',
    'chat.inputLabel': 'Votre question',
    'chat.placeholder': 'Expérience, compétences, disponibilité…',
    'chat.send': 'Envoyer',
    'chat.typing': "L'assistant écrit",
    'chat.new': 'Nouvelle conversation',
    'chat.email': 'Lui envoyer cette conversation par e-mail',
    'chat.jdOpen': 'Analyser une offre d’emploi',
    'chat.copy': 'Copier la réponse',
    'chat.copied': 'Copié',
    'chat.up': 'Utile',
    'chat.down': 'Pas utile',
    'chat.thanks': 'Merci pour votre retour',
    'chat.sources': 'Sources',
    'chat.handoff': 'Poursuivez lors d’un appel — vos questions seront ajoutées aux notes de réservation.',
    'chat.handoffBtn': 'Réserver avec ce contexte',
    'chat.errorNetwork': 'Erreur réseau — vérifiez votre connexion et réessayez.',
    'chat.error429': 'Vous avez envoyé beaucoup de questions — patientez quelques minutes et réessayez.',
    'chat.error403':
      "Ce site ne peut pas joindre l'assistant pour le moment. Réessayez plus tard ou réservez un appel.",
    'chat.error5xx': "L'assistant est momentanément indisponible. Réessayez dans un instant.",
    'chat.errorGeneric': "Une erreur s'est produite. Réessayez.",
    'chat.empty': "Désolé, je n'ai pas pu obtenir de réponse.",
    'chat.explain': (text) =>
      `Dites-m'en plus sur cette ligne : « ${text} » — quel était le vrai défi, l'approche choisie et l'impact ?`,

    'jd.title': 'Analyser une offre d’emploi',
    'jd.hint': "Collez l'offre ; l'assistant la compare à son expérience et à ses projets.",
    'jd.label': "Offre d'emploi",
    'jd.placeholder': "Collez l'offre d'emploi ici…",
    'jd.submit': "Évaluer l'adéquation",
    'jd.cancel': 'Annuler',
    'jd.tooShort': "Collez au moins quelques lignes de l'offre.",
    'jd.userMsg': (words) => `Offre d'emploi partagée (${words} mots) — quelle est son adéquation ?`,

    'email.subject': 'Conversation avec votre assistant',
    'email.intro': 'Bonjour Mohammed Taha,\n\nVoici ma conversation avec l’assistant de votre site :\n\n',
    'email.you': 'Moi',
    'email.bot': 'Assistant',
    'cal.notes': "Questions posées via l'assistant du site :",
    'cal.jd': "(a aussi partagé une offre d'emploi)",

    'resume.title': 'Expérience',
    'resume.sub': "Cliquez sur une ligne pour demander à l'assistant l'histoire derrière",
    'resume.loading': "Chargement de l'expérience…",
    'resume.error': "Impossible de charger l'expérience. Vous pouvez toujours interroger l'assistant.",
    'resume.more': (n) => `Afficher ${n} de plus`,
    'resume.less': 'Afficher moins',
    'resume.ask': 'Demander →',

    'projects.badge': 'Démos techniques concrètes',
    'projects.title': 'Projets & démos techniques',
    'projects.intro':
      "Des réalisations data engineering et IA générative autonomes, chacune centrée sur un vrai problème opérationnel plutôt qu'une vitrine technologique. Ouvrez une carte pour voir l'architecture, les décisions clés et le code.",
    'projects.searchLabel': 'Filtrer les projets par mot-clé',
    'projects.searchPlaceholder': 'Rechercher — ex. Kafka, qualité des données, Snowflake…',
    'projects.filters': 'Filtrer par domaine',
    'projects.loading': 'Chargement des projets…',
    'projects.error': 'Impossible de charger les projets. Réessayez plus tard.',
    'projects.none': 'Aucun projet ne correspond. Essayez un autre mot-clé ou domaine.',
    'projects.count': (n) => `${n} projet${n > 1 ? 's' : ''}`,
    'projects.toggle': 'Architecture & décisions',
    'projects.architecture': 'Architecture',
    'projects.decisions': 'Décisions clés',
    'projects.stack': 'Stack',
    'projects.code': 'Code',
    'projects.codeSoon': 'Code bientôt disponible',
    'projects.article': 'Article',
    'projects.ask': "Demander à l'assistant",
    'projects.link': 'Lien vers ce projet',
    'projects.askQuestion': (title) =>
      `Parlez-moi du projet « ${title} » — quel problème résout-il et quelles ont été les décisions techniques clés ?`,
    'filter.all': 'Tous',
    'filter.genai': 'IA générative & agents',
    'filter.streaming': 'Streaming',
    'filter.mlops': 'ML & MLOps',
    'filter.orchestration': 'Orchestration',
    'status.live': 'En ligne',
    'status.complete': 'Terminé',
    'status.in_progress': 'En cours',
    'status.planned': 'Prévu',
  },
};

function detect() {
  try {
    const saved = localStorage.getItem('lang');
    if (saved === 'en' || saved === 'fr') return saved;
  } catch {
    /* storage unavailable */
  }
  return (navigator.language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

export const lang = detect();

export function t(key, ...args) {
  const value = STRINGS[lang][key] ?? STRINGS.en[key] ?? key;
  return typeof value === 'function' ? value(...args) : value;
}

/** Apply translations to static markup. */
export function applyI18n(root = document) {
  document.documentElement.lang = lang;
  for (const node of root.querySelectorAll('[data-i18n]')) node.textContent = t(node.dataset.i18n);
  for (const node of root.querySelectorAll('[data-i18n-placeholder]'))
    node.placeholder = t(node.dataset.i18nPlaceholder);
  for (const node of root.querySelectorAll('[data-i18n-aria-label]'))
    node.setAttribute('aria-label', t(node.dataset.i18nAriaLabel));
  for (const node of root.querySelectorAll('[data-i18n-title]')) node.title = t(node.dataset.i18nTitle);
}

/** Header language switch: stores the choice and reloads (the conversation is kept in sessionStorage). */
export function initLangToggle() {
  const btn = document.querySelector('.lang-toggle');
  if (!btn) return;
  btn.addEventListener('click', () => {
    try {
      localStorage.setItem('lang', lang === 'fr' ? 'en' : 'fr');
    } catch {
      /* ignore */
    }
    window.location.reload();
  });
}
