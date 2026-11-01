# QuizLive

A Kahoot-style live quiz app in plain HTML, CSS and JavaScript (ES modules, no build step).
Firebase provides authentication and real-time data; GitHub Pages hosts the static files.

| Page | Who | What |
|---|---|---|
| `index.html` | Player | Enter the game PIN and a nickname |
| `play.html` | Player | Answer buttons, feedback, rank |
| `dashboard.html` | Host | Google sign-in, list, duplicate and delete quizzes, launch a game |
| `editor.html` | Host | Create or edit a quiz (2–4 answers, time limit, points) |
| `host.html` | Host | Projected screen: lobby, PIN and QR code, questions, reveal, scoreboard, podium, CSV export |

## How it works

- **Firestore** stores the quiz library (`quizzes/{id}`), readable only by its owner.
- **Realtime Database** stores live games (`games/{pin}`): state, players, answers, reveal.
- **The host's browser runs the game.** It drives the state machine
  (`lobby → question → reveal → leaderboard → … → podium`), keeps the correct answers
  in memory until the reveal, and computes the scores. Players can only write their own
  nickname, presence flag and one answer per question. Everything is enforced in
  `database.rules.json`, so no Cloud Functions are needed and the free Spark plan is enough.
- **Timing is server-side.** Answers are stamped with `serverTimestamp()`. The rules reject
  answers outside the current question's window, and clocks are synchronised with
  `.info/serverTimeOffset`.
- **Scoring:** `points × (1 − (seconds / timeLimit) / 2)` for a correct answer, which gives
  1000 for an instant answer and 500 at the buzzer, plus a streak bonus
  (+100 per consecutive correct answer, capped at +500).

## Setup (about 15 minutes)

### 1. Firebase project
1. Create a project at <https://console.firebase.google.com>.
2. **Authentication → Sign-in method:** enable **Google** and **Anonymous**.
3. **Firestore Database:** create a database (production mode, `eur3` region for example).
4. **Realtime Database:** create a database (`europe-west1` region for example).
5. **Project settings → Your apps → Web app (`</>`):** register an app and copy the config.

### 2. Configure the app
Paste your config into `js/firebase.js`. Use the exact `databaseURL` shown in the
Realtime Database console.

### 3. Deploy the security rules
```bash
npm install -g firebase-tools
firebase login
firebase use --add            # pick your project
firebase deploy --only database,firestore:rules
```
You can also paste `database.rules.json` and `firestore.rules` into the **Rules** tab of each
database in the console.

### 4. Run locally
ES modules need an HTTP server, so opening the file directly won't work:
```bash
npx serve .          # or: python3 -m http.server 8000
```
`localhost` is an authorized Firebase Auth domain by default.

### 5. Host on GitHub Pages
```bash
git init && git add . && git commit -m "QuizLive"
git branch -M main
git remote add origin https://github.com/<you>/quizlive.git
git push -u origin main
```
1. In the repo, go to **Settings → Pages**, set Source to *Deploy from a branch*, then choose `main` / `/ (root)`.
2. Your app is live at `https://<you>.github.io/quizlive/`.
3. **Important:** in Firebase, go to **Authentication → Settings → Authorized domains** and add `<you>.github.io`.
   Without this step, Google sign-in fails on the hosted site.

## Testing a game alone
Sign-in state is shared per browser, so use a **different browser or a private window**
for each player. Steps:
1. Dashboard → create a quiz → **Host live**.
2. In another window, open `index.html`, then enter the PIN and a nickname.
3. Back on the host screen, click **Start**.

Open several private windows to simulate a class.

## Project structure
```
index.html  play.html  dashboard.html  editor.html  host.html
css/styles.css
js/firebase.js    Firebase init and server clock (the only file to edit)
js/utils.js       helpers: scoring, shapes, views, escaping
js/join.js        player join flow
js/player.js      player game screen
js/dashboard.js   host quiz list and game launch
js/editor.js      quiz editor
js/host.js        game state machine and scoring
database.rules.json  firestore.rules  firebase.json
```

## Next steps
- Clean up abandoned games, for example with a scheduled Cloud Function (Blaze plan) or a dashboard
  "my running games" list. Finished games are deleted when the host clicks **End game**.
- Turn on **App Check** to limit database access to your own domain.
- Add question types (true/false, poll, type answer), sounds, team mode, and self-paced mode.
- Test the rules with the Firebase Emulator Suite (`firebase emulators:start`).
- The Firebase SDK is loaded from the gstatic CDN, pinned to version 13.1.0. To upgrade, bump
  the version in every `import` line.
