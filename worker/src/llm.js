// Groq chat-completions client: per-model parameters, model fallback chain, streaming.
import { DEFAULTS } from './config.js';

export class UpstreamError extends Error {
  constructor(status, detail, model) {
    super(`Groq API error ${status} (${model})`);
    this.status = status;
    this.detail = detail;
    this.model = model;
  }
}

/** Reasoning controls differ per model family (see Groq "Reasoning" docs). */
export function modelParams(model) {
  if (model.startsWith('openai/gpt-oss')) return { reasoning_effort: 'low', include_reasoning: false };
  if (model.startsWith('qwen/')) return { reasoning_effort: 'none' };
  return {};
}

// Errors worth retrying on the next model: decommissioned/unknown model, rate limit, overload.
const RETRYABLE = new Set([400, 404, 413, 429, 498, 500, 502, 503]);

/**
 * Calls the first model that answers. Returns { res, model } with an OK Response
 * (a stream when `stream` is true). Throws the last UpstreamError if every model fails.
 */
export async function chatCompletion({ apiKey, models, messages, maxTokens, stream = false, fetchImpl = fetch }) {
  let lastError;
  for (const model of models) {
    const body = { model, messages, max_completion_tokens: maxTokens, temperature: 0.3, stream, ...modelParams(model) };
    let res;
    try {
      res = await fetchImpl(DEFAULTS.GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(DEFAULTS.GROQ_TIMEOUT_MS),
      });
    } catch (err) {
      lastError = new UpstreamError(504, String(err?.message ?? err), model);
      continue;
    }
    if (res.ok) return { res, model };
    const detail = (await res.text().catch(() => '')).slice(0, 300);
    lastError = new UpstreamError(res.status, detail, model);
    console.warn(`Model ${model} failed (${res.status}): ${detail}`);
    if (!RETRYABLE.has(res.status)) break;
  }
  throw lastError;
}

/** Removes <think>…</think> blocks some models emit inline (defensive; normally disabled). */
export function stripThinking(text) {
  return text.replace(/<think>[\s\S]*?(<\/think>|$)/g, '').trimStart();
}

/**
 * Parses Groq's SSE stream and yields answer text deltas, filtering any inline <think> block.
 * Also yields { usage } once if the final chunk reports token usage.
 */
export async function* streamDeltas(res) {
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  let inThink = false;
  let pending = '';

  const filter = (text) => {
    // Small state machine so a <think> block split across chunks is still removed.
    pending += text;
    let out = '';
    for (;;) {
      if (inThink) {
        const end = pending.indexOf('</think>');
        if (end === -1) {
          pending = pending.slice(-8);
          return out;
        }
        pending = pending.slice(end + 8);
        inThink = false;
      } else {
        const start = pending.indexOf('<think>');
        if (start === -1) {
          const keep = pending.lastIndexOf('<') > pending.length - 7 ? pending.lastIndexOf('<') : -1;
          const safe = keep === -1 ? pending : pending.slice(0, keep);
          out += safe;
          pending = pending.slice(safe.length);
          return out;
        }
        out += pending.slice(0, start);
        pending = pending.slice(start + 7);
        inThink = true;
      }
    }
  };

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    let nl;
    while ((nl = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') continue;
      let json;
      try {
        json = JSON.parse(data);
      } catch {
        continue;
      }
      const delta = json.choices?.[0]?.delta?.content;
      if (delta) {
        const text = filter(delta);
        if (text) yield { text };
      }
      const usage = json.x_groq?.usage ?? json.usage;
      if (usage) yield { usage };
    }
  }
  if (pending && !inThink) yield { text: pending };
}
