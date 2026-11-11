# Sourah – application de mémorisation du Coran (PWA)

Web app installable sur téléphone (Android et iOS) : planning sabaq / sabqi / manzil avec répétition espacée, mushaf de Médine (604 pages), test à voix haute ou par première lettre, audio verset par verset, carte de force, planning sur 30 jours, interface en français, anglais et arabe, comptes et synchronisation Firebase avec sauvegarde locale.

Aucune étape de build : ce sont des fichiers statiques dans `public/`.

## Structure

```
public/
  index.html, manifest.webmanifest, sw.js (hors ligne), privacy.html
  quran.json            texte uthmani + découpage en pages + noms des sourates
  fonts/amiri-quran.woff2
  css/app.css
  js/config.js          ← configuration Firebase, récitateurs
  js/app.js             écrans
  js/planner.js         logique de planification (pure, testée)
  js/store.js           sauvegarde locale + Firestore
  js/audio.js           lecteur verset par verset
  js/i18n.js            traductions FR / EN / AR
firebase.json, firestore.rules, .firebaserc
tests/planner.test.js
```

## Tester en local

```bash
npm test                 # tests du planificateur
npx serve public         # puis ouvrir http://localhost:3000
```

Sans configuration Firebase, l'app tourne en mode local (progression dans le navigateur).

## Mettre en ligne avec Firebase (environ 15 minutes)

1. **Créer le projet** sur https://console.firebase.google.com (offre gratuite Spark).
2. **Firestore** : Build > Firestore Database > Créer, mode production, emplacement **europe-west1** (ou multi-région `eur3`). L'emplacement ne peut plus être changé ensuite.
3. **Authentication** : Build > Authentication > Commencer, puis activer **Google** et **E-mail/Mot de passe**.
4. **App web** : Paramètres du projet > Vos applications > icône Web `</>`. Copier l'objet `firebaseConfig` dans `public/js/config.js`.
5. **ID du projet** : le remplacer dans `.firebaserc`.
6. **Déployer** depuis ce dossier :
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase deploy --only hosting,firestore:rules
   ```
   L'app est alors en ligne sur `https://<id-du-projet>.web.app`.
7. **Domaine personnalisé** (optionnel) : Hosting > Ajouter un domaine personnalisé, puis l'ajouter aussi dans Authentication > Paramètres > Domaines autorisés.

Sur le téléphone, ouvrir l'adresse puis « Ajouter à l'écran d'accueil » (Safari) ou « Installer l'application » (Chrome).

## Avant d'ouvrir au public

- **Politique de confidentialité** : compléter `public/privacy.html` (responsable du traitement, contact). La progression de hifz révèle une pratique religieuse, donc c'est une donnée sensible au sens du RGPD (article 9). L'app recueille un consentement explicite avant toute synchronisation, et la suppression du compte efface toutes les données.
- **Licences** : texte uthmani (The Noble Qur'an Encyclopedia, via quran-json, CC BY-SA 4.0), police Amiri Quran (OFL, voir `fonts/OFL.txt`). L'audio est lu directement depuis EveryAyah : vérifier ses conditions d'utilisation pour un usage public, ou héberger vos propres fichiers et changer `AUDIO_URL` dans `config.js`.
- **Glyphe modifié** : le texte source encode le tanwin ouvert avec U+065E, qu'Amiri ne contient pas. Il est remplacé par U+08F1 (tanwin damm ouvert). À faire valider par une personne qui maîtrise l'écriture uthmanie.


## Nouveautés v2

- **Enregistrer sa récitation** pendant un test « À voix haute », puis se réécouter en suivant le texte. Les enregistrements restent sur l'appareil (IndexedDB, 40 derniers, 4 min max chacun, opus 24 kbit/s).
- **Binôme / enseignant** (onglet Binôme, compte requis) : le récitant crée un code d'invitation (valable 7 jours), le correcteur le saisit. Le récitant envoie ses enregistrements ; le correcteur écoute, touche les mots erronés et les versets oubliés, donne une note et un commentaire écrit et/ou vocal (3 min max) ; le récitant reçoit la correction et peut replanifier la page pour le lendemain.
- **Mutashabihat** : 1 539 versets ont au moins un verset très proche (calcul sur le texte sans voyelles, `mutashabihat.json`). Comparaison côte à côte avec les mots différents surlignés, depuis la fiche d'une page, après une erreur sur un verset concerné, et en révision groupée depuis « Mon Coran ».

L'audio partagé est stocké dans Firestore en morceaux base64 (`reviews/{id}/audio/{n}`), ce qui évite Cloud Storage et reste compatible avec l'offre gratuite Spark. Les règles `firestore.rules` limitent la lecture d'une récitation au récitant et à ses correcteurs.

```
invites/{code}        { owner, ownerName, createdAt, expiresAt }
pairs/{learner_reviewer} { learner, learnerName, reviewer, reviewerName, code }
reviews/{id}          { learner, learnerName, reviewers[], page, part, parts, mime, duration, chunks, status, review{by, byName, errors[], forgot[], grade, comment}, seen }
reviews/{id}/audio/{n} { data }      récitation
reviews/{id}/comment/{n} { data }    commentaire vocal du correcteur (review.voice = {mime, duration, chunks})
```


## Sens et tafsir

Toucher un mot ou un numéro de verset (pendant l'apprentissage, à la correction, dans la fiche d'une page, le verset du jour…) ouvre son explication ; pendant un test à voix haute, c'est un appui long, pour ne pas gêner le marquage des erreurs. La fiche affiche :

- le mot : translittération, sens mot à mot (anglais) et explication du vocabulaire rare (Al-Muyassar fi Al-Gharib, en arabe) ;
- la traduction du sens du verset (français : Muhammad Hamidullah, anglais : Saheeh International, via quran-json) ;
- le tafsir au choix : Al-Mukhtasar en français ou en anglais (Centre de Tafsir pour les études coraniques) ou At-Tafsir Al-Muyassar (arabe).

Les données sont auto-hébergées dans `public/meaning/{page}.json` (604 fichiers, 12 Mo au total, environ 20 Ko par page) et mises en cache hors ligne par le service worker après la première consultation. Sources : [spa5k/tafsir_api](https://github.com/spa5k/tafsir_api) (données QUL / Tarteel, tag v1.2.2), [quran-json](https://www.npmjs.com/package/quran-json), [@kmaslesa/holy-quran-word-by-word-full-data](https://www.npmjs.com/package/@kmaslesa/holy-quran-word-by-word-full-data). **Avant une diffusion publique, vérifier les conditions d'utilisation de chaque tafsir et traduction** (la plupart autorisent un usage non commercial avec attribution). Script de génération : `tools/build_meaning.py`.


## Mode enfant et suivi parent

- **Profils enfants** (Réglages > Famille) : prénom, avatar, plan adapté (5 à 20 min, ¼ ou ½ page), juz déjà connus. Un **code parent** à 4 chiffres protège la sortie du mode enfant.
- **Interface enfant** : deux onglets seulement (Aujourd'hui, Étoiles), un grand bouton « C'est parti ! », test à voix haute avec indice de première lettre, évaluation simple par le parent (⭐⭐⭐ / ⭐⭐ / ⭐), audio répété 3 fois par défaut.
- **Étoiles et récompenses** : l'enfant gagne des étoiles (3 par passage appris, 1 à 2 par page révisée, 1 par bonne réponse au quiz). Le parent définit des récompenses (coût en étoiles) ; l'enfant les demande, le parent les accorde.
- **Suivi parent** : carte « Ma famille » sur l'écran du jour et tableau de bord par enfant (séance du jour faite ou non, série, pages, étoiles, semaine, passage en cours, dernier quiz, badges, demandes de récompense, réglage du plan). Si l'enfant utilise son propre appareil connecté au même compte, le suivi se met à jour en direct (`users/{uid}/children/{id}`). Chaque appareil n'écrit que ses propres champs : l'enfant écrit `state`, `earned`, `requests` ; le parent écrit `rewards`, `given`, `plan`.

## Motivation

- **Rappel du jour** (hadith ou verset) sur l'écran du jour, et un rappel adapté en fin de séance : encouragement si la séance a été difficile, rappel de l'importance de la révision, ou de l'élévation par le Coran après un nouveau passage mémorisé.
- **11 hadiths authentiques** avec leurs références (Al-Bukhari, Muslim, Abu Dawud, At-Tirmidhi), une version simplifiée pour les enfants, et **10 versets** sur le Coran (`js/motivation.js`). Les traductions sont des traductions du sens : **à faire relire par une personne qualifiée avant publication**.
- **14 badges** de progression (première page, première sourate, séries de 7, 30 et 100 jours, juz, quiz parfait…), visibles dans « Mon Coran », célébrés en fin de séance, avec le prochain badge à viser sur l'écran du jour.

## Données dans Firestore

```
users/{uid}                     { state, updatedAt, consent: {version, at} }
users/{uid}/children/{id}      { name, avatar, state, earned, requests, rewards, given, plan }
users/{uid}/events/{AAAA-MM}    { events: [{t, p, k, g, d, e, w, m, r, part}] }
```

`state` contient les réglages et l'état de chaque page (statut, stabilité S, difficulté, dernière révision…). Les événements (une ligne par révision, avec le R prédit avant la révision) servent à recalibrer plus tard le modèle d'oubli. Les règles `firestore.rules` limitent chaque utilisateur à ses propres documents.

## Rappels

Le bouton « Ajouter à mon agenda » génère un événement quotidien (.ics) avec alerte. De vraies notifications push demanderaient Firebase Cloud Messaging et une fonction planifiée (offre Blaze, payante à l'usage).
