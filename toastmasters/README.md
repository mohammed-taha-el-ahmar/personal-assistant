# Gavel & Timer

Free meeting tools for Toastmasters clubs, built as a single static page for GitHub Pages.

**During the meeting:** speech timer with green/amber/red signals, Ah-Counter (with your own filler words), Grammarian, Table Topics question draw, voting.
**Before the meeting:** agenda builder, role sign-up, role guides, evaluation form.

Roles, the agenda and votes can be shared live with your whole club through Firebase. Everything else stays on each person's device.

An independent tool for club members. Not affiliated with or endorsed by Toastmasters International.

## Files

| File | What it is |
|---|---|
| `index.html` | The page layout and styles |
| `app.js` | How the tools work |
| `i18n.js` | All text in English and French, plus each language's filler words, Table Topics questions, role guides and example meeting |
| `firebase-config.js` | Your Firebase project settings (you fill this in) |
| `firestore.rules` | Database security rules (you paste these into Firebase) |
| `.nojekyll` | Tells GitHub Pages to serve the files as they are |

## Languages

The site is in **English and French**. It opens in French for visitors whose browser is set to French, and in English otherwise. The **EN / FR** switch in the header changes language and remembers the choice on that device.

- Add `?lang=fr` to a link to open it in French, for example `…/gavel-and-timer/?club=paris-orators&lang=fr`. The **Copy club link** button adds it automatically when you are using French.
- In a shared club space, members can each use their own language. Default agenda items, role names and voting categories appear in each person's language; anything someone types (names, custom agenda titles, nominees) stays as typed.
- To add another language, copy the `en` blocks in `i18n.js`, translate them, and add the language code to `LANGS`.

## 1. Publish on GitHub Pages

1. Create a new public repository on GitHub, for example `gavel-and-timer`.
2. Upload all the files in this folder to the repository's `main` branch.
3. In the repository, open **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, branch `main`, folder `/ (root)`, then **Save**.
4. After a minute the site is live at `https://<your-username>.github.io/gavel-and-timer/`.

The site already works at this point, with data kept on each device. Steps 2 and 3 turn on live sharing.

## 2. Create the Firebase project (free Spark plan)

1. Go to <https://console.firebase.google.com> and click **Create a project**. Google Analytics is not needed.
2. **Register a web app:** in **Project settings → General → Your apps**, click the web icon `</>`, give it a name, and skip Firebase Hosting. Copy the `firebaseConfig` values it shows into `firebase-config.js`.
3. **Turn on anonymous sign-in:** **Build → Authentication → Get started → Sign-in method → Anonymous → Enable**. Members never create accounts; each phone gets an anonymous ID so it can cast one ballot per category.
4. **Allow your GitHub domain:** **Authentication → Settings → Authorized domains → Add domain** → `<your-username>.github.io`.
5. **Create the database:** **Build → Firestore Database → Create database**. Pick a location close to your club (for example `eur3` for Europe) and start in **production mode**.
6. **Set the rules:** open the **Rules** tab, replace everything with the contents of `firestore.rules`, and click **Publish**.
7. Commit the updated `firebase-config.js` to GitHub.

The values in `firebase-config.js` are meant to be public. What protects the data is the rules file.

## 3. Use it with your club

1. Open the site, go to **Roles**, **Agenda** or **Voting**, enter a club code (for example `paris-orators`) and click **Go live**.
2. Click **Copy club link** and share it in your club chat. The link looks like `https://<your-username>.github.io/gavel-and-timer/?club=paris-orators`.
3. Members who open the link can:
   - enter their name once and tap **Take it** to claim a role,
   - see the agenda update as the VP Education edits it,
   - vote for Best Speaker, Best Evaluator and Best Table Topic from their own phone.

Each club code is its own space, so several clubs can use the same site.

## Things to know

- **Anyone with the club link can edit** roles, the agenda and voting settings. Share the link only in your club's own channels. A club code that is hard to guess (`paris-orators-7f3k`) adds a little privacy.
- **Ballots are anonymous in the app but not encrypted.** The page shows only totals, and only after someone taps Reveal. A technically minded member could still read the raw ballots from the browser, so treat it like a show of hands, not a secret contest ballot. Do not use it for official contest judging.
- **One ballot per device.** A member who opens the link on two devices or in a private window can vote twice. "Start a new vote" begins a fresh round for that category.
- **Free tier:** Firebase's Spark plan covers tens of thousands of reads and writes a day, far more than a club meeting uses.
- Toastmasters International has brand guidelines on using its name and logo. This site uses neither the logo nor official marks.
