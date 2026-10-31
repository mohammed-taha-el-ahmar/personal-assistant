// Static defaults. Deploy-specific values come from wrangler.toml [vars] (env).

export const DEFAULTS = {
  // Llama 3.3 70B was shut down on Groq (Aug 2026). gpt-oss / Qwen are the supported replacements.
  MODEL: 'openai/gpt-oss-120b',
  MODEL_FALLBACKS: 'openai/gpt-oss-20b,qwen/qwen3.8-27b',
  GROQ_URL: 'https://api.groq.com/openai/v1/chat/completions',
  GROQ_TIMEOUT_MS: 25_000,

  // Token budgets — sized for small-context / low-TPM models. Total prompt ≈ 300 + context + history.
  CONTEXT_TOKENS: 1800, // retrieved knowledge chunks
  HISTORY_TOKENS: 700, // previous turns
  MAX_COMPLETION_TOKENS: 900, // answer (+ low-effort reasoning on gpt-oss)
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
    allowedOrigins: (env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    contextTokens: int(env.CONTEXT_TOKENS, DEFAULTS.CONTEXT_TOKENS),
    historyTokens: int(env.HISTORY_TOKENS, DEFAULTS.HISTORY_TOKENS),
    maxCompletionTokens: int(env.MAX_COMPLETION_TOKENS, DEFAULTS.MAX_COMPLETION_TOKENS),
  };
}
