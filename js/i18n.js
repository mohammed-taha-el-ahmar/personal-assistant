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

    'hero.badge': 'Open to senior roles & freelance missions',
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
      "Ask about his experience, tech stack, certifications, the roles or freelance missions he's open to, paste a job description or project brief to check the fit — or click any resume line for the story behind it.",
    'chat.suggestions': 'Suggested questions',
    'sugg.1': "What's his main tech stack?",
    'sugg.2': 'What kind of roles is he looking for?',
    'sugg.3': 'Tell me about his certifications',
    'sugg.4': "What's his experience with GenAI?",
    'sugg.jd': 'Match a job or project',
    'chat.inputLabel': 'Your question',
    'chat.placeholder': 'Ask about experience, skills, availability…',
    'chat.send': 'Send message',
    'chat.typing': 'Assistant is typing',
    'chat.new': 'New conversation',
    'chat.email': 'Email this conversation to him',
    'chat.jdOpen': 'Match a job description or project brief',
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

    'jd.title': 'Match a job description or project brief',
    'jd.hint': 'Paste a job description or a freelance project brief; the assistant compares it with his experience and projects.',
    'jd.label': 'Job description or project brief',
    'jd.placeholder': 'Paste the job description or project brief here…',
    'jd.submit': 'Check the fit',
    'jd.cancel': 'Cancel',
    'jd.tooShort': 'Please paste a few lines of the job description or brief.',
    'jd.userMsg': (words) => `Shared a job description or project brief (${words} words) — how well does he fit?`,

    'email.subject': 'Conversation with your website assistant',
    'email.intro': 'Hi Mohammed Taha,\n\nHere is the conversation I had with your website assistant:\n\n',
    'email.you': 'Me',
    'email.bot': 'Assistant',
    'cal.notes': 'Questions asked via the website assistant:',
    'cal.jd': '(also shared a job description or project brief)',

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

    'skip.content': 'Skip to content',
    'nav.services': 'Services',
    'nav.articles': 'Articles',
    'footer.bayanat': 'Bayanat',

    'articles.badge': 'Writing',
    'articles.title': 'Articles',
    'articles.intro':
      'Data engineering, data architecture and AI, written from production work. The code in every article is tested before it is published.',
    'articles.empty': 'The first articles are being written. Meanwhile, ask the assistant or browse the projects.',
    'articles.tested': 'Tested in CI',
    'cta.title': 'Facing this in your own platform?',
    'cta.text':
      'I help teams build reliable data platforms, as a freelance engineer or in a senior role. Ask the assistant, or book a short call.',
    'cta.services': 'See how I work',

    'services.badge': 'Freelance missions & senior roles',
    'services.title': 'Reliable data platforms, from design to production',
    'services.intro':
      'Over nine years of data engineering on Azure, AWS and GCP, from Deloitte to TotalEnergies. I take on freelance missions and I am open to senior and lead roles.',
    'services.offersKicker': 'Freelance',
    'services.offersTitle': 'Three ways to work together',
    'offer.review.kicker': 'Assess',
    'offer.review.title': 'Architecture, cost and data quality review',
    'offer.review.text': 'Your platform works, but costs, reliability or trust in the numbers are slipping.',
    'offer.review.1': 'Review of pipelines, Databricks and lakehouse set-up, CI/CD and infrastructure',
    'offer.review.2': 'Data quality and observability baseline on your critical datasets',
    'offer.review.3': 'A written, prioritised plan with quick wins',
    'offer.build.kicker': 'Build',
    'offer.build.title': 'Delivery mission',
    'offer.build.text': 'You know what you need and want it in production, maintainable by your team.',
    'offer.build.1': 'Ingestion and transformation pipelines (PySpark, Databricks, Azure, AWS, GCP)',
    'offer.build.2': 'Tests, data quality checks, CI/CD and Terraform from the first commit',
    'offer.build.3': 'GenAI on your data, such as natural-language querying with retrieval',
    'offer.train.kicker': 'Enable',
    'offer.train.title': 'Training and workshops',
    'offer.train.text': 'Your engineers need to get productive on a new stack or practice.',
    'offer.train.1': 'Databricks, data quality, code testing, GenAI for data teams',
    'offer.train.2': 'Hands-on sessions built on your own use cases',
    'offer.train.3': 'In English or French, remote or on site in the Paris region',
    'services.audienceKicker': 'Who I work with',
    'services.audienceTitle': 'Recruiters and clients',
    'aud.clients.title': 'For teams with a project',
    'aud.clients.text':
      'Paste your project brief into the assistant to see how my experience matches it, then book a call to scope the mission.',
    'aud.clients.cta': 'Check a project brief',
    'aud.recruiters.title': 'For recruiters',
    'aud.recruiters.text':
      'I am open to senior and lead data engineering roles. The assistant answers questions about my experience and can check a job description against my profile.',
    'aud.recruiters.cta': 'Ask the assistant',
    'services.principlesKicker': 'How I work',
    'services.principlesTitle': 'Principles',
    'pr.1.title': 'Production standards from day one',
    'pr.1.text': 'Tests, CI/CD, infrastructure as code and documentation are part of the work, not an extra phase.',
    'pr.2.title': 'Your team owns the result',
    'pr.2.text': 'Code in your repositories, decisions written down, and a handover before the mission ends.',
    'pr.3.title': 'Cost-aware by default',
    'pr.3.text': 'Compute tuning and storage best practices are part of every design.',
    'pr.4.title': 'Discretion',
    'pr.4.text': 'Client data and internal details stay confidential.',
    'services.ctaTitle': 'Tell me about your project',
    'services.ctaText': 'A short message is enough: what you are building, where it hurts, and your timeline.',
    'services.email': 'Email me',
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

    'hero.badge': 'Ouvert aux postes senior & missions freelance',
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
      "Posez vos questions sur son expérience, sa stack, ses certifications, les postes ou missions freelance qui l'intéressent, collez une offre d'emploi ou un cahier des charges pour évaluer l'adéquation — ou cliquez sur une ligne du CV pour en savoir plus.",
    'chat.suggestions': 'Questions suggérées',
    'sugg.1': 'Quelle est sa stack technique principale ?',
    'sugg.2': 'Quel type de poste recherche-t-il ?',
    'sugg.3': 'Quelles certifications possède-t-il ?',
    'sugg.4': 'Quelle est son expérience en IA générative ?',
    'sugg.jd': 'Analyser une offre ou un projet',
    'chat.inputLabel': 'Votre question',
    'chat.placeholder': 'Expérience, compétences, disponibilité…',
    'chat.send': 'Envoyer',
    'chat.typing': "L'assistant écrit",
    'chat.new': 'Nouvelle conversation',
    'chat.email': 'Lui envoyer cette conversation par e-mail',
    'chat.jdOpen': 'Analyser une offre d’emploi ou un cahier des charges',
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

    'jd.title': 'Analyser une offre d’emploi ou un cahier des charges',
    'jd.hint': "Collez une offre d'emploi ou un cahier des charges freelance ; l'assistant le compare à son expérience et à ses projets.",
    'jd.label': "Offre d'emploi ou cahier des charges",
    'jd.placeholder': "Collez l'offre d'emploi ou le cahier des charges ici…",
    'jd.submit': "Évaluer l'adéquation",
    'jd.cancel': 'Annuler',
    'jd.tooShort': "Collez au moins quelques lignes de l'offre ou du cahier des charges.",
    'jd.userMsg': (words) => `Offre ou cahier des charges partagé (${words} mots) — quelle est son adéquation ?`,

    'email.subject': 'Conversation avec votre assistant',
    'email.intro': 'Bonjour Mohammed Taha,\n\nVoici ma conversation avec l’assistant de votre site :\n\n',
    'email.you': 'Moi',
    'email.bot': 'Assistant',
    'cal.notes': "Questions posées via l'assistant du site :",
    'cal.jd': "(a aussi partagé une offre d'emploi ou un cahier des charges)",

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

    'skip.content': 'Aller au contenu',
    'nav.services': 'Services',
    'nav.articles': 'Articles',
    'footer.bayanat': 'Bayanat',

    'articles.badge': 'Écrits',
    'articles.title': 'Articles',
    'articles.intro':
      "Data engineering, architecture data et IA, à partir de projets réels. Le code de chaque article est testé avant publication. Les articles sont rédigés en anglais.",
    'articles.empty': "Les premiers articles sont en cours d'écriture. En attendant, interrogez l'assistant ou parcourez les projets.",
    'articles.tested': 'Testé en CI',
    'cta.title': 'Le même problème sur votre plateforme ?',
    'cta.text':
      "J'aide les équipes à construire des plateformes data fiables, en mission freelance ou en poste senior. Interrogez l'assistant ou réservez un court appel.",
    'cta.services': 'Voir comment je travaille',

    'services.badge': 'Missions freelance & postes senior',
    'services.title': 'Des plateformes data fiables, de la conception à la production',
    'services.intro':
      "Plus de neuf ans de data engineering sur Azure, AWS et GCP, de Deloitte à TotalEnergies. Je réalise des missions freelance et je suis ouvert aux postes senior et lead.",
    'services.offersKicker': 'Freelance',
    'services.offersTitle': 'Trois façons de travailler ensemble',
    'offer.review.kicker': 'Diagnostiquer',
    'offer.review.title': "Revue d'architecture, de coûts et de qualité des données",
    'offer.review.text': 'Votre plateforme fonctionne, mais les coûts, la fiabilité ou la confiance dans les chiffres se dégradent.',
    'offer.review.1': 'Revue des pipelines, de Databricks et du lakehouse, de la CI/CD et de l’infrastructure',
    'offer.review.2': 'État des lieux de la qualité et de l’observabilité sur vos données critiques',
    'offer.review.3': 'Un plan écrit et priorisé, avec des gains rapides',
    'offer.build.kicker': 'Construire',
    'offer.build.title': 'Mission de réalisation',
    'offer.build.text': 'Vous savez ce dont vous avez besoin et le voulez en production, maintenable par votre équipe.',
    'offer.build.1': "Pipelines d'ingestion et de transformation (PySpark, Databricks, Azure, AWS, GCP)",
    'offer.build.2': 'Tests, contrôles qualité, CI/CD et Terraform dès le premier commit',
    'offer.build.3': 'IA générative sur vos données, par exemple l’interrogation en langage naturel',
    'offer.train.kicker': 'Transmettre',
    'offer.train.title': 'Formations et ateliers',
    'offer.train.text': 'Vos ingénieurs doivent monter en compétence sur une nouvelle stack ou pratique.',
    'offer.train.1': 'Databricks, qualité des données, tests de code, IA générative pour les équipes data',
    'offer.train.2': 'Sessions pratiques construites sur vos propres cas',
    'offer.train.3': 'En français ou en anglais, à distance ou sur site en Île-de-France',
    'services.audienceKicker': 'Avec qui je travaille',
    'services.audienceTitle': 'Recruteurs et clients',
    'aud.clients.title': 'Pour les équipes avec un projet',
    'aud.clients.text':
      "Collez votre cahier des charges dans l'assistant pour voir en quoi mon expérience y répond, puis réservez un appel pour cadrer la mission.",
    'aud.clients.cta': 'Analyser un cahier des charges',
    'aud.recruiters.title': 'Pour les recruteurs',
    'aud.recruiters.text':
      "Je suis ouvert aux postes senior et lead en data engineering. L'assistant répond aux questions sur mon parcours et peut comparer une offre à mon profil.",
    'aud.recruiters.cta': "Interroger l'assistant",
    'services.principlesKicker': 'Ma façon de travailler',
    'services.principlesTitle': 'Principes',
    'pr.1.title': 'Des standards de production dès le premier jour',
    'pr.1.text': "Tests, CI/CD, infrastructure as code et documentation font partie du travail, pas d'une phase en plus.",
    'pr.2.title': 'Votre équipe garde la main',
    'pr.2.text': 'Le code dans vos dépôts, les décisions écrites, et une passation avant la fin de la mission.',
    'pr.3.title': 'Attentif aux coûts',
    'pr.3.text': 'Le réglage du calcul et les bonnes pratiques de stockage font partie de chaque conception.',
    'pr.4.title': 'Discrétion',
    'pr.4.text': 'Les données et les détails internes de mes clients restent confidentiels.',
    'services.ctaTitle': 'Parlez-moi de votre projet',
    'services.ctaText': 'Un court message suffit : ce que vous construisez, ce qui coince, et votre calendrier.',
    'services.email': "M'écrire",
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
