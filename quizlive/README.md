# QuizLive

A Kahoot-style live quiz app in plain HTML, CSS and JavaScript (ES modules, no build step).
Firebase provides authentication and real-time data; GitHub Pages hosts the static files.
The UI is in English and French.

| Page | Who | What |
|---|---|---|
| `index.html` | Player | Enter the game PIN and a nickname |
| `play.html` | Player | Answer buttons, feedback, rank and gap to the next player, final summary |
| `dashboard.html` | Host | Sign in (Google, email + password, or email link); list, duplicate and delete quizzes; launch a game |
| `editor.html` | Host | Create or edit a quiz (2–4 answers, time limit, points) |
| `host.html` | Host | Projected screen: lobby, PIN and QR code, question intro, timer, reveal, scoreboard, podium, sound, full screen |
| `analytics.html` | Host | Per-quiz stats: difficulty, distractors, sessions, CSV export |

## Features
- **Accounts:** Google, email and password (with email verification and password reset), or a
  passwordless email link. Players stay anonymous.
- **Fair play:** answers live in `gameAnswers/{pin}`, which only the host can read, so players can't
  see what others picked. Correct answers are revealed only after the timer. Each player gets one
  server-timestamped answer per question, accepted only inside the question window.
- **Host presence:** if the host's connection drops, players see "Host reconnecting…".
  Refreshing the host page resumes the game in any phase.
- **Question intro:** the question is shown alone for 4 seconds before the answers open (`INTRO_MS` in `js/utils.js`).
- **Lobby:** player names pop in with a join sound, plus a QR code, full-screen mode, and click-to-remove.
- **Player screen:** vibration on answer and result, "N points behind X", a final summary
  (score, correct answers, best streak), and an optional **Aa** mode that shows the question and answers on the phone.
- **Sound:** lobby music, "thinking" loop, countdown ticks, gong, reveal sting, and podium fanfare.
  All of it is synthesised with the Web Audio API (no files). There's a mute toggle.
- **Accessibility:** shape and colour on every answer, screen-reader labels and live announcements,
  visible focus, `prefers-reduced-motion` support, darker yellow for text contrast, and a `lang` attribute
  that follows the language toggle.
- **Analytics:** one event per player per question goes to Firestore, feeding an in-app stats page and an
  optional BigQuery pipeline with SQL models and data quality checks. See [`analytics/README.md`](analytics/README.md).

## How it works
- **Firestore:** the quiz library (`quizzes`) and analytics (`gameSessions`, `answerEvents`), each readable only by its owner.
- **Realtime Database:** live games (`games/{pin}`: state, players, reveal, hostOnline) and
  answers (`gameAnswers/{pin}`, host-only read).
- **The host's browser runs the game:**
  `lobby → intro → question → reveal → leaderboard → … → podium`.
  It keeps the correct answers in memory until the reveal and computes the scores. The rules in
  `database.rules.json` enforce all of this, so no Cloud Functions are needed (free Spark plan).
- **Scoring:** `points × (1 − (seconds / timeLimit) / 2)` for a correct answer, plus a streak bonus
  of +100 per consecutive correct answer, capped at +500.

## Setup

### 1. Firebase project
1. Create a project at <https://console.firebase.google.com>.
2. In **Authentication → Sign-in method**, enable:
   - **Google**
   - **Email/Password**, and turn on **Email link (passwordless sign-in)** in the same provider
   - **Anonymous** (for players)
3. Optionally, in **Authentication → Templates**, set the template language to French or customise the emails.
   The app also sends the UI language with each email.
4. Create a **Firestore Database** (production mode).
5. Create a **Realtime Database** (`europe-west1`, for example).
6. In **Project settings → Your apps → Web app (`</>`)**, register an app and copy the config.

### 2. Configure
Paste your config into `js/firebase.js`. Use the exact `databaseURL` shown in the console.

### 3. Deploy the security rules
```bash
npm install -g firebase-tools
firebase login
firebase use --add
firebase deploy --only database,firestore:rules
```

### 4. Run locally
```bash
npx serve .          # or: python3 -m http.server 8000
```

### 5. Host on GitHub Pages
```bash
git init && git add . && git commit -m "QuizLive"
git branch -M main
git remote add origin https://github.com/<you>/quizlive.git
git push -u origin main
```
1. In the repo, go to **Settings → Pages**, set the source to `main` / `/ (root)`.
2. In Firebase, go to **Authentication → Settings → Authorized domains** and add `<you>.github.io`.
   Google sign-in **and** email links both need this.

## Testing alone
Sign-in state is shared per browser, so use a **different browser or a private window** for each player.
The email link returns to `dashboard.html`. If you open it on another device, you'll be asked to confirm your email.

## Project structure
```
index.html  play.html  dashboard.html  editor.html  host.html  analytics.html
css/styles.css
js/firebase.js    Firebase init and server clock (the only file to edit)
js/i18n.js        English and French strings, language toggle
js/sound.js       Web Audio sound effects
js/utils.js       helpers: scoring, shapes, views, CSV, accessibility
js/join.js  js/player.js  js/dashboard.js  js/editor.js  js/host.js  js/analytics.js
database.rules.json  firestore.rules  firebase.json
analytics/        BigQuery pipeline: README and SQL models
```

## Adding a language
Copy the `en` block in `js/i18n.js`, translate it, and add the shape names to `SHAPE_NAMES`.
The toggle currently switches between two languages; for more than two, replace it with a `<select>`.

## Next steps
- Clean up abandoned games (a scheduled Cloud Function, or a "running games" list on the dashboard).
- Turn on **App Check** to limit database access to your domain.
- Add rules unit tests with `@firebase/rules-unit-testing` plus a Playwright end-to-end test, run in GitHub Actions.
- Add more question types: true/false, poll, type answer.
- The Firebase SDK is loaded from the gstatic CDN, pinned to 13.1.0. To upgrade, bump the version in every `import` line.
