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

## Données dans Firestore

```
users/{uid}                     { state, updatedAt, consent: {version, at} }
users/{uid}/events/{AAAA-MM}    { events: [{t, p, k, g, d, e, w, m, r, part}] }
```

`state` contient les réglages et l'état de chaque page (statut, stabilité S, difficulté, dernière révision…). Les événements (une ligne par révision, avec le R prédit avant la révision) servent à recalibrer plus tard le modèle d'oubli. Les règles `firestore.rules` limitent chaque utilisateur à ses propres documents.

## Rappels

Le bouton « Ajouter à mon agenda » génère un événement quotidien (.ics) avec alerte. De vraies notifications push demanderaient Firebase Cloud Messaging et une fonction planifiée (offre Blaze, payante à l'usage).
