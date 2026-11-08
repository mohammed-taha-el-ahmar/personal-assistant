# Bayanat · بيانات

An independent, AI-assisted media on **data governance, data & AI security and regulation** for EMEA, in English and Arabic.

AI does the legwork (collect, sort, summarise, watch official pages). **You decide what is published**: every draft arrives as a pull request, and nothing goes live until you merge.

```
 sources ──► collect ──► keyword ──► LLM triage ──► drafts (markdown) ──► pull request ──► you review & merge ──► site + newsletter
 (RSS, KEV)  (SQLite)    pre-filter  (Groq free,      content/en/brief/     "Drafts to review"                     (GitHub Pages)
                                      Gemini free)
 official pages ──► watch ──► "what changed" notes ──► same pull request ──► you update content/tracker.yaml
```

Running cost: nothing beyond the domain. The pipeline runs on GitHub Actions, the site on GitHub Pages with the main site, and the models on free tiers, with an optional paid fallback.

---

## Repository layout

| Path | What it is |
|---|---|
| `pipeline/` | Python pipeline: `collect`, `prefilter`, `triage`, `drafts`, `watch`, `newsletter`, `check` |
| `pipeline/prompts/` | The three prompts (triage, summary, watch). Edit them to tune the editorial line. |
| `config/settings.yaml` | Model routes per task, free-tier pacing, thresholds |
| `config/sources.yaml` | Feeds to watch (RSS/Atom, CISA KEV) |
| `config/pillars.yaml` | Keyword pre-filter, per editorial pillar |
| `config/watch.yaml` | Official pages watched for the regulation tracker |
| `content/` | Everything published: analyses (`en/`, `ar/`), briefs, tracker, newsletter issues |
| `site/` | Astro static site, English and Arabic (right to left) |
| `../.github/workflows/bayanat-*.yml` | Scheduled pipeline and newsletter (checks and deploy are shared with the main site) |
| `tests/` | Pipeline tests (no network, no API keys needed) |

---

## Set up

Bayanat lives in the `bayanat/` folder of the main site's repository and is published with it at
`www.tahaelahmar.dev/bayanat/` (see the main README for Pages and the domain). For the pipeline:

1. **Free API keys** as repository *Secrets* (Settings → Secrets and variables → Actions): `GROQ_API_KEY` (<https://console.groq.com>), `GEMINI_API_KEY` (<https://aistudio.google.com>), optionally `ANTHROPIC_API_KEY` as a paid fallback. Any key can be missing: its routes are skipped.
2. **Allow pull requests from Actions**: Settings → Actions → General → Workflow permissions → *Read and write*, and tick *Allow GitHub Actions to create and approve pull requests*.
3. **Optional variables**: `PUBLIC_SUBSCRIBE_URL` (newsletter form endpoint, field `email`), `PUBLIC_CF_BEACON` (cookie-less analytics).
4. **Fill the legal placeholders**: SIRET and postal address in `site/src/pages/[lang]/legal.astro` and `site/src/components/Footer.astro`.
5. **Check the sources**: open each URL in `config/sources.yaml` and `config/watch.yaml`, set `enabled: true` on those that work. Start with 20 to 30.
6. **First run**: Actions → *Bayanat · editorial pipeline* → Run workflow. A pull request "Bayanat: drafts to review" appears when there is something to read.

> Model names and free-tier limits change. If a run logs "model not found" or constant rate limits, update `routes` and `tokens_per_minute` in `config/settings.yaml`.

---

## Your weekly routine

**Every day or two (10 minutes): review the drafts pull request.**
For each file in `content/en/brief/`:

- check the summary and each line of `facts_to_check` against the source;
- write your `my_take` (one sentence; it's what readers come for);
- set `status: approved`, or delete the file to drop the story.

Items flagged `needs_primary_source: true` name an organisation in an incident but come from a secondary source: find the official advisory or statement, replace `source_url`, then set the flag to `false`. The *Checks* workflow blocks approval otherwise.

Tracker notes in `content/en/tracker-updates/`: if a change moves a date or a status, edit `content/tracker.yaml` in the same pull request.

Merge → the whole site rebuilds and the approved briefs appear on `/en/brief/`.

**Monday: the newsletter.**
Actions → *Bayanat · newsletter* → `draft`. A pull request adds `bayanat/content/newsletter/<date>.md` with this week's approved briefs. Write `editor_note` and `one_thing`, fill or empty the `sponsor` block, reorder `items`, merge. Run *Newsletter* → `render` and download the email HTML (email-safe fonts: Georgia and Arial) to paste into your platform. After sending, set `status: sent` to publish the issue in the site archive.

**Every two weeks: an analysis.**
Add a markdown file in `content/en/analysis/` (copy the draft example `ai-act-high-risk-delay.md`). It stays private while `status: draft`. For the Arabic version, add the same slug in `content/ar/analysis/` and set `translation:` in both files to link them.

---

## Run locally

From the `bayanat/` folder:

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env              # add your keys
python -m pipeline run            # collect → prefilter → triage → draft → watch
python -m pipeline stats          # counts and model usage
python -m pipeline check          # the same checks as in pull requests
pytest -q                         # tests, no network needed

cd site && npm install && npm run dev   # http://localhost:4321/bayanat/en/
```

Commands: `run`, `collect`, `prefilter`, `triage`, `draft [--fetch-pages]`, `watch`, `newsletter draft|render [--date YYYY-MM-DD]`, `check`, `stats`.

---

## How the free tiers are respected

- **Keyword pre-filter first**: only items scoring at least `prefilter.min_score` reach a model, capped at `max_items_per_run` per run.
- **Batched triage**: `batch_size` items per call, so a run stays far below daily request limits.
- **Local pacing**: a one-minute token window per model (`tokens_per_minute`) avoids 429 errors.
- **Fallback chain**: each task tries its routes in order (`config/settings.yaml`): Groq, then Gemini, then the optional paid model.
- Items not processed in a run (budget reached, every model down) stay queued for the next run.
- `python -m pipeline stats` shows calls and tokens per model.

**Data and privacy:** only public material goes to the models: feed items, release notes, advisories, official pages. Never send subscriber data, sponsor information or unpublished analyses through a free tier. On Gemini's free tier, Google does not commit to keeping prompts out of product improvement. Groq does not retain inference data by default, and Zero Data Retention can be switched on in its console.

---

## Arabic edition

The site is fully bilingual (`/en/`, `/ar/`, right-to-left layout, Noto Naskh Arabic and Noto Sans Arabic). Analyses are translated by hand, or drafted with a model and then reviewed. Briefs and the newsletter are English-only at first. Open models are weaker in Arabic than in English: test a stronger model on real articles before automating Arabic drafts.

## Editorial rules

The public charter is at `/en/charter/`. It covers human approval, primary sources for incidents, labelled sponsorship and visible corrections. The pipeline enforces what it can: drafts are never published automatically, approval requires your take, and incidents require a primary source.
