// Sanitises the conversation sent by the browser and trims it to the history token budget.
import { DEFAULTS } from './config.js';
import { estimateTokens } from './text.js';

const ASSISTANT_KEEP_CHARS = 600; // older answers are shortened: the gist is enough for follow-ups

/**
 * Keeps only user/assistant turns with string content, drops anything else (e.g. a "system"
 * role injected by a client), and returns { history, question } where `question` is the latest
 * user message and `history` the earlier turns that fit in `budget` tokens (newest kept first).
 */
export function prepareMessages(messages, budget) {
  const clean = (Array.isArray(messages) ? messages : [])
    .filter((m) => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.trim() }));

  const lastUserIdx = clean.map((m) => m.role).lastIndexOf('user');
  if (lastUserIdx === -1) return { history: [], question: '' };
  const question = clean[lastUserIdx].content.slice(0, DEFAULTS.MAX_QUESTION_CHARS);

  const earlier = clean.slice(0, lastUserIdx).map((m) => ({
    role: m.role,
    content:
      m.role === 'assistant' && m.content.length > ASSISTANT_KEEP_CHARS
        ? `${m.content.slice(0, ASSISTANT_KEEP_CHARS)}…`
        : m.content.slice(0, DEFAULTS.MAX_QUESTION_CHARS),
  }));

  const history = [];
  let used = 0;
  for (let i = earlier.length - 1; i >= 0; i--) {
    const cost = estimateTokens(earlier[i].content) + 4;
    if (used + cost > budget) break;
    history.unshift(earlier[i]);
    used += cost;
  }
  // The model expects the conversation to start with a user turn.
  while (history.length && history[0].role !== 'user') history.shift();
  return { history, question };
}

/** Retrieval query: the question, plus the previous user question for short follow-ups. */
export function retrievalQuery(question, history) {
  const prevUser = [...history].reverse().find((m) => m.role === 'user')?.content ?? '';
  const isFollowUp =
    question.split(/\s+/).length < 8 || /\b(it|that|this|those|them|more|ça|cela|ce projet|plus)\b/i.test(question);
  return isFollowUp && prevUser ? `${question}\n${prevUser}` : question;
}
