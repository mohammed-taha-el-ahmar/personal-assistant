# QuizLive analytics pipeline

```
 host browser ──(1 batch per question)──▶ Firestore answerEvents ──▶ in-app Stats page (analytics.html)
      │                                         │
      └──(start / end of game)──▶ Firestore gameSessions
                                                │  "Stream Firestore to BigQuery" extension (Blaze plan)
                                                ▼
                            BigQuery firestore_export.answer_events_raw_changelog / _raw_latest
                                                │  SQL views (this folder)
                                                ▼
              stg_answer_events → question_difficulty · distractor_analysis · player_session_stats
                                                │
                                                ▼
                            Looker Studio dashboard  ·  scheduled data quality checks
```

## Event model

**`answerEvents/{sessionId}_q{questionIndex}_{playerId}`** holds one row per player per question,
**including players who did not answer**. Without those rows, no-answer rates would be invisible.

| Field | Type | Notes |
|---|---|---|
| `schemaVersion` | int | Bump when the shape changes |
| `ownerUid`, `sessionId`, `quizId`, `quizTitle` | string | |
| `questionIndex`, `questionText`, `answerOptions`, `correctChoices` | | Question snapshot at play time, so later edits don't rewrite history |
| `timeLimitMs`, `pointsValue` | int | |
| `playerId`, `nickname` | string | Anonymous auth uid; the nickname is player-chosen |
| `answered`, `choice`, `correct` | bool, int\|null, bool | |
| `responseMs` | int\|null | Server-timestamp based (RTDB), not the device clock |
| `pointsEarned`, `streakBonus`, `streakAfter`, `rankAfter`, `scoreAfter` | int | |
| `questionStartedAt` | int (ms) | RTDB server time |
| `loggedAt` | timestamp | Firestore server time |

The document ID is **deterministic**, so a retry overwrites the same row instead of creating a duplicate.
The writes are idempotent by design, and `firestore.rules` enforces the ID format.

**`gameSessions/{sessionId}`** holds one document per game: `status` (`running` or `completed`),
`startedAt`, `endedAt`, `playerCount`, `questionCount`, and the final `leaderboard`.

## Level 1: in-app stats (free Spark plan)

`analytics.html?quiz=<id>`, linked as **Stats** on the dashboard, computes these from `answerEvents`:
- KPIs: sessions, unique players, % correct, answer rate, median response time
- For each question: % correct, % no answer, median time, answer distribution, and flags
  (*too hard* below 35%, *too easy* at 90% or above, *misleading distractor* when a wrong answer gets more picks than the correct one)
- A table of sessions with their winners, and a CSV export of the raw events

## Level 2: BigQuery (Blaze plan, generous free tier)

1. In the Firebase console, go to **Extensions** and install **Stream Firestore to BigQuery**
   (`firebase/firestore-bigquery-export`).
   - Collection path: `answerEvents`
   - Dataset ID: `firestore_export`
   - Table ID: `answer_events`
   - Install a second instance for `gameSessions` (table `game_sessions`) if you want session-level data.
2. The extension only streams **new** writes. To load existing documents, run its backfill
   (the `fs-bq-import-collection` script, or the backfill option in recent extension versions).
3. Create a dataset named `quizlive_analytics` in the same location.
4. Replace `your-project` in `sql/*.sql` with your project ID, then run the files in order:
   ```bash
   for f in sql/0[1-4]_*.sql; do bq query --use_legacy_sql=false < "$f"; done
   ```
5. Schedule `sql/05_data_quality_checks.sql` as a **scheduled query**, for example every day.
   Every `failing_rows` value should be 0. Alert on anything else.
6. Connect **Looker Studio** to the views to build a dashboard: difficulty heatmap,
   distractor bar charts, and player progression.

| View | Grain | Use |
|---|---|---|
| `stg_answer_events` | player × question | Typed and cleaned layer over the raw JSON |
| `question_difficulty` | question version | % correct, no-answer rate, median time, difficulty flag |
| `distractor_analysis` | question × option | Pick share and whether a wrong option beats the correct one |
| `player_session_stats` | player × session | Score, accuracy, best streak, final rank |

## Privacy notes
- Players are anonymous (Firebase anonymous uid plus a self-chosen nickname). Don't ask for real names
  if you run this with students or employees.
- Set a retention policy, for example a Firestore TTL policy on `loggedAt` or table expiration in
  BigQuery, and mention it in your privacy notice (GDPR).
