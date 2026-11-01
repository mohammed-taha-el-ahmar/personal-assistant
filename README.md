# personal-assistant

Recruiter-facing website for **Mohammed Taha EL AHMAR**, live at [www.tahaelahmar.dev](https://www.tahaelahmar.dev).

- **Assistant page**: an AI assistant that answers recruiters' questions from my resume, FAQ and portfolio (English or French, streamed, with sources), checks a pasted job description against my profile, and hands off to a call with the conversation pre-filled in the booking notes.
- **Projects page**: filterable grid of hands-on data engineering and GenAI demos, each with architecture flow, key decisions and code links. Deep links: `projects.html#<project-id>`.

## How the assistant works

```
Browser (GitHub Pages)            Cloudflare Worker                                     Groq
──────────────────────            ─────────────────                                     ────
POST /chat {messages, lang} ──▶ 1. sanitise + trim history to HISTORY_TOKENS
                                2. retrieve chunks from the bundled knowledge base
                                   (BM25 + FR→EN expansion [+ optional bge-m3 embeddings])
                                   packed into CONTEXT_TOKENS                        ──▶ gpt-oss-120b
◀── SSE: meta {sources, suggestions} · delta … · done                                    ↳ fallback: gpt-oss-20b,
                                                                                            qwen3.8-27b
POST /feedback {rating}   ──▶ logged (Analytics Engine if bound)
```

- **One LLM call per question.** There is no router pass: the knowledge base (`docs/*.md` + `docs/projects.json`) is split at build time into ~80 small titled chunks (≤ ~200 tokens each) and bundled into the Worker, so nothing is fetched at runtime.
- **Built for small-context models.** A typical prompt is ~1–2.5k tokens (system ≈ 300, context ≤ 1,800, history ≤ 700) plus ≤ 2,048 completion tokens (on reasoning models the hidden reasoning counts against this, so don't set it too low). Budgets are `[vars]` in `worker/wrangler.toml`.
- **Model-agnostic.** Llama 3.3 70B was shut down on Groq in Aug 2026. Models are tried in order (`MODEL`, then `MODEL_FALLBACKS`) and the next one is used when a model is decommissioned, rate-limited or down. Reasoning output is disabled per model family (`reasoning_effort` / `include_reasoning`).
- **No silent truncation.** If an answer still stops on the output limit (`finish_reason: "length"`), the Worker asks the model once to finish it; errors sent mid-stream are shown to the user. Each request logs `finish`, `reasoningTokens` and `continuations`, so `npx wrangler tail` shows when the budget is too tight.
- **Follow-up suggestions** come from the retrieved chunks (no extra LLM call).

## Repository layout

```
index.html, projects.html   Pages (static, no build step)
css/
  tokens.css                Colours, radii, fonts — light + dark themes (WCAG AA)
  base.css                  Reset, header/nav, buttons, tags, cards, footer
  home.css · projects.css   Page-specific styles
js/                         ES modules, no framework
  config.js                 ★ Single source of truth: worker URL, links, data paths
  i18n.js                   English / French UI strings + language switch
  common.js                 DOM builder, config-driven links, booking notes, theme toggle
  chat.js · markdown.js     Chat (streaming, sources, feedback, job-description match,
                            session persistence, hand-off) + safe Markdown renderer
  resume.js                 Experience explorer
  projects.js · icons.js    Projects grid, filters, deep links
  theme-init.js             Applies saved theme before first paint
assets/                     favicon.svg, og.png (link previews), cv.pdf (optional)
docs/                       ★ Content: JSON for the site, Markdown for the assistant
  projects.json             Source of truth for projects (site + assistant)
  resume.md · faq.md · projects.md · resume-bullets.json
  projects-summary.md       GENERATED
scripts/
  build-content.mjs         Validates content, writes projects-summary.md + the knowledge base
  lib/chunk.mjs             Markdown/project → chunks
worker/
  wrangler.toml             Worker config: origins, models, token budgets, optional bindings
  src/
    index.js                Routes: /chat (SSE or JSON), /feedback
    retrieval.js · text.js  BM25 index, FR/EN query expansion, token-budget packing
    embeddings.js           Optional Workers AI semantic re-ranking
    llm.js                  Groq client: per-model params, fallback chain, SSE parsing
    history.js · prompt.js  History trimming, compact prompts (chat + job-description)
    suggestions.js · analytics.js · http.js · ratelimit.js · sse.js · config.js
    generated/kb.js         GENERATED knowledge base — do not edit
  test/                     Unit tests (node:test)
```

## Local development

```bash
npm install
npm run dev            # serves the site on http://localhost:5173
npm run worker:dev     # rebuilds the knowledge base and runs the worker (GROQ_API_KEY in worker/.dev.vars)
npm test               # chunker, retrieval (EN + FR), history, LLM client, worker routes
npm run lint           # ESLint + Prettier check
```

To test the site against a local worker, point `WORKER_URL` in `js/config.js` at `http://localhost:8787` and add `http://localhost:5173` to `ALLOWED_ORIGINS` in `worker/wrangler.toml`.

## Updating content

| To change…                         | Edit                                           | Then                                         |
| ---------------------------------- | ---------------------------------------------- | -------------------------------------------- |
| A project (site **and** assistant) | `docs/projects.json`                           | `npm run build:content`, redeploy the worker |
| What the assistant knows           | `docs/resume.md`, `faq.md`, `projects.md`      | `npm run build:content`, redeploy the worker |
| Experience shown on the site       | `docs/resume-bullets.json`                     | —                                            |
| UI text (EN / FR)                  | `js/i18n.js`                                   | —                                            |
| Links, email, booking URL, CV      | `js/config.js` (+ `CAL_LINK` in wrangler.toml) | —                                            |
| Model or token budgets             | `worker/wrangler.toml` `[vars]`                | redeploy the worker                          |

Tips for the knowledge base: write short sections under clear headings (each heading becomes a chunk title the retriever matches on), put numbers in the text (the assistant never invents them), and add FAQ entries as `**Question?**` followed by the answer. The FR→EN keyword map lives in `worker/src/text.js`.

To publish a CV: commit `assets/cv.pdf` and set `LINKS.cv = 'assets/cv.pdf'`; the nav item and button appear automatically.

## Deploying

- **Site**: GitHub Pages from the repository root (`CNAME` → www.tahaelahmar.dev).
- **Worker** — the Worker is several modules plus a generated knowledge base, so it can no longer be pasted into the dashboard as-is. Either:
  - **Wrangler (recommended)**
    ```bash
    npx wrangler login                                                   # once
    npx wrangler secret put GROQ_API_KEY --config worker/wrangler.toml   # once
    npm run worker:deploy                                                # builds content, then deploys
    ```
  - **Dashboard**: run `npm run worker:bundle`, then paste `worker/dist/worker.js` into the Worker's editor and copy the `[vars]` from `worker/wrangler.toml` into _Settings → Variables_.
- **Check what is live**: `curl https://recruiter-proxy.med-taha-elahmar.workers.dev/health` returns the Worker version, models and knowledge-base size. A 404 there means the old Worker is still deployed.
- **After editing `docs/`**: redeploy the Worker (the knowledge base is bundled into it).
- **Optional**: uncomment the `[ai]` binding in `wrangler.toml` for multilingual semantic retrieval, and the `ANALYTICS` dataset for question / latency / token / feedback analytics (query it with SQL in the Cloudflare dashboard). Without it, events are written as JSON lines visible with `npx wrangler tail`.

## CI

`.github/workflows/ci.yml` runs on every PR: lint/format, `check:content` (content is valid and the generated knowledge base is up to date) and `npm test`.
