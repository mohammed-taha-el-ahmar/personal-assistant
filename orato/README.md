# Oratia

Free meeting tools for Toastmasters clubs, built as a single static page for GitHub Pages.

**Club:** an introduction page for the club (description, photos and videos, practical information, current officers, announcements, events) edited by the officers, and a page presenting the officer roles with an "I'm interested" form.
**During the meeting:** speech timer with green/amber/red signals (show colors and time, or colors only; press H to switch), Ah-Counter (with your own filler words), Grammarian, Table Topics question draw, voting.
**Before the meeting:** agenda builder with meeting templates (2 speeches, 3 speeches, speech contest, plus your own), in person, hybrid or online with the Zoom/Teams link, and PDF download, role sign-up, random speaking order for contests, role guides.
**Evaluations:** forms for each type of evaluation (prepared speech, Table Topics, evaluator, Toastmaster of the Evening, Table Topics Master, General Evaluator, Timer/Ah-Counter/Grammarian, custom) with pre-filled criteria you can rename, reorder, remove or add to; PDF filled in or blank to print.
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
| `evals.js` | Evaluation forms by type |
| `templates.js` | Meeting templates for the agenda: built-in, club and on-device |
| `plan.js` | Premium features per club: the administrator's switches, the officers' box, `hasFeature()` |
| `profiles.js` | Personal profiles, joining a club as member or guest, officers' confirmation, member directory, my data |
| `pathways.js` | The six Pathways paths and their projects, the path a member follows |
| `speeches.js` | Speech requests: request, approval by officers or the Toastmaster of the day, slot, comments |
| `mentoring.js` | Mentor and mentee pairs: wishes, pairs formed by officers, goal and check-ins |
| `stats.js` | Club statistics and DCP progress (premium) |
| `kit.js` | Officer toolkit (premium): training, action plan, events, announcements |
| `cpro.js` | Contests pro (premium): judge codes, phone ballots, secret counting, results, certificates |
| `attendance.js` | Attendance answers, replacement alerts, attendance kept when a meeting is closed |
| `flow.js` | Running order for the Timer, quick speakers and renaming for the Ah-Counter and Grammarian |
| `meetings.js` | Meetings planned ahead: picker, roles and agenda per date, promotion when the next meeting is closed |
| `nav.js` | Navigation: the 5 sections (bottom bar on phones), the tabs of the open section, the Bureau button |
| `contests.js` | Contests section (4 tabs): contest types and timing, checklist, officials, official documents, club links, World Champions videos |
| `draw.js` | Random speaking order (contests, speakers) |
| `deletion.js` | Deleting a club space, with a 3-day delay any officer can cancel |
| `permissions.js` | Who may do what: visitors, members (device unlocked with the member code) and officers |
| `help.js` | Help for new visitors: welcome banner, “Getting started” guide, ⓘ buttons on every page |
| `admin.js` | Club creation requests and the administrator's page (`?admin`) |
| `members.js` | Guest book (everyone) and member list with dues renewals (officers only) |
| `modules.js` | Club choice of which sections, tabs and features members see |
| `reviews.js` | Social network links, average rating and testimonials on the club page |
| `media.js` | Photos and videos on the club page |
| `club.js` | Club introduction page, officer roles and the "interested in joining the officers" form |
| `after.js` | QR codes and the feedback form |
| `qrcode.js` | QR code generator by Kazuhiko Arase (MIT licence), included so QR codes work without any outside service |
| `pdf.js` | Agenda PDF (uses jsPDF, loaded from cdnjs the first time someone downloads a PDF) |
| `i18n-nl.js`, `i18n-ar.js` | Dutch and Arabic: interface text, filler words, Table Topics, role guides, example meeting and help |
| `Amiri-Regular.ttf`, `Amiri-Bold.ttf`, `Amiri-OFL.txt` | Arabic font for PDFs (SIL Open Font License) |
| `i18n.js` | All text in English and French, plus each language's filler words, Table Topics questions, role guides and example meeting |
| `firebase-config.js` | Your Firebase project settings (you fill this in) |
| `firestore.rules` | Database security rules (you paste these into Firebase) |
| `.nojekyll` | Tells GitHub Pages to serve the files as they are |

## Navigation

The tools are grouped in 5 sections: **Club**, **Meeting**, **Prepare**, **Contests** and **Follow-up**. On a phone they form a bar at the bottom of the screen; on a larger screen, a row under the header. The tabs of the open section appear in a second row. The **Club officers** pages (and **Members** for signed-in officers) open from the person button in the header. Sections hidden by the club officers disappear from the bar. Links such as `?club=my-club#timer` keep working.

## Personal profiles and member directory

Anyone can create an Oratia profile from **My profile** (the person button in the header): sign in with Google, or with an email and a password, enter a name and agree to the privacy notice. Then, in a club space:
- **I am a member of this club** sends a membership request; **I am a guest** joins as a guest right away.
- Officers see the requests at the top of the **Members** tab (**Profiles and requests**). **Confirm as member** links the person to a record of the member list (an existing one, a new one, or none). Officers can later mark someone as a former member, or remove the profile.
- An **active member profile works like the member code**: the member takes roles and sends reports from any device without typing the code.
- Members choose a **card in the directory** (email, phone, WhatsApp, LinkedIn, each one opt-in). The **Directory** tab (Club section) is visible to active members and officers only; the rules refuse it to everyone else.
- **My data** downloads everything stored about the person (JSON) and deletes the account, with its club profiles and cards. The privacy notice explains what is stored, who sees it, why and for how long.

Data: `users/{uid}` (only the person), `clubs/{club}/people/{uid}` (the person and officers), `clubs/{club}/directory/{uid}` (active members and officers). **Republish `firestore.rules`** after updating. The member code keeps working for clubs and members without profiles.

## Pathways and speech requests

The **Learn and progress** section has two tabs:
- **Pathways**: the six paths (Dynamic Leadership, Engaging Humor, Motivational Strategies, Persuasive Influence, Presentation Mastery, Visionary Communication) with their projects by level, required and elective, and a link to each path page on toastmasters.org. Open to everyone, guests included. A signed-in person can mark **the paths they follow, one or several** (stored in their profile); their paths come first in speech requests. Project names are copied from the toastmasters.org path pages (November 2026); update `PATHS` in `pathways.js` when Toastmasters International changes a path.
- **Speech requests**: a member with an active profile chooses path, level and project (or types another project), the title, the timing (Ice Breaker 4–6 min is suggested for the Ice Breaker, 5–7 min otherwise) and the preferred meeting. **Officers or the Toastmaster of the day** (whoever holds the Toastmaster role) approve it and choose the slot (Speaker 1–3), decline it, or mark it as given. The approved speech fills the speaker's role and shows its title in the agenda, the copied text and the PDF; **Time this speech** sets the timer. Each request has a comment thread between the speaker and the approvers.

Data: `clubs/{club}/speeches/{id}`. **Republish `firestore.rules`.**

## Mentoring

The **Mentoring** tab (Learn and progress section, for members with a profile and officers):
- Members tick **I would like a mentor** or **I can be a mentor**.
- Officers see who is waiting and who is available, **form a pair** (mentee, mentor, shared goal) and end it later. The chip shows how many members are mentored.
- The mentor and the mentee see their pair, contact each other by email, update the goal and add **check-ins** to a short log.

Data: `clubs/{club}/mentoring/{id}`; only officers, the mentor and the mentee read a pair. **Republish `firestore.rules`.**

## Club statistics and DCP (premium)

When the administrator switches on **Club statistics and DCP** for a club, officers get a **Statistics** tab (next to My profile, Club officers and Members):
- **Key figures for the program year** (1 July – 30 June), computed from what the club keeps in Oratia: meetings closed, roles filled per meeting, speeches given (speech requests marked as given), active and new members, dues paid this period, guests and guests who joined, members mentored.
- **Speeches by path and level**, the **most active members**, and **meetings and guests by month**.
- **Distinguished Club Program**: the ten goals (Toastmasters item 1111, rev. 06/2024), a ten-square bar, the level reached (Distinguished 5 goals, Select 7, President's 9) and the membership requirement (20 members or net growth of 5). Officers enter the numbers from Club Central or dashboards.toastmasters.org; **Use** takes the new-member count and the membership computed from the member list. The official status is always the one on the Toastmasters dashboards.

Data: `clubs/{club}/dcp/{year}`, officers only. **Republish `firestore.rules`.**

## Officer toolkit (premium)

When the administrator switches on **Officer toolkit** for a club, officers get a **Toolkit** tab with four tools for the program year:
- **Officer training**: the seven officer roles, ticked for each training period (June–August, November–February). In the Statistics tab, **Use** fills the DCP training figures with these counts.
- **Action plan**: actions with an owner, a due date and the DCP goal they serve, on a month-by-month timeline; late actions are flagged.
- **Events**: special meetings, open houses, socials, demos, contests, trainings, with attendance and guests, and totals by type.
- **Announcements**: six ready messages (meeting reminder, open roles, dues renewal, welcome a new member, thank a guest, speech contest) in the reader's language, filled in with the club's name, the next meeting date and theme, the open roles, the club link and the dues period. Recipients: active members, members who have not paid this period, or guests to follow up (from the member list and the guest book). **Open in my mail app** (addresses in Bcc), or copy the message and the addresses. Officers can save their own templates. Oratia itself sends no email.

Data: `clubs/{club}/kit/{year}`; the rules require the officerKit feature. **Republish `firestore.rules`.**

## Contests pro: judges vote on their phones (premium)

When the administrator switches on **Contests pro**, the Contests section gets a **Judging** tab:
- The **chief judge** (an officer of the club space) creates the contest: name, type, level (club, area, division or district, with contestants from any club), date, contestants in speaking order. Oratia gives two codes: **voting judges** and **tiebreaking judge**, with a QR code to the judging page.
- **Judges** open the page on their phone, type their code (or use a link ending in `&judge=CODE#cpro`), and once the voting is open rank their 1st, 2nd and 3rd place; the tiebreaking judge ranks every contestant. A judge can change their ballot until the voting closes. Nobody sees who the other judges are.
- **Counting**: 3 points for a first place, 2 for a second, 1 for a third; equal totals are separated by the tiebreaking judge's ranking. Only officers read the ballots. The chief judge closes the voting, checks the count, ticks **Disqualified** if needed, then **publishes** the top three, which everyone sees, and downloads **certificates** (PDF, one page per contestant: places for the winners, participation for the others, with no Toastmasters logo).
- The **Speech Contest Rulebook** remains the reference; check the counting method there each year.

**Role swap requests** (free, Roles tab): the holder of a role taps **Find a replacement**; the role shows *Replacement wanted* and appears in the open-roles message, and any member can tap **I'll replace** to take it over. The holder can cancel the request.

Data: `clubs/{club}/contests/{id}` with `keys/codes`, `judges/{uid}`, `ballots/{uid}`. **Republish `firestore.rules`.**

## Meetings planned ahead

The **next meeting** is the one all the tools work on (timer, votes, reports, club page). Officers can also **plan later meetings**: in the **Agenda** or **Roles** tab, **+ Plan a meeting**, pick a date after the next meeting. Its agenda starts as a copy of the next meeting's (apply a template if needed).
- A bar at the top of the Agenda and Roles tabs lists the next meeting and the planned ones. Picking one shows its agenda and roles: officers edit its agenda, members **take roles weeks ahead**, everyone answers **Are you coming?** for that date, and approved speech requests for that date go into its roles.
- Other tabs always show the next meeting.
- When the officers **close the next meeting** (Club officers page, with *start a new meeting*), the earliest planned meeting becomes the next meeting, with its roles, and leaves the planned list.
- Officers can delete a planned meeting.

Data: `clubs/{club}/plans/{date}`. **Republish `firestore.rules`.** Existing clubs need no migration: their current meeting stays the next meeting.

## Attendance and replacements

On the **club page**, the **Roles** tab and the **Agenda**, everyone answers **Are you coming?** for the next meeting: on site, online (only when the meeting is online or hybrid), not sure yet, or not coming. Guests answer with their name too and tick *guest*. Members and officers see who is coming, with *no role* next to those who could still take one, and the expected guests; in a club with member access, visitors only see their own answer.

When a role holder taps **Find a replacement**, everyone who said they are coming and holds no role sees an alert at the top of every page, with **I'll replace**. The holder can also **copy a message for those coming** that names them, to paste in the club's group chat. (Without a server, Oratia cannot push a notification to a phone that does not have the site open: the alert appears when they open it.)

Closing a meeting keeps who said they came in the history. The **Statistics** tab (premium) then shows the average attendance (and online share), and a **Roles by member** table: how many times each member was Toastmaster, speaker, evaluator, General Evaluator, Table Topics Master or evaluator, Timer, Ah-Counter, Grammarian, Sergeant at Arms or President, their attendance, and how often each role was filled.

Data: `clubs/{club}/rsvp/{date}_{uid}`. **Republish `firestore.rules`.**

## Timer, Ah-Counter and Grammarian in a hurry

- **Timer, running order:** **Load from the agenda** follows the agenda (Prepare → Agenda) item by item, in the same order: each speech with its timing (the speech request's timing when approved, 5–7 min otherwise), the Table Topics session as four slots, one line per evaluator, the Table Topics Evaluator, the General Evaluator, and every other segment (welcome, introduction, break, reports, closing, your own items) as a **transition** of the nearest length: 1, 2, 5, 10 or 15 minutes (green at half the time, yellow at three quarters, red at the end). The doors-open item is skipped. The first one is ready: press **Start**, then **Stop and record**, and the next speaker is ready. Names can be typed in the list at any time (Table Topics speakers, for example), and any line can be picked by hand.
- **Timer, report:** the speaker and the type of each recorded time can be changed afterwards; the result (qualified or not) is recalculated.
- **Ah-Counter and Grammarian:** **+ Next speaker** adds an unnamed speaker in one tap while someone is already speaking; **Add the agenda's speakers** adds everyone holding a role; any name can be corrected later in the report.

## Help for new visitors

- On the first visit, a **welcome banner** offers a one-minute tour (“Getting started”): the four sections, who can do what, and how a club gets its space. It stays available from the **? Help** button in the header.
- Every page title has an **ⓘ** button explaining what the page is for, how to use it in three steps, and a tip.
- Small **ⓘ** buttons next to some features (club link, member code, member access, vote launching, templates, colours-only timer, draw names, dues periods, sections shown, creation request) explain them in one or two sentences.
- The texts are in `help.js`, in English and French.

## Display: light, night or automatic

The **◐ / ☀ / ☾** button in the header switches between **Auto** (follows the device's light or dark setting), **Light** and **Night**. The choice is remembered on each device.

## Languages

The site is in **English, French, Dutch and Arabic**. It opens in the language of the visitor's browser when it is one of these, and in English otherwise. The **EN / FR / NL / ع** switch in the header changes language and remembers the choice on that device.

- Add `?lang=fr`, `?lang=nl` or `?lang=ar` to a link to open it in that language, for example `https://oratia.org/?club=paris-orators&lang=ar`. The **Copy club link** button adds it automatically.
- In a shared club space, members can each use their own language. Default agenda items, role names and voting categories appear in each person's language; anything someone types (names, custom agenda titles, nominees) stays as typed.
- **Arabic** is displayed right to left, with an Arabic font (Noto Sans Arabic, from Google Fonts). Arabic PDFs (agenda, evaluation forms) embed the **Amiri** font: the files `Amiri-Regular.ttf` and `Amiri-Bold.ttf` must be uploaded with the site (if they are missing, they are loaded from jsDelivr). Amiri is under the SIL Open Font License (`Amiri-OFL.txt`).
- Each language has its own filler words for the Ah-Counter, Table Topics questions, role guides, example meeting and help texts.
- Files: English and French are in `i18n.js`; Dutch in `i18n-nl.js`; Arabic in `i18n-ar.js`. To add another language, copy `i18n-nl.js`, translate it, rename it and add it to `index.html` after the others. Any text not yet translated falls back to English.

## 1. Publish on GitHub Pages

1. Create a new public repository on GitHub, for example `oratia`.
2. Upload all the files in this folder to the repository's `main` branch.
3. In the repository, open **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, branch `main`, folder `/ (root)`, then **Save**.
4. After a minute the site is live at `https://<your-username>.github.io/oratia/`.

The site already works at this point, with data kept on each device. Steps 2 and 3 turn on live sharing.

### Custom domain (oratia.org)

The `CNAME` file in this folder already contains `oratia.org`, so GitHub Pages serves the site on that domain.
1. In the repository, **Settings → Pages → Custom domain**: type `oratia.org`, then **Save**.
2. At the domain registrar, in the DNS zone of `oratia.org`, add:
   - four **A** records for `@` (the bare domain): `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`;
   - optionally four **AAAA** records for `@`: `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`;
   - one **CNAME** record for `www` pointing to `<your-username>.github.io.`
   Remove any other A or CNAME record the registrar added for `@` or `www` (parking page).
3. Wait for the DNS to update (minutes to a few hours), then tick **Enforce HTTPS** in Settings → Pages (it becomes available once GitHub has issued the certificate).
4. For **oratia.net**, set a permanent (301) web redirect to `https://oratia.org` in the registrar's redirection or forwarding settings.
5. In Firebase, add `oratia.org` and `www.oratia.org` to the authorized domains (step 2.5 below), or sign-in will fail on the new address.
6. Old links (`…github.io/…`) redirect to the custom domain automatically.

## 2. Create the Firebase project (free Spark plan)

1. Go to <https://console.firebase.google.com> and click **Create a project**. Google Analytics is not needed.
2. **Register a web app:** in **Project settings → General → Your apps**, click the web icon `</>`, give it a name, and skip Firebase Hosting. Copy the `firebaseConfig` values it shows into `firebase-config.js`.
3. **Turn on anonymous sign-in:** **Build → Authentication → Get started → Sign-in method → Anonymous → Enable**. Members never create accounts; each phone gets an anonymous ID so it can cast one ballot per category.
4. **Turn on Google sign-in (for club officers):** in the same **Sign-in method** tab, choose **Google → Enable**, pick a support email, and **Save**.
   **Officers without Gmail (wanadoo.fr, orange.fr, free.fr, work addresses…):** in the same tab, open **Email/Password**, turn on the first switch **Email/Password** (this is the important one), optionally also **Email link (passwordless sign-in)**, and **Save**.
5. **Allow your domains:** **Authentication → Settings → Authorized domains → Add domain** → `oratia.org`, `www.oratia.org` and `<your-username>.github.io`.
6. **Create the database:** **Build → Firestore Database → Create database**. Pick a location close to your club (for example `eur3` for Europe) and start in **production mode**.
7. **Set the rules:** open the **Rules** tab, replace everything with the contents of `firestore.rules`, and click **Publish**.
8. Commit the updated `firebase-config.js` to GitHub.

If you set up Firebase with an earlier version of this site, publish the new `firestore.rules` each time you update the site, and turn on Google sign-in: the officers' space and the feedback form need the latest rules.

The values in `firebase-config.js` are meant to be public. What protects the data is the rules file.

## 3. Approval of new club spaces (Oratia administrator)

Every new club space must be approved by the Oratia administrator before anyone can use it.

**Set up the administrators once** (Firebase console → **Firestore Database → Data**):
1. Click **Start collection**, name it `app`.
2. Document ID: `config`. Add a field `admins`, type **array**, and put each administrator's email address as a string value, in lower case (for example `you@gmail.com`).
3. Save. The rules read this document; it is never published on GitHub, and only administrators can read it.

**The administrator's page** is the site address followed by `?admin`, for example `https://oratia.org/?admin`. Sign in there (Google or password), then:
- **Requests waiting**: each request shows the club code, club name, city, Toastmasters club number, the requester's email and role, and their message. **Approve** creates the club space with the requester as its first officer and opens your email app with a ready-made message to send them. **Decline** asks for an optional reason, shown to the requester, who can correct and resend.
- **Club spaces**: every club, its officers and status. **Suspend** closes a club (data kept, nobody can read or change it, officers included); **Reactivate** reopens it.
- **Support button**: tick **Show the support button** and paste the link of your Buy Me a Coffee, Ko-fi, Liberapay or PayPal page (the button text can be changed). It appears at the bottom of every page for all visitors, with or without a club link, and optionally in the header too (on wide screens). Untick to hide it.
- **Contact address**: shown to people who send a request. There are no automatic email notifications (that would need a paid Firebase plan), so check the page regularly.

**For a club**: open the site with the club link (`?club=your-code`). While the code is not approved, every tab shows "this club space is not open" and the **Club officers** tab shows the request form: the officer signs in, fills in the club name, city, club number and role, and sends it. Once approved, they reload the page and are the first officer.

**Clubs created before this change** that already have an officer list keep working (they count as approved). A club code that was used without ever setting up the officers' space now needs a request.

### Premium features

On the administration page (`?admin`), the **Premium** column shows each club's premium features. **Manage** opens the list: tick a feature, optionally set an end date (leave it empty for no end date), and save. The club's officers see the result in the **Premium features** box of their officers' page, with your contact address.

The choice is stored in `clubs/{club}/public/plan` (everyone reads it, only the administrator writes it). To make a tab premium, add it to `PREMIUM_KEYS` in `plan.js`: it is then hidden in clubs without the feature. The Firestore rules offer `planFeature(club, 'id')` to protect premium data too, since hiding a tab is not protection. All three are available: **Club statistics and DCP** (Statistics tab), **Officer toolkit** (Toolkit tab) and **Contests pro** (Judging tab in the Contests section).

## 4. Use it with your club

1. Open your approved club link (for example `https://oratia.org/?club=paris-orators`). You can also go to **Roles**, **Agenda** or **Voting**, enter your club code and click **Go live**.
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

### Meeting templates

At the top of **Agenda**, pick a template and click **Use this template** to replace the running order. The club name, date, theme, venue and online link are kept. Three templates are built in: a regular meeting with 2 speeches, one with 3 speeches, and a speech contest (4 contestants with the minute of silence, ballot counting, results).

To save your own, adjust the running order and start time, type a name and click **Save current agenda as template**.
- A club officer signed in on the Club officers tab saves it for the **whole club**: every member sees it under *Club templates*. Officers can also update it with the current agenda, rename it or delete it.
- Anyone else saves it **on their own device** only.

Templates store the running order (items, roles, durations) and the start time, not the date or names.

### Random speaking order

In **Draw order** (**Tirage au sort**), type what the draw is for and the participants' names (one per line), then click **Draw the order**. The order is drawn with the browser's cryptographic random generator, after a short on-screen shuffle so the room sees it happen.

- **Show full screen** displays the order in large type for the projector; **Copy the order** gives a numbered list for your chat.
- **Put this order in the agenda** writes the names into the contestant slots of the agenda (apply the *Speech contest* template first).
- With a club link, the result is shared live with everyone. Each draw is numbered and time-stamped, and drawing again asks for confirmation, so any redraw is visible to all.

### Agenda PDF

In **Agenda**, **Download PDF** saves an A4 agenda with times, roles and the names of who holds them, ready to print or send. It works with or without live sharing.

## 5. Club page, officer roles and evaluation forms

**Club page.** Anyone opening the club link lands on **About the club** (**Le club**). An officer signed in on the Club officers tab sees **Edit the club page**: club name and description, practical information (where, when, contact, fees, website), the names of the current officers, announcements and the year's events. Upcoming events are listed first; past ones fold away. The next meeting and its online link come from the Agenda tab automatically.

**Officer roles.** The Club officers tab (**Bureau**) first presents the seven officer roles with their responsibilities and what each brings. Below, members can leave their name, email, the roles that interest them and when (this year or next) with **I'm interested**. Officers see the list in their area, set a follow-up status (contacted, role offered, joined, declined) or delete an entry. Members can update their own answer; nobody else can read it.

**Evaluation forms.** In **Evaluations**, choose a type and click **Create**. Each type comes with its own criteria; rename one by editing its name, reorder with the arrows, remove with ×, or add your own. Rate 1-5 and add a comment per criterion, then the three written parts. **Download PDF** gives a filled-in form to send to the person evaluated; **Blank form to print** gives the same criteria with empty fields; with several forms, **PDF of all forms** puts them in one file (useful for the General Evaluator). Forms stay on the device where they were written.

### Photos and videos on the club page

In **Edit the club page**, the **Photos and videos** box lets officers:
- **Add photos** from a computer or phone (several at once, up to 24). Each photo is resized in the browser (a small version for the page, a larger one when someone opens it) and stored in the Firestore database, so no paid Firebase plan is needed. File storage in Firebase (Cloud Storage) now requires the paid Blaze plan, which is why it isn't used.
- **Add a video** by pasting a YouTube or Vimeo link (or a direct link to an .mp4 or .webm file), up to 12. Videos load only when someone presses play, and YouTube videos use its privacy-enhanced mode.
- Add a caption, change the order with the arrows, or remove an item. Click **Save** to publish.

Visitors see a photo grid (click a photo to open it full screen, with ← → to browse) and the videos below it. Only post photos of people who agree to appear on the page.

### Social networks, rating and testimonials on the club page

In **Edit the club page**:
- **Social networks**: paste the links of the club's Facebook, Instagram, LinkedIn, TikTok, YouTube, X, WhatsApp group or Meetup pages. They appear as buttons under the presentation. `facebook.com/yourclub` is completed with `https://` automatically.
- **What our members and guests say**:
  - Tick **Show the average rating** to display the average of the feedback form answers of the last 12 months (stars, score out of 5 and number of answers). It appears from 3 answers, and the figure is refreshed each time an officer saves the page.
  - **Testimonials** (up to 12): pick comments from the feedback form, or type one in. Only comments whose authors ticked "I agree that my comment may be shown on the club page" can be picked; they appear with the first name and the initial of the last name, which you can change.
- The feedback answers themselves stay visible to officers only.

### Speech contests

The **Contests** section has four tabs:
- **Organise**: the contest type (International, Evaluation, Humorous, Table Topics, Tall Tales, Online) with its speaking time, green/yellow/red signals, qualifying window (outside it the contestant is disqualified), its specific rules in short and its judge's ballot, tiebreaking ballot and contest kit. **Time with these settings** opens the timer with the contest timing: its report marks contestants outside the window. Below: the tools for the day (speaking-order draw, contest timer, contest agenda template, evaluation forms) and the **contest chair's checklist** (14 steps, saved on the device).
- **Officials**: contest chair, chief judge, voting judges, tiebreaking judge, counters, timers, Sergeant at Arms, test speaker and contestants, each with their tasks and the documents they need for the chosen contest type.
- **Documents**: the official documents on toastmasters.org (rulebook, judge's and speaker's certifications, time record sheet, counter's tally sheet, certificates, kits, FAQ, tutorials), a table of the ballots and kit of each contest type, and the **club and district links** that officers add (district contest page, registration forms…).
- **Watch & learn**: the winning speeches of the World Championship of Public Speaking since 2014 (with 2nd and 3rd places for the latest years), six questions to study a speech together, links to the official playlist and to the list of all champions, and **our club's picks**: officers add YouTube or Vimeo links (up to 30) with a note on what to watch for.

**Contest role list.** In the **Roles** tab, officers switch the list from *Club meeting* to *Speech contest*: contest chair, chief judge, judges 1–5, tiebreaking judge, counters, timers, Sergeant at Arms, test speaker, and up to 6 contestants. Applying the *Speech contest* agenda template switches it automatically, and **Sign up officials** on the Officials page opens it. Judges' names (🔒) are shown only to signed-in officers and to the judge, and are left out of the agenda and the meeting history. They are still stored in the club's roles document, readable by anyone who has the club link, so for a strictly confidential panel the chief judge can recruit judges outside Oratia.

Club links and videos are stored in `clubs/{club}/public/contest` (fields `links` and `videos`); the existing rules already cover it. Videos are played click-to-play from youtube-nocookie.com; when a champion's video is not verified, the card links to the official page or to a YouTube search instead.

The page summarises the rules; the reference is always the current Speech Contest Rulebook. The links were checked for the 2026–2027 rulebook: when Toastmasters International publishes new documents, update `DOCS` and `CONTEST_TYPES` at the top of `contests.js`. After each convention (August), add the new champion at the top of `CHAMPS`.

## 6. After the meeting: feedback

The **Feedback** tab (**Avis** in French) is a one-minute form for members and guests: member or guest, a rating out of 5, what they liked most, a suggestion, and, for guests, whether they would come back and an optional email if they want the club to contact them.

- Click **Feedback QR code** to show a QR code that opens the form directly, for example on the screen at the end of the meeting.
- The form is for the meeting date set in the Agenda tab (today if none is set). Each device can answer once per meeting.
- Answers can only be read by the club officers, in the officers' space: a summary for the current meeting, and the feedback for each meeting in the history and its PDF.

## 7. The club officers' space (Bureau)

Open the **Club officers** tab (**Bureau** in French) with your club link.

1. **First setup.** The person whose creation request was approved signs in with the same address: they are the first officer.
2. **Add the other officers** by their Google email address in **Officers**. Only people on this list can see the space; the history is hidden from everyone else by the database rules, not just by the page.
3. **During the meeting**, the Timer, Ah-Counter and Grammarian tap **Send to the club officers** under their report.
4. **After the meeting**, an officer clicks **Archive this meeting**. The agenda, who held each role, the vote results and the reports received are saved to the history. Leave **Then reset…** ticked to clear roles, nominees, votes and reports for the next meeting (the agenda structure is kept).
5. **Meeting history** lists every archived meeting. Open one to see its details, download it as a PDF (agenda plus votes and reports), or delete it.
6. **Member participation** counts, from the history, how many roles, speeches and evaluations each member has done and when they last had a role. Names are matched as typed, so ask members to write their name the same way each time.

Members never need to sign in. Only officers sign in, either with Google or with a link sent by email.

### How officers sign in

The officers' area asks for the officer's email address first:
- **Gmail addresses** go straight to the Google sign-in window.
- **Any other address** (wanadoo.fr, orange.fr, free.fr, a work address…) uses a password. The first time, the officer clicks **First time? Create your password**, chooses one, and receives an email to confirm the address; after clicking the link, they press **I've confirmed my address**. After that they simply sign in with their address and password, and stay signed in on that device. **Forgot your password?** sends a reset email.
- Officers who used the one-time email link before already have an account: they use **Forgot your password?** to choose a password.
- The one-time email link is still offered under **Other ways to sign in**, but Firebase's free plan sends only **5 of those emails a day for the whole site** (all clubs together), which is why it often failed. Password confirmation and reset emails have much higher limits (1,000 and 150 a day).
- In every case, **officer access is only given if the address is on the Officers list**. An officer with two addresses (wanadoo.fr and orange.fr) must sign in with the one on the list.
- The emails come from `noreply@<your-project>.firebaseapp.com` and often land in spam with Orange, Wanadoo, Free, SFR or Outlook. You can change their wording and sender name in **Authentication → Templates**.
- If something fails, the message now ends with the Firebase error code (for example `auth/operation-not-allowed`), which says what to fix.

### Who can do what: member access

Until officers turn it on, a club space is open: anyone with the club link can edit everything (this is how clubs created before this feature keep working). In the officers' area, the **Member access** box turns on three levels:

| | Visitor (link only) | Member (device unlocked) | Officer (signed in) |
|---|---|---|---|
| See the club page, agenda, roles, results | ✓ | ✓ | ✓ |
| Vote, give feedback, "I'm interested" form | ✓ (voting can be limited to members) | ✓ | ✓ |
| Take a free role or give up their own | – | ✓ | ✓ |
| Send Timer, Ah-Counter and Grammarian reports | – | ✓ | ✓ |
| Launch a vote (nominees, show results, new vote) | – | ✓ (see below) | ✓ |
| Edit the agenda, templates, draw; assign or clear anyone's role | – | – | ✓ |
| Officers' area (history, feedback, settings) | – | – | ✓ |

- **Turn on member access** creates a random 8-character **member code** (for example `K7MQ-2PXA`). Share it in your members' private group with **Copy invitation message**. Each member enters it once, in the Roles tab (or any shared tab); the device then stays a member device.
- **Copy member link** and **Member QR code** contain the code and unlock the phone directly. Share them with members only, never on a public page or on a screen guests can see.
- **Who runs a vote:** a vote belongs to the person who launched it (by typing the nominees or pressing "Start a new vote"). Until its results are shown, only that person and the officers see the **Show results** and **Start a new vote** buttons and can change the nominees; everyone else sees "Vote launched by …" and can only vote. Once the results are shown, the next vote can be launched by anyone allowed to (any member, or anyone with the link while member access is off). The database enforces this too.
- **Guests can vote**: untick it to keep voting for members and officers.
- **Change the code** creates a new one: every device unlocked with the old code becomes a visitor again until it enters the new one. Use it at the start of each club year, or when someone leaves. You can also remove a single device from the list.
- **Turn off** makes the club space open again.
- The database checks all of this itself (see `firestore.rules`): the code is stored where only officers can read it, and a write without the right level is refused, whatever the page shows.
- A member who clears their browser data or changes phone simply enters the code again.

### Members and guest book

**Guest book** (Club → Guest book, open to everyone with the link): guests leave their name, email or phone, whether it's their first visit, how they heard of the club, and two optional ticks: "I'd like to know how to become a member" and "I agree to receive news". Show **Guest book QR code** at the door, or leave a tablet there: after each guest, "Sign in another guest" clears the form. Only officers can read the entries.

**Members** (Club → Members, visible to signed-in officers only):
- **Member list**: name, email, phone, member since, Toastmasters member number, status (active or former) and notes. Add members one by one, or **Import CSV** from a spreadsheet or a Club Central export. The first line can name the columns in English or French (name, or first name and last name, email, phone, member since, member number, notes); people already in the list are skipped.
- **Renewals**: Toastmasters dues cover October–March and April–September. For each period, set every member to Paid, Pending or Not renewing; the counters show where the campaign stands, and **Copy emails of members who haven't paid** gives a list to paste in the BCC of a reminder. Each period is kept, so past ones stay visible. In March and September, the next period is shown first.
- **Guest follow-up**: the guest book appears below the list, with a status for each guest (new, contacted, became a member, no follow-up). **Add as member** fills the member form from the guest's details.
- **Export CSV** for the member list and the guest book (semicolon-separated in French, for Excel).
- **Personal data**: this is personal data under the GDPR. Only officers can read it, guests are told so on the form, and the page offers to delete guest entries older than 12 months. Delete a person's details whenever they ask. Members can also be marked "former" instead of deleted, to keep the club's history.

### Choosing which tools the club uses

Some clubs already use another tool (easy-Speak, for example) for part of this work. In the officers' area, **Sections shown to members** lists every section (Club, During, Before and After the meeting) with its tabs and a few features inside tabs:
- ticking or unticking a **section** shows or hides all its tabs at once;
- each **tab** can be shown or hidden on its own;
- some **features inside tabs** can be hidden too: officer roles and the "I'm interested" form, the "Send to the club officers" report buttons, and meeting templates.

The choice applies straight away to everyone who opens the club link, and can be undone at any time. Data entered in hidden tabs is kept. The **Club officers** tab is always visible, so officers can always change these choices. Without a club link, every tool stays available.

### Deleting a club space

At the bottom of the officers' area, **Delete this club space** erases everything stored for the club: roles, agenda, votes, history, feedback, the club page, templates and the officer list. To confirm, the officer types the club code.

- The deletion happens **3 days** after the request. The request is stamped with the database's own clock, so the delay cannot be shortened.
- During those 3 days, every member sees a banner with the deletion date, and **any officer can cancel**. Officers can be added but not removed, so nobody can lock the others out first.
- When the 3 days are up, the database **locks the club**: members can no longer read or change anything and see a "club space deleted" notice. The first officer who then opens the site (or signs in from that notice) erases all the data automatically, and the club code becomes free again.

The free Firebase plan has no scheduled tasks, so the final erase runs when an officer next opens the site; until then the locked data stays in the database but cannot be read by anyone.

## Things to know

- **Turn on member access** (see above). Without it, anyone with the club link can edit roles, the agenda and voting settings. Everyone with the link can always read the meeting data, so share the link only in your club's own channels; a club code that is hard to guess (`paris-orators-7f3k`) adds a little privacy.
- **Ballots are anonymous in the app but not encrypted.** The page shows only totals, and only after someone taps Reveal. A technically minded member could still read the raw ballots from the browser, so treat it like a show of hands, not a secret contest ballot. Do not use it for official contest judging.
- **One ballot per device.** A member who opens the link on two devices or in a private window can vote twice. "Start a new vote" begins a fresh round for that category.
- **Free tier:** Firebase's Spark plan covers tens of thousands of reads and writes a day, far more than a club meeting uses.
- Toastmasters International has brand guidelines on using its name and logo. This site uses neither the logo nor official marks.
