// Tiny i18n: English / French dictionaries, data-i18n attributes, and a language toggle.
//   <span data-i18n="key">                 → textContent
//   <input data-i18n-placeholder="key">    → placeholder
//   <div data-i18n-aria="key">             → aria-label
//   t("key", { n: 3 })                     → interpolation; "key_one" is used when n is singular

const DICT = {
  en: {
    "common.loading": "Loading…",
    "common.connecting": "Connecting…",
    "common.cancel": "Cancel",
    "common.skip": "Skip to content",
    "common.pts": "pts",
    "common.questionOf": "Question {n} of {total}",
    "lang.switch": "Passer en français",

    "join.pin": "Game PIN",
    "join.nickname": "Nickname",
    "join.enter": "Enter",
    "join.hosting": "Hosting a quiz?",
    "join.toDashboard": "Go to the dashboard",
    "join.err.pin": "The PIN has 6 digits.",
    "join.err.nickname": "Nickname: 1 to 15 characters.",
    "join.err.notFound": "No game with this PIN.",
    "join.err.started": "This game has already started.",
    "join.err.taken": "That nickname is taken.",
    "join.err.generic": "Could not join this game.",

    "play.youreIn": "You're in!",
    "play.seeName": "See your nickname on screen?",
    "play.waitHost": "Waiting for the host to start",
    "play.getReady": "Get ready…",
    "play.answerNow": "Answer now: choose a shape.",
    "play.chooseAnswer": "Choose your answer",
    "play.locked": "Answer locked in",
    "play.fastEnough": "Were you fast enough?",
    "play.tooLate": "Too late: answer not counted",
    "play.correct": "Correct!",
    "play.incorrect": "Incorrect",
    "play.timeUp": "Time's up",
    "play.streak": "Answer streak: {n}",
    "play.rank": "You're in {place} place",
    "play.leading": "You're in the lead!",
    "play.behind": "{points} points behind {name}",
    "play.finalRank": "{place} place",
    "play.thanks": "Thanks for playing!",
    "play.finished": "You finished {place} with {points} points.",
    "play.sumScore": "points",
    "play.sumCorrect": "correct",
    "play.sumStreak": "best streak",
    "play.again": "Play again",
    "play.backToJoin": "Back to join screen",
    "play.gameOver": "Game over",
    "play.notInGame": "You're not in this game",
    "play.removed": "The host may have removed you.",
    "play.hostOffline": "Host reconnecting… hang tight.",
    "play.textMode": "Show question and answers on my device",
    "play.secondsLeft": "{n} seconds left",
    "play.secondsLeft_one": "{n} second left",

    "auth.title": "Host a quiz",
    "auth.subtitle": "Sign in to create quizzes and run live games.",
    "auth.google": "Continue with Google",
    "auth.or": "or",
    "auth.tabSignIn": "Sign in",
    "auth.tabSignUp": "Create account",
    "auth.tabLink": "Email link",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.confirm": "Confirm password",
    "auth.displayName": "Your name",
    "auth.pwHint": "At least 8 characters.",
    "auth.signIn": "Sign in",
    "auth.createAccount": "Create account",
    "auth.forgot": "Forgot password?",
    "auth.linkExplain": "No password needed: we email you a one-time sign-in link.",
    "auth.sendLink": "Send me a sign-in link",
    "auth.linkSent": "Check {email}: click the link to sign in. You can close this tab.",
    "auth.resetSent": "Password reset email sent to {email}.",
    "auth.verifySent": "Verification email sent to {email}.",
    "auth.verifyNotice": "Please verify your email address.",
    "auth.resend": "Resend email",
    "auth.signOut": "Sign out",
    "auth.confirmEmailPrompt": "Confirm the email address you used to request the link:",
    "auth.err.generic": "Something went wrong. Please try again.",
    "auth.err.invalid-credential": "Wrong email or password.",
    "auth.err.wrong-password": "Wrong email or password.",
    "auth.err.user-not-found": "Wrong email or password.",
    "auth.err.invalid-email": "This email address is not valid.",
    "auth.err.missing-email": "Enter your email address first.",
    "auth.err.missing-name": "Enter your name.",
    "auth.err.email-already-in-use": "An account already exists with this email. Sign in instead.",
    "auth.err.weak-password": "Password too weak: use at least 8 characters.",
    "auth.err.password-mismatch": "Passwords don't match.",
    "auth.err.too-many-requests": "Too many attempts. Wait a moment and try again.",
    "auth.err.user-disabled": "This account has been disabled.",
    "auth.err.popup-closed-by-user": "Sign-in window closed before finishing.",
    "auth.err.network-request-failed": "Network error. Check your connection.",
    "auth.err.invalid-action-code": "This link is invalid or was already used.",
    "auth.err.expired-action-code": "This link has expired. Request a new one.",
    "auth.err.operation-not-allowed": "This sign-in method is not enabled in Firebase.",
    "auth.err.unauthorized-domain": "This domain is not authorized in Firebase Authentication settings.",
    "auth.err.unauthorized-continue-uri": "This domain is not authorized in Firebase Authentication settings.",

    "dash.title": "My quizzes",
    "dash.new": "+ New quiz",
    "dash.empty": "No quizzes yet. Create your first one!",
    "dash.questions": "{n} questions",
    "dash.questions_one": "{n} question",
    "dash.host": "Host live",
    "dash.edit": "Edit",
    "dash.stats": "Stats",
    "dash.duplicate": "Duplicate",
    "dash.delete": "Delete",
    "dash.copy": "copy",
    "dash.confirmDelete": "Delete \"{title}\"?",
    "dash.noQuestions": "This quiz has no questions yet.",
    "dash.noPin": "Could not find a free PIN, try again.",

    "edit.save": "Save quiz",
    "edit.title": "Quiz title",
    "edit.titlePh": "e.g. Data engineering trivia",
    "edit.description": "Description (optional)",
    "edit.add": "+ Add question",
    "edit.question": "Question {n}",
    "edit.questionText": "Type your question",
    "edit.image": "Image URL (optional, https)",
    "edit.timeLimit": "Time limit",
    "edit.seconds": "{n} seconds",
    "edit.points": "Points",
    "edit.pointsStandard": "Standard",
    "edit.pointsDouble": "Double points",
    "edit.pointsNone": "No points",
    "edit.answer": "Answer {n}",
    "edit.optional": "optional",
    "edit.isCorrect": "Correct answer",
    "edit.answerCorrect": "Answer {n} is correct",
    "edit.moveUp": "Move question up",
    "edit.moveDown": "Move question down",
    "edit.needOne": "A quiz needs at least one question.",
    "edit.notFound": "Quiz not found",
    "edit.err.title": "Give your quiz a title.",
    "edit.err.text": "the question text is empty.",
    "edit.err.answers": "add at least two answers.",
    "edit.err.correct": "tick at least one correct answer.",
    "edit.err.image": "the image URL must start with https://",

    "host.joinAt": "Join at",
    "host.pin": "Game PIN",
    "host.qr": "QR code to join the game",
    "host.start": "Start",
    "host.players": "{n} players",
    "host.players_one": "{n} player",
    "host.waiting": "Waiting for players…",
    "host.clickToRemove": "Click a name to remove a player.",
    "host.removePlayer": "Remove {name}",
    "host.confirmRemove": "Remove {name}?",
    "host.skip": "Skip ⏭",
    "host.answers": "answers",
    "host.next": "Next",
    "host.scoreboard": "Scoreboard",
    "host.nextQuestion": "Next question",
    "host.showPodium": "Show podium",
    "host.noPlayers": "No players.",
    "host.correctAnswer": "correct answer",
    "host.csv": "Download results (CSV)",
    "host.end": "End game",
    "host.confirmEnd": "End the game? Players will be disconnected and live results deleted (download the CSV first; stats stay available).",
    "host.cantOpen": "Can't open this game",
    "host.backDash": "Back to dashboard",
    "host.mute": "Mute sound",
    "host.unmute": "Unmute sound",
    "host.fullscreen": "Full screen",
    "host.exitFullscreen": "Exit full screen",
    "host.err.gone": "This game doesn't exist anymore.",
    "host.err.notHost": "You are not the host of this game.",
    "host.err.quizDeleted": "The quiz for this game was deleted.",
    "host.err.endQuestion": "Could not end the question:",

    "stats.back": "← Dashboard",
    "stats.subtitle": "How players answered, question by question.",
    "stats.session": "Session",
    "stats.allSessions": "All sessions",
    "stats.export": "Export events (CSV)",
    "stats.perQuestion": "Questions",
    "stats.sessions": "Sessions",
    "stats.kpiSessions": "sessions",
    "stats.kpiPlayers": "players",
    "stats.kpiCorrect": "correct answers",
    "stats.kpiAnswerRate": "answer rate",
    "stats.kpiMedian": "median response time",
    "stats.qLine": "{correct}% correct · {noAnswer}% no answer · median {median} · {n} responses",
    "stats.flagHard": "Too hard",
    "stats.flagEasy": "Too easy",
    "stats.flagTrap": "Misleading distractor",
    "stats.colDate": "Date",
    "stats.colStatus": "Status",
    "stats.colWinner": "Winner",
    "stats.status.running": "Not finished",
    "stats.status.completed": "Completed",
    "stats.status.undefined": "—",
    "stats.emptyTitle": "No data yet",
    "stats.emptyText": "Stats appear here after you host this quiz live.",
  },

  fr: {
    "common.loading": "Chargement…",
    "common.connecting": "Connexion…",
    "common.cancel": "Annuler",
    "common.skip": "Aller au contenu",
    "common.pts": "pts",
    "common.questionOf": "Question {n} sur {total}",
    "lang.switch": "Switch to English",

    "join.pin": "Code PIN",
    "join.nickname": "Pseudo",
    "join.enter": "Entrer",
    "join.hosting": "Vous animez un quiz ?",
    "join.toDashboard": "Aller au tableau de bord",
    "join.err.pin": "Le PIN comporte 6 chiffres.",
    "join.err.nickname": "Pseudo : 1 à 15 caractères.",
    "join.err.notFound": "Aucune partie avec ce PIN.",
    "join.err.started": "Cette partie a déjà commencé.",
    "join.err.taken": "Ce pseudo est déjà pris.",
    "join.err.generic": "Impossible de rejoindre cette partie.",

    "play.youreIn": "C'est parti !",
    "play.seeName": "Vous voyez votre pseudo à l'écran ?",
    "play.waitHost": "En attente du lancement",
    "play.getReady": "Préparez-vous…",
    "play.answerNow": "Répondez : choisissez une forme.",
    "play.chooseAnswer": "Choisissez votre réponse",
    "play.locked": "Réponse enregistrée",
    "play.fastEnough": "Assez rapide ?",
    "play.tooLate": "Trop tard : réponse non prise en compte",
    "play.correct": "Bonne réponse !",
    "play.incorrect": "Mauvaise réponse",
    "play.timeUp": "Temps écoulé",
    "play.streak": "Série : {n}",
    "play.rank": "Vous êtes {place}",
    "play.leading": "Vous êtes en tête !",
    "play.behind": "{points} points derrière {name}",
    "play.finalRank": "{place} place",
    "play.thanks": "Merci d'avoir joué !",
    "play.finished": "Vous terminez {place} avec {points} points.",
    "play.sumScore": "points",
    "play.sumCorrect": "bonnes réponses",
    "play.sumStreak": "meilleure série",
    "play.again": "Rejouer",
    "play.backToJoin": "Retour à l'accueil",
    "play.gameOver": "Partie terminée",
    "play.notInGame": "Vous n'êtes pas dans cette partie",
    "play.removed": "L'animateur vous a peut-être retiré.",
    "play.hostOffline": "L'animateur se reconnecte… patientez.",
    "play.textMode": "Afficher la question et les réponses sur mon appareil",
    "play.secondsLeft": "{n} secondes restantes",
    "play.secondsLeft_one": "{n} seconde restante",

    "auth.title": "Animer un quiz",
    "auth.subtitle": "Connectez-vous pour créer des quiz et lancer des parties.",
    "auth.google": "Continuer avec Google",
    "auth.or": "ou",
    "auth.tabSignIn": "Connexion",
    "auth.tabSignUp": "Créer un compte",
    "auth.tabLink": "Lien par e-mail",
    "auth.email": "E-mail",
    "auth.password": "Mot de passe",
    "auth.confirm": "Confirmer le mot de passe",
    "auth.displayName": "Votre nom",
    "auth.pwHint": "8 caractères minimum.",
    "auth.signIn": "Se connecter",
    "auth.createAccount": "Créer le compte",
    "auth.forgot": "Mot de passe oublié ?",
    "auth.linkExplain": "Sans mot de passe : nous vous envoyons un lien de connexion à usage unique.",
    "auth.sendLink": "Recevoir un lien de connexion",
    "auth.linkSent": "Consultez {email} : cliquez sur le lien pour vous connecter. Vous pouvez fermer cet onglet.",
    "auth.resetSent": "E-mail de réinitialisation envoyé à {email}.",
    "auth.verifySent": "E-mail de vérification envoyé à {email}.",
    "auth.verifyNotice": "Merci de vérifier votre adresse e-mail.",
    "auth.resend": "Renvoyer l'e-mail",
    "auth.signOut": "Se déconnecter",
    "auth.confirmEmailPrompt": "Confirmez l'adresse e-mail utilisée pour demander le lien :",
    "auth.err.generic": "Une erreur est survenue. Réessayez.",
    "auth.err.invalid-credential": "E-mail ou mot de passe incorrect.",
    "auth.err.wrong-password": "E-mail ou mot de passe incorrect.",
    "auth.err.user-not-found": "E-mail ou mot de passe incorrect.",
    "auth.err.invalid-email": "Cette adresse e-mail n'est pas valide.",
    "auth.err.missing-email": "Saisissez d'abord votre adresse e-mail.",
    "auth.err.missing-name": "Saisissez votre nom.",
    "auth.err.email-already-in-use": "Un compte existe déjà avec cet e-mail. Connectez-vous.",
    "auth.err.weak-password": "Mot de passe trop faible : 8 caractères minimum.",
    "auth.err.password-mismatch": "Les mots de passe ne correspondent pas.",
    "auth.err.too-many-requests": "Trop de tentatives. Patientez puis réessayez.",
    "auth.err.user-disabled": "Ce compte a été désactivé.",
    "auth.err.popup-closed-by-user": "Fenêtre de connexion fermée avant la fin.",
    "auth.err.network-request-failed": "Erreur réseau. Vérifiez votre connexion.",
    "auth.err.invalid-action-code": "Ce lien est invalide ou déjà utilisé.",
    "auth.err.expired-action-code": "Ce lien a expiré. Demandez-en un nouveau.",
    "auth.err.operation-not-allowed": "Cette méthode de connexion n'est pas activée dans Firebase.",
    "auth.err.unauthorized-domain": "Ce domaine n'est pas autorisé dans les paramètres Firebase Authentication.",
    "auth.err.unauthorized-continue-uri": "Ce domaine n'est pas autorisé dans les paramètres Firebase Authentication.",

    "dash.title": "Mes quiz",
    "dash.new": "+ Nouveau quiz",
    "dash.empty": "Aucun quiz pour l'instant. Créez le premier !",
    "dash.questions": "{n} questions",
    "dash.questions_one": "{n} question",
    "dash.host": "Lancer en direct",
    "dash.edit": "Modifier",
    "dash.stats": "Stats",
    "dash.duplicate": "Dupliquer",
    "dash.delete": "Supprimer",
    "dash.copy": "copie",
    "dash.confirmDelete": "Supprimer « {title} » ?",
    "dash.noQuestions": "Ce quiz n'a pas encore de questions.",
    "dash.noPin": "Aucun PIN libre trouvé, réessayez.",

    "edit.save": "Enregistrer",
    "edit.title": "Titre du quiz",
    "edit.titlePh": "ex. : Quiz data engineering",
    "edit.description": "Description (facultatif)",
    "edit.add": "+ Ajouter une question",
    "edit.question": "Question {n}",
    "edit.questionText": "Saisissez votre question",
    "edit.image": "URL d'image (facultatif, https)",
    "edit.timeLimit": "Temps limite",
    "edit.seconds": "{n} secondes",
    "edit.points": "Points",
    "edit.pointsStandard": "Standard",
    "edit.pointsDouble": "Points doublés",
    "edit.pointsNone": "Sans points",
    "edit.answer": "Réponse {n}",
    "edit.optional": "facultatif",
    "edit.isCorrect": "Bonne réponse",
    "edit.answerCorrect": "La réponse {n} est correcte",
    "edit.moveUp": "Monter la question",
    "edit.moveDown": "Descendre la question",
    "edit.needOne": "Un quiz doit contenir au moins une question.",
    "edit.notFound": "Quiz introuvable",
    "edit.err.title": "Donnez un titre à votre quiz.",
    "edit.err.text": "le texte de la question est vide.",
    "edit.err.answers": "ajoutez au moins deux réponses.",
    "edit.err.correct": "cochez au moins une bonne réponse.",
    "edit.err.image": "l'URL de l'image doit commencer par https://",

    "host.joinAt": "Rejoignez sur",
    "host.pin": "Code PIN",
    "host.qr": "QR code pour rejoindre la partie",
    "host.start": "Lancer",
    "host.players": "{n} joueurs",
    "host.players_one": "{n} joueur",
    "host.waiting": "En attente des joueurs…",
    "host.clickToRemove": "Cliquez sur un nom pour retirer un joueur.",
    "host.removePlayer": "Retirer {name}",
    "host.confirmRemove": "Retirer {name} ?",
    "host.skip": "Passer ⏭",
    "host.answers": "réponses",
    "host.next": "Suivant",
    "host.scoreboard": "Classement",
    "host.nextQuestion": "Question suivante",
    "host.showPodium": "Voir le podium",
    "host.noPlayers": "Aucun joueur.",
    "host.correctAnswer": "bonne réponse",
    "host.csv": "Télécharger les résultats (CSV)",
    "host.end": "Terminer la partie",
    "host.confirmEnd": "Terminer la partie ? Les joueurs seront déconnectés et les résultats en direct supprimés (téléchargez le CSV avant ; les stats restent disponibles).",
    "host.cantOpen": "Impossible d'ouvrir cette partie",
    "host.backDash": "Retour au tableau de bord",
    "host.mute": "Couper le son",
    "host.unmute": "Activer le son",
    "host.fullscreen": "Plein écran",
    "host.exitFullscreen": "Quitter le plein écran",
    "host.err.gone": "Cette partie n'existe plus.",
    "host.err.notHost": "Vous n'êtes pas l'animateur de cette partie.",
    "host.err.quizDeleted": "Le quiz de cette partie a été supprimé.",
    "host.err.endQuestion": "Impossible de terminer la question :",

    "stats.back": "← Tableau de bord",
    "stats.subtitle": "Les réponses des joueurs, question par question.",
    "stats.session": "Session",
    "stats.allSessions": "Toutes les sessions",
    "stats.export": "Exporter les événements (CSV)",
    "stats.perQuestion": "Questions",
    "stats.sessions": "Sessions",
    "stats.kpiSessions": "sessions",
    "stats.kpiPlayers": "joueurs",
    "stats.kpiCorrect": "bonnes réponses",
    "stats.kpiAnswerRate": "taux de réponse",
    "stats.kpiMedian": "temps de réponse médian",
    "stats.qLine": "{correct} % de bonnes réponses · {noAnswer} % sans réponse · médiane {median} · {n} réponses",
    "stats.flagHard": "Trop difficile",
    "stats.flagEasy": "Trop facile",
    "stats.flagTrap": "Distracteur piège",
    "stats.colDate": "Date",
    "stats.colStatus": "Statut",
    "stats.colWinner": "Gagnant",
    "stats.status.running": "Non terminée",
    "stats.status.completed": "Terminée",
    "stats.status.undefined": "—",
    "stats.emptyTitle": "Pas encore de données",
    "stats.emptyText": "Les stats apparaissent ici après avoir animé ce quiz en direct.",
  },
};

const SHAPE_NAMES = {
  en: ["Red triangle", "Blue diamond", "Yellow circle", "Green square"],
  fr: ["Triangle rouge", "Losange bleu", "Cercle jaune", "Carré vert"],
};

const LANGS = Object.keys(DICT);
let lang = (() => {
  try {
    const saved = localStorage.getItem("quizlive:lang");
    if (LANGS.includes(saved)) return saved;
  } catch { /* storage blocked */ }
  return (navigator.language || "en").toLowerCase().startsWith("fr") ? "fr" : "en";
})();
const listeners = new Set();

export const getLang = () => lang;

export function t(key, vars = {}) {
  const dict = DICT[lang];
  let k = key;
  if (typeof vars.n === "number") {
    const singular = lang === "fr" ? vars.n < 2 : vars.n === 1;
    if (singular && (`${key}_one` in dict)) k = `${key}_one`;
  }
  const s = dict[k] ?? DICT.en[k] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, name) => (vars[name] ?? ""));
}

export function ordinal(n) {
  if (lang === "fr") return n === 1 ? "1er" : `${n}e`;
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export const shapeName = (i) => SHAPE_NAMES[lang][i];

export function applyI18n(root = document) {
  document.documentElement.lang = lang;
  root.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  root.querySelectorAll("[data-i18n-aria]").forEach((el) => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
}

export function setLang(next) {
  if (!LANGS.includes(next) || next === lang) return;
  lang = next;
  try { localStorage.setItem("quizlive:lang", lang); } catch { /* ignore */ }
  applyI18n();
  listeners.forEach((fn) => fn(lang));
}

export const onLangChange = (fn) => listeners.add(fn);

export function initI18n() {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => applyI18n());
  else applyI18n();
}

// Button showing the *other* language ("FR" while in English, "EN" while in French).
export function mountLangToggle(container) {
  const btn = document.createElement("button");
  btn.className = "icon-btn";
  const sync = () => {
    const other = lang === "fr" ? "en" : "fr";
    btn.textContent = other.toUpperCase();
    btn.setAttribute("aria-label", t("lang.switch"));
    btn.setAttribute("lang", other);
    btn.title = t("lang.switch");
  };
  btn.addEventListener("click", () => setLang(lang === "fr" ? "en" : "fr"));
  onLangChange(sync);
  sync();
  container.append(btn);
  return btn;
}
