# QuizLive

A Kahoot-style live quiz app in plain HTML, CSS and JavaScript (ES modules, no build step).
Firebase provides authentication and real-time data; GitHub Pages hosts the static files.
The interface is in English, French and Arabic, with full right-to-left support.

| Page | Who | What |
|---|---|---|
| `index.html` | Everyone | Landing page with a playable demo question and the join form. Opened from a QR code (`?pin=`), it shows only the join form |
| `play.html` | Player | Answer buttons, feedback, rank and gap to the next player, final summary |
| `dashboard.html` | Host | Sign in (Google, email + password, or email link); list, duplicate and delete quizzes; launch a game |
| `editor.html` | Host | Create or edit a quiz (2–4 answers, time limit, points) |
| `host.html` | Host | Projected screen: lobby, PIN and QR code, question intro, timer, reveal, scoreboard, podium, sound, full screen |
| `library.html` | Everyone | Ready-made quizzes in EN/FR/AR: preview, then copy into your account |
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
- **Sounds you choose:** the **♪ Sounds** panel (host screen and dashboard) sets the sound for each moment:
  lobby music, thinking music, question intro, countdown, time's up, reveal, player joins, and podium.
  Pick from 2 or 3 built-in sounds (synthesised with Web Audio, no files), turn a moment off, or **upload your own
  audio file** (MP3/WAV/OGG, up to 8 MB). Uploads are stored in the host's browser (IndexedDB), so they work on the
  free Firebase plan, but they don't follow you to another computer. There's also a volume slider and a mute toggle.
- **Look:** its own identity: cobalt stage, Bricolage Grotesque type, a split-flap PIN board, and four answer pieces
  (orange drop, teal star, purple moon, pink lightning bolt).
- **Accessibility:** shape and colour on every answer, screen-reader labels and live announcements,
  visible focus, `prefers-reduced-motion` support, and a `lang` attribute
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

## Pricing and waitlist
The landing page shows a pricing table and a waitlist form. **No payments are wired up yet.** Paid plans are marked
"Coming soon", and the player limits shown are not enforced in the app.

- Edit prices and player counts in `PLANS` at the top of `js/waitlist.js`. Plan names and feature lines are in `js/i18n.js` (`price.*`).
- Each sign-up is saved to Firestore as `waitlist/{email}`: email, plan, use case, group size, language, source (`?utm_source=` or the referrer), and consent.
  The rules allow **create only**. Nobody can read, edit or delete sign-ups from the browser, and the same email can't sign up twice.
- To read sign-ups, open **Firebase console → Firestore → waitlist**. To export them, use `gcloud firestore export` or a small Admin SDK script.
- Add `?utm_source=linkedin` (or similar) to the links you share to see which channel brings sign-ups.
- GDPR: the form asks for explicit consent and says what the email is used for. Delete a record when someone asks, and
  add a privacy policy page before you promote the site.

## Question types
| Type | Players see | Scoring |
|---|---|---|
| **Multiple choice** | 2–4 shape buttons | Points for a correct answer, faster = more |
| **True or false** | Two buttons labelled True / False (in each player's own language) | Same |
| **Type the answer** | A text box | Matching ignores case, accents, Arabic short vowels and hamza forms, a leading article, and one or two small typos. List extra spellings in the editor |
| **Poll** | 2–4 shape buttons | No points, no right answer, and streaks carry over |
| **Image answers** | 2–4 shape buttons, with the images on the big screen (and on phones in **Aa** mode) | Same as multiple choice |

Typed answers are checked by the host, and **wrong typed answers are never shown on the big screen**, so nothing
offensive gets projected. The host sees the most common typed answers privately on the Stats page.
Matching and scoring live in `js/questions.js`; run `npm test` after changing them.

## Quiz library
`library.html` lists 13 ready-made quizzes (101 questions): 5 in English, 4 in French and 4 in Arabic. Themes
include general knowledge, geography, science, data & tech, football, Ramadan & Eid, and team icebreakers.
**Use this quiz** copies one into the host's account and opens it in the editor. A visitor who isn't signed in
signs in first, and the copy finishes automatically.
- Quizzes are static JSON files in `templates/` (`index.json` lists them). To add one, write `templates/<id>.json`
  in the same shape and add a line to `index.json`. The editor's validation rules apply.
- Flag questions load images from flagcdn.com (public-domain flags).
- Link to a filtered view or a preview: `library.html?lang=ar`, `library.html?t=geographie-fr`.

## Players become hosts
The player's final screen has two growth hooks:
- **Share my result** draws a 1080×1350 card (rank, score, quiz title, nickname, and "Host your own quiz at <your site>").
  Phones open the share sheet (WhatsApp, Instagram…); computers download the PNG. It's drawn on a canvas in
  `js/share-card.js` and works in all three languages.
- **Host your own quiz** links to the landing page with `utm_source=player_final`. The text that goes with the
  shared image links with `utm_source=player_share`. Both sources show up in waitlist sign-ups.

## AI quiz generation
**✦ Generate with AI** on the dashboard writes a quiz from a **topic**, **pasted text or a PDF** (read in the browser
with pdf.js), or a **public web page**. The host picks the language, number of questions, difficulty, audience and
question types. The quiz opens in the editor with an "AI-generated, check before hosting" notice.

It runs as a Cloud Function (`functions/`), so the API key never reaches the browser:
- Uses the Claude API with JSON-schema structured output, so the response always matches the quiz shape. Every question
  is still validated and cleaned on the server, and answer options are shuffled.
  The default model is `claude-sonnet-5-5`; change it with the `CLAUDE_MODEL` parameter.
- **Monthly allowance per plan** (in `functions/lib.js`): free 3, event pass 10, Pro and Education 50, Teams 200. It's read from a
  `plan` custom claim on the user, and missing means free. A generation is reserved before calling the API and refunded
  if anything fails. Usage lives in `aiUsage/{uid}` (host can read their own, nobody can write).
- Web pages: https only, public hostnames only (no IP addresses, localhost or internal hosts), redirects re-checked,
  10-second timeout, HTML and plain text only.
- Cost: roughly 1–2 US cents per 10-question quiz with Sonnet 5.5 at current prices ($2 / $10 per million tokens).

**Setup (Blaze plan required):**
```bash
cd functions && npm install && cd ..
firebase functions:secrets:set ANTHROPIC_API_KEY     # paste a key from console.anthropic.com
firebase deploy --only functions,firestore:rules
```
To give a user a paid allowance, set their claim with the Admin SDK:
`getAuth().setCustomUserClaims(uid, { plan: "pro" })`. They get it the next time they sign in.

## Tests
```bash
npm test             # answer matching (39) + AI generation (56) + community market (34) unit tests, no network needed
npm run test:rules   # database and Firestore security rules in the emulator (needs Java 11+)
```

## Community market
Hosts can publish their quizzes to a public **Community** tab in the library, where anyone can search, preview and copy them.

**Publishing.** The dashboard's **Publish** button opens a dialog with the author name (public), language, theme, and
acceptance of the [community guidelines](guidelines.html) and the **CC BY 4.0** licence. The `publishQuiz` Cloud Function then:
1. checks the quiz (at least 3 questions, images only from `flagcdn.com` or `upload.wikimedia.org`, author name of 2–40 characters);
2. runs an **automatic content check** with Claude Haiku 5.5 (`MODERATION_MODEL`, roughly a tenth of a cent per check),
   looking for hate, harassment, sexual content, violence, self-harm, illegal activity, personal data and spam. A refusal comes back
   with a reason the author can act on;
3. writes a cleaned public snapshot to `publicQuizzes/{quizId}`, so only known fields are copied and private data stays private.

Editing the quiz doesn't change the public version until the author clicks **Update public version**. **Unpublish**
removes it. Copies already made by other hosts are kept. There's a limit of 10 publish attempts per account per day.

**Browsing.** `library.html?tab=community` has Most popular, Trending this week and Newest sorting, language and theme filters, and one-word search
(accents, Arabic vowels and the "ال" article are ignored). Copies credit the author ("Copied from Alice's community quiz").

**Counters you can trust.** Plays and copies are counted by server triggers, never by the browser:
- **copies** count once per copying account, and never for the author's own copies;
- **plays** count once per finished game, for the public quiz or any copy of it, only when the server can verify it:
  the live game must still exist with the same host and session, and at least **3 players** (not the host) must have
  answered at least half of the questions. Each host adds at most **one play per quiz per day**, so replaying a quiz
  with friends' phones can't push it up the ranking;
- **likes** count once per host account (see below);
- ranking score = plays × 3 + copies × 5 + likes × 2.
- Limit: if the host clicks **End game** within a second of the podium, the live game may be gone before the check runs
  and that play isn't counted. It can miss a real play, but it won't count a fake one.

**Likes.** Host accounts can like a community quiz from the list or the preview (heart button). One like per account per
quiz, never on your own quiz, and not from anonymous player accounts, since those are free to create. A like is a document
`likes/{publicId}_{uid}`; server triggers update the count, and unpublishing a quiz deletes its likes.

**Trending this week.** Every play, copy and like also adds to a weekly score (same weights) that restarts each Monday
(ISO week, UTC). The Trending sort shows quizzes with activity this week, highest weekly score first.

**Creator profiles.** Author names link to `creator.html?u={uid}`: the creator's public quizzes and their total plays,
copies and likes. This is the place to spot the community's most active creators.

**Reports and moderation.** Every community quiz has a **Report** button (one report per account per quiz; visitors
get an anonymous account). After **3 reports from host accounts**, the quiz is hidden until reviewed. Reports from anonymous
accounts are recorded but don't trigger hiding, because anonymous accounts are free to create. Moderators use `moderation.html`, which has a **To review** tab (hidden or reported quizzes) and a **Recently published**
tab for spot checks. Each card shows the author (linked to their profile), stats, the automatic check, every question with
its correct answer marked, and the images. Actions:
- **Restore**: back to public, reports closed;
- **Dismiss reports**: keep it public, reports closed;
- **Remove**: with a required reason, which the author sees on their dashboard. A removed quiz can't be republished or deleted by its author.

Make someone a moderator with the Admin SDK: `getAuth().setCustomUserClaims(uid, { admin: true })`. This replaces existing
claims, so include `plan` too if they have one. They get it the next time they sign in.

**Setup:**
```bash
firebase deploy --only functions,firestore:rules,firestore:indexes,database
```
The deploy adds the Firestore indexes for Trending and creator profiles; new indexes take a few minutes to build.
The publish check uses the same `ANTHROPIC_API_KEY` secret as AI generation. Firestore triggers must run in a region
compatible with your database location; the functions use `europe-west1`, which suits `eur3` and `europe-west1` databases.

**Legal (EU).** The Digital Services Act requires even small hosting services to let users report illegal content and
to explain removals to the author. The Report button and the removal reason cover this.

## Legal pages (drafts)
`mentions-legales.html`, `terms.html` and `privacy.html` are **drafts** in French, English and Arabic; the page shows the
version matching the language toggle, and the French version prevails. They're linked from the landing page footer, the
waitlist form, the sign-up form and the guidelines. Before going public:
1. Fill every yellow `[placeholder]`: your name or company, status, address, contact email, SIREN/SIRET, publication
   director, retention periods, consumer mediator.
2. Check what the drafts describe against what you deploy, such as the processors, the image hosts and the
   15+ age for host accounts.
3. Two things the privacy policy promises as "to do": automatic deletion of abandoned live games, and an account
   deletion button. Build them or edit the text.
4. Have the three pages reviewed by a lawyer, then delete the yellow "Draft" banner at the top of each page.

These drafts and this README aren't legal advice.

## Free plan fair use
- **One live game at a time per host.** Creating a game is one atomic write: the game, a pointer
  `hostGames/{uid}` and a stamp `hostQuota/{uid}/lastCreatedAt`. `database.rules.json` refuses it while the host's
  previous game still exists, unless that game is more than 12 hours old. The dashboard shows a banner with
  **Resume game** and **End game**. Ending a game (from the dashboard or the podium) deletes it and frees the slot.
- **A 30-second pause between new games**, also enforced by the rules. It stops scripts from creating hundreds of games.
- **Player cap signal.** The pricing page says 25 players for Free, but the app doesn't block the 26th player yet.
  When a lobby reaches 25 (`FREE_PLAYER_LIMIT` in `js/utils.js`), the host sees a note linking to the waitlist
  (pre-filled with the event pass and `utm_source=player_cap`). The app also writes
  `upgradeSignals/{sessionId}_player_cap` to Firestore, with the lobby size when the cap was reached and when the game started.
  Those hosts are your best event pass prospects.
- When paid plans exist, raise these limits for paying hosts. For example, set a custom claim (`plan`) with the
  Admin SDK and check `auth.token.plan` in the rules.

## Testing the security rules
`tests/rules.test.mjs` checks about 30 cases against the Firebase emulator: the one-game rule, the cooldown,
hidden answers, one answer per player, scores the host alone can write, the waitlist and upgrade signals.
```bash
npm install
npm run test:rules      # needs Java 11+; downloads the emulators on first run
```
Run it after any change to `database.rules.json` or `firestore.rules`.

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
js/sound.js       sound engine: built-in synth sounds, custom uploads, per-moment choices
js/sound-panel.js sound settings dialog
js/landing.js     landing page demo and feature list
js/waitlist.js    pricing table and waitlist sign-up
js/questions.js   question types, typed-answer matching, scoring (pure, unit-tested)
js/library.js     quiz library page; js/templates.js loads and copies templates
js/share-card.js  shareable result image
js/ai.js          'Generate with AI' dialog
js/market.js      community market client; js/publish-dialog.js; js/moderation.js (moderation.html)
creator.html      public creator profile (js/creator.js)
guidelines.html   community guidelines and licence
mentions-legales.html, terms.html, privacy.html   legal page drafts (FR/EN/AR)
templates/        ready-made quizzes (JSON)
functions/        Cloud Functions: generateQuiz, aiAllowance (Claude API)
tests/            unit tests and security rules tests
js/utils.js       helpers: scoring, shapes, views, CSV, accessibility
js/join.js  js/player.js  js/dashboard.js  js/editor.js  js/host.js  js/analytics.js
database.rules.json  firestore.rules  firebase.json
analytics/        BigQuery pipeline: README and SQL models
```

## Languages and right-to-left
- English and French strings are in `js/i18n.js`, Arabic strings in `js/i18n-ar.js`. The picker on every page switches
  between them. The choice is remembered, and the browser language is used on a first visit.
- Arabic switches the whole page to right-to-left (`dir="rtl"`) and uses **IBM Plex Sans Arabic** for Arabic letters.
  Numbers use Latin digits (0–9), as is usual in the Maghreb. To use Arabic-Indic digits, change `locale` for `ar` in `LANG_META` to `"ar"`.
- **Answer positions never mirror.** The answer grid, reveal bars, PIN and editor answer slots stay left-to-right in every language,
  so an Arabic big screen and a French phone show the orange drop in the same place.
- Quiz content and nicknames take their direction from their own text, so an Arabic question in an English interface
  (or the other way round) displays correctly.
- Plurals use the browser's `Intl.PluralRules`. Arabic strings can define `_zero`, `_one`, `_two`, `_few` and `_many` forms.
- To add a language: create `js/i18n-xx.js` with the same keys, import it in `js/i18n.js`, then add it to `LANG_META` and
  `SHAPE_NAMES`, and to the `lang` list in the waitlist rule in `firestore.rules`.

## Next steps
- Clean up abandoned games with a scheduled Cloud Function (the privacy policy draft mentions it).
- Add an account deletion button (also mentioned in the terms and privacy drafts).
- Turn on **App Check** to limit database access to your domain.
- Run `npm run test:rules` and a Playwright end-to-end test in GitHub Actions.
- The Firebase SDK is loaded from the gstatic CDN, pinned to 13.1.0. To upgrade, bump the version in every `import` line.
