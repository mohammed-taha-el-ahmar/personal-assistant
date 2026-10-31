/**
 * Cloudflare Worker — recruiter assistant API for Mohammed Taha El Ahmar's website.
 *
 *   POST /chat      { messages, lang?, mode?: 'chat' | 'jd', jd?, stream? }
 *                   stream=true  → text/event-stream: meta {sources, suggestions, model} · delta {t} · done · error
 *                   stream=false → { content: [{ type: 'text', text }], sources, suggestions }
 *   POST /feedback  { id, rating: 'up' | 'down', question? }  → 204
 *
 * One LLM call per question: the knowledge base is bundled (src/generated/kb.js) and the relevant
 * chunks are picked by retrieval under a fixed token budget, so it works with small-context models.
 */
import { settings, DEFAULTS } from './config.js';
import { corsHeaders, errorJson, json } from './http.js';
import { isRateLimited } from './ratelimit.js';
import { retrieve } from './retrieval.js';
import { prepareMessages, retrievalQuery } from './history.js';
import { chatSystemPrompt, jdSystemPrompt } from './prompt.js';
import { chatCompletion, streamDeltas, stripThinking, UpstreamError } from './llm.js';
import { followUps } from './suggestions.js';
import { sseStream } from './sse.js';
import { logEvent } from './analytics.js';

const sourcesOf = (chunks) => {
  const seen = new Map();
  for (const c of chunks) {
    if (c.pinned) continue;
    const title = c.title.replace(/ › Design$/, '');
    const key = c.href ?? `${c.doc}:${title}`;
    if (!seen.has(key)) {
      seen.set(key, {
        label: c.label,
        title: title
          .split(' › ')
          .pop()
          .replace(/^Context:\s*/i, ''),
        href: c.href ?? null,
      });
    }
  }
  return [...seen.values()].slice(0, 3);
};

function friendly(err, lang) {
  const busy = err instanceof UpstreamError && err.status === 429;
  if (lang === 'fr') {
    return busy
      ? "L'assistant est très sollicité en ce moment. Réessayez dans une minute."
      : "L'assistant est momentanément indisponible. Réessayez dans un instant.";
  }
  return busy
    ? 'The assistant is busy right now. Please try again in a minute.'
    : 'The assistant is temporarily unavailable. Please try again shortly.';
}

async function handleChat(request, env, cfg, cors, fetchImpl) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorJson('Invalid JSON body.', 400, cors);
  }
  const started = Date.now();
  const lang = body?.lang === 'fr' ? 'fr' : 'en';
  const mode = body?.mode === 'jd' ? 'jd' : 'chat';
  const wantStream = body?.stream === true;

  let question;
  let history;
  if (mode === 'jd') {
    const jd = typeof body.jd === 'string' ? body.jd.trim().slice(0, DEFAULTS.MAX_JD_CHARS) : '';
    if (jd.length < 40) return errorJson('Please paste a job description (at least a few lines).', 400, cors);
    question = jd;
    history = [];
  } else {
    ({ question, history } = prepareMessages(body?.messages, cfg.historyTokens));
    if (!question) return errorJson('messages array with a user message is required.', 400, cors);
  }

  const query = mode === 'jd' ? question : retrievalQuery(question, history);
  const { chunks, tokens: contextTokens } = await retrieve(query, { budget: cfg.contextTokens, env });
  const promptArgs = { calLink: cfg.calLink, lang, chunks };
  const messages = [
    { role: 'system', content: mode === 'jd' ? jdSystemPrompt(promptArgs) : chatSystemPrompt(promptArgs) },
    ...history,
    { role: 'user', content: mode === 'jd' ? `Job description:\n${question}` : question },
  ];
  const meta = {
    sources: sourcesOf(chunks),
    suggestions: mode === 'jd' ? [] : followUps({ chunks, question, history, lang }),
  };
  const log = (extra) =>
    logEvent(env, {
      type: 'chat',
      mode,
      lang,
      chunks: chunks.map((c) => c.id).join(','),
      contextTokens,
      question: mode === 'jd' ? '[job description]' : question,
      ms: Date.now() - started,
      ...extra,
    });

  if (!wantStream) {
    try {
      const { res, model } = await chatCompletion({
        apiKey: env.GROQ_API_KEY,
        models: cfg.models,
        messages,
        maxTokens: cfg.maxCompletionTokens,
        fetchImpl,
      });
      const data = await res.json();
      const text = stripThinking(data.choices?.[0]?.message?.content ?? '');
      log({
        model,
        status: 'ok',
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
      });
      return json({ content: [{ type: 'text', text }], ...meta, model }, 200, cors);
    } catch (err) {
      log({ status: `error:${err.status ?? 'unknown'}` });
      console.error('chat failed', err);
      return errorJson(friendly(err, lang), err?.status === 429 ? 429 : 502, cors);
    }
  }

  // Streaming: pick a working model first so errors can still be returned as plain JSON.
  let upstream;
  try {
    upstream = await chatCompletion({
      apiKey: env.GROQ_API_KEY,
      models: cfg.models,
      messages,
      maxTokens: cfg.maxCompletionTokens,
      stream: true,
      fetchImpl,
    });
  } catch (err) {
    log({ status: `error:${err.status ?? 'unknown'}` });
    console.error('chat failed', err);
    return errorJson(friendly(err, lang), err?.status === 429 ? 429 : 502, cors);
  }

  const sse = sseStream();
  const pump = (async () => {
    let usage;
    let chars = 0;
    try {
      await sse.send('meta', { ...meta, model: upstream.model });
      for await (const part of streamDeltas(upstream.res)) {
        if (part.text) {
          chars += part.text.length;
          await sse.send('delta', { t: part.text });
        }
        if (part.usage) usage = part.usage;
      }
      if (!chars) await sse.send('error', { message: friendly(null, lang) });
      await sse.send('done', {});
      log({
        model: upstream.model,
        status: chars ? 'ok' : 'empty',
        promptTokens: usage?.prompt_tokens,
        completionTokens: usage?.completion_tokens,
      });
    } catch (err) {
      console.error('stream failed', err);
      await sse.send('error', { message: friendly(err, lang) });
      log({ model: upstream.model, status: 'error:stream' });
    } finally {
      await sse.close();
    }
  })();

  return {
    response: new Response(sse.readable, {
      headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache', ...cors },
    }),
    pending: pump,
  };
}

async function handleFeedback(request, env, cors) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorJson('Invalid JSON body.', 400, cors);
  }
  const rating = body?.rating === 'up' || body?.rating === 'down' ? body.rating : null;
  if (!rating) return errorJson('rating must be "up" or "down".', 400, cors);
  logEvent(env, {
    type: 'feedback',
    rating,
    question: typeof body.question === 'string' ? body.question : '',
    chunks: typeof body.id === 'string' ? body.id.slice(0, 64) : '',
  });
  return new Response(null, { status: 204, headers: cors });
}

export async function handleRequest(request, env, { fetchImpl = fetch, waitUntil = () => {} } = {}) {
  const cfg = settings(env);
  const origin = request.headers.get('Origin') ?? '';
  const url = new URL(request.url);
  const cors = corsHeaders(origin, cfg.allowedOrigins);

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  // NOTE: requests without an Origin header (curl, scripts) are still accepted — see audit item #2.
  if (origin && !cfg.allowedOrigins.includes(origin)) return new Response('Forbidden', { status: 403 });

  if (request.method !== 'POST' || !['/chat', '/feedback'].includes(url.pathname)) {
    return new Response('Not found', { status: 404 });
  }

  if (url.pathname === '/feedback') return handleFeedback(request, env, cors);

  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  if (isRateLimited(ip)) {
    return errorJson('Rate limit exceeded. Please wait before sending more messages.', 429, cors);
  }

  const result = await handleChat(request, env, cfg, cors, fetchImpl);
  if (result instanceof Response) return result;
  waitUntil(result.pending);
  return result.response;
}

export default {
  fetch: (request, env, ctx) => handleRequest(request, env, { waitUntil: (p) => ctx.waitUntil(p) }),
};
