// Static defaults. Deploy-specific values come from wrangler.toml [vars] (env).

// Bump when the API changes; GET /health reports it so you can check what is deployed.
export const WORKER_VERSION = '2.1.0';

export const DEFAULTS = {
  // Used when no ALLOWED_ORIGINS variable is set (e.g. code pasted in the dashboard).
  ALLOWED_ORIGINS: 'https://www.tahaelahmar.dev,https://tahaelahmar.dev,https://mohammed-taha-el-ahmar.github.io',
  // Llama 3.3 70B was shut down on Groq (Aug 2026). gpt-oss / Qwen are the supported replacements.
  MODEL: 'openai/gpt-oss-120b',
  MODEL_FALLBACKS: 'openai/gpt-oss-20b,qwen/qwen3.8-27b',
  GROQ_URL: 'https://api.groq.com/openai/v1/chat/completions',
  GROQ_TIMEOUT_MS: 25_000,

  // Token budgets — sized for small-context / low-TPM models. Total prompt ≈ 300 + context + history.
  CONTEXT_TOKENS: 1800, // retrieved knowledge chunks
  HISTORY_TOKENS: 700, // previous turns
  // Output budget. On reasoning models (gpt-oss, Qwen) hidden reasoning tokens count against it,
  // so it must leave room for reasoning + a ~250-word answer. It does not enlarge the prompt.
  MAX_COMPLETION_TOKENS: 2048,
  MAX_CONTINUATIONS: 1, // automatic "continue" calls when an answer is still cut off
  MAX_QUESTION_CHARS: 1000,
  MAX_JD_CHARS: 3000,

  RATE_LIMIT: 30, // requests per IP per window
  RATE_WINDOW_MS: 60 * 60 * 1000,
};

const int = (v, d) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);

export function settings(env = {}) {
  const models = [env.MODEL || DEFAULTS.MODEL, ...(env.MODEL_FALLBACKS ?? DEFAULTS.MODEL_FALLBACKS).split(',')]
    .map((m) => m.trim())
    .filter((m, i, all) => m && all.indexOf(m) === i);
  return {
    models,
    calLink: env.CAL_LINK || 'https://cal.eu/mohammed-taha-el-ahmar',
    allowedOrigins: (env.ALLOWED_ORIGINS || DEFAULTS.ALLOWED_ORIGINS)
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    contextTokens: int(env.CONTEXT_TOKENS, DEFAULTS.CONTEXT_TOKENS),
    historyTokens: int(env.HISTORY_TOKENS, DEFAULTS.HISTORY_TOKENS),
    maxCompletionTokens: int(env.MAX_COMPLETION_TOKENS, DEFAULTS.MAX_COMPLETION_TOKENS),
  };
}
