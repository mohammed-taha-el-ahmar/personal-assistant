# Toastmasters Tools

Free meeting tools for Toastmasters clubs, built as a single static page for GitHub Pages.

**During the meeting:** speech timer with green/amber/red signals, Ah-Counter (with your own filler words), Grammarian, Table Topics question draw, voting.
**Before the meeting:** agenda builder (in person, hybrid or online, with the Zoom/Teams link) and PDF download, role sign-up, role guides, evaluation form.
**After the meeting:** feedback form for members and guests, with a QR code to show on screen.
**Club officers (Bureau):** meeting archive, history of all meetings, member participation.

Roles, the agenda and votes can be shared live with your whole club through Firebase. Everything else stays on each person's device.

An independent tool for club members. Not affiliated with or endorsed by Toastmasters International.

## Files

| File | What it is |
|---|---|
| `index.html` | The page layout and styles |
| `app.js` | How the tools work |
| `office.js` | The club officers' space: sign-in, archive, history, participation |
| `after.js` | QR codes and the feedback form |
| `vendor/qrcode.js` | QR code generator by Kazuhiko Arase (MIT licence), included so QR codes work without any outside service |
| `pdf.js` | Agenda PDF (uses jsPDF, loaded from cdnjs the first time someone downloads a PDF) |
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
4. **Turn on Google sign-in (for club officers):** in the same **Sign-in method** tab, choose **Google → Enable**, pick a support email, and **Save**.
5. **Allow your GitHub domain:** **Authentication → Settings → Authorized domains → Add domain** → `<your-username>.github.io`.
6. **Create the database:** **Build → Firestore Database → Create database**. Pick a location close to your club (for example `eur3` for Europe) and start in **production mode**.
7. **Set the rules:** open the **Rules** tab, replace everything with the contents of `firestore.rules`, and click **Publish**.
8. Commit the updated `firebase-config.js` to GitHub.

If you set up Firebase with an earlier version of this site, publish the new `firestore.rules` each time you update the site, and turn on Google sign-in: the officers' space and the feedback form need the latest rules.

The values in `firebase-config.js` are meant to be public. What protects the data is the rules file.

## 3. Use it with your club

1. Open the site, go to **Roles**, **Agenda** or **Voting**, enter a club code (for example `paris-orators`) and click **Go live**.
2. Click **Copy club link** and share it in your club chat. The link looks like `https://<your-username>.github.io/gavel-and-timer/?club=paris-orators`.
3. Members who open the link can:
   - enter their name once and tap **Take it** to claim a role,
   - see the agenda update as the VP Education edits it,
   - vote for Best Speaker, Best Evaluator and Best Table Topic from their own phone.

Each club code is its own space, so several clubs can use the same site.

### Online and hybrid meetings

In **Agenda**, set **Format** to **Hybrid** or **Online** and paste the meeting link (Zoom, Teams, Meet…), with the meeting ID and passcode if you use them. The agenda then shows a **Join online** button, and the link is included in the copied text and is clickable in the PDF. Links must start with `https://`.

### QR code for the club space

When you click **Go live**, a QR code of the club link appears straight away so you can show it on screen. You can show it again at any time with **Show QR code** (next to **Copy club link**) or from the officers' space.

### Agenda PDF

In **Agenda**, **Download PDF** saves an A4 agenda with times, roles and the names of who holds them, ready to print or send. It works with or without live sharing.

## 4. After the meeting: feedback

The **Feedback** tab (**Avis** in French) is a one-minute form for members and guests: member or guest, a rating out of 5, what they liked most, a suggestion, and, for guests, whether they would come back and an optional email if they want the club to contact them.

- Click **Feedback QR code** to show a QR code that opens the form directly, for example on the screen at the end of the meeting.
- The form is for the meeting date set in the Agenda tab (today if none is set). Each device can answer once per meeting.
- Answers can only be read by the club officers, in the officers' space: a summary for the current meeting, and the feedback for each meeting in the history and its PDF.

## 5. The club officers' space (Bureau)

Open the **Club officers** tab (**Bureau** in French) with your club link.

1. **First setup.** Click **Sign in with Google**. If the club has no officers yet, click **Set up the officers' space**: you become the first officer.
2. **Add the other officers** by their Google email address in **Officers**. Only people on this list can see the space; the history is hidden from everyone else by the database rules, not just by the page.
3. **During the meeting**, the Timer, Ah-Counter and Grammarian tap **Send to the club officers** under their report.
4. **After the meeting**, an officer clicks **Archive this meeting**. The agenda, who held each role, the vote results and the reports received are saved to the history. Leave **Then reset…** ticked to clear roles, nominees, votes and reports for the next meeting (the agenda structure is kept).
5. **Meeting history** lists every archived meeting. Open one to see its details, download it as a PDF (agenda plus votes and reports), or delete it.
6. **Member participation** counts, from the history, how many roles, speeches and evaluations each member has done and when they last had a role. Names are matched as typed, so ask members to write their name the same way each time.

Members never need to sign in. Only officers use Google sign-in.

## Things to know

- **Anyone with the club link can edit** roles, the agenda and voting settings. The officers' space and the history are protected: only the listed officers can read or change them. Share the link only in your club's own channels. A club code that is hard to guess (`paris-orators-7f3k`) adds a little privacy.
- **Ballots are anonymous in the app but not encrypted.** The page shows only totals, and only after someone taps Reveal. A technically minded member could still read the raw ballots from the browser, so treat it like a show of hands, not a secret contest ballot. Do not use it for official contest judging.
- **One ballot per device.** A member who opens the link on two devices or in a private window can vote twice. "Start a new vote" begins a fresh round for that category.
- **Free tier:** Firebase's Spark plan covers tens of thousands of reads and writes a day, far more than a club meeting uses.
- Toastmasters International has brand guidelines on using its name and logo. This site uses neither the logo nor official marks.
