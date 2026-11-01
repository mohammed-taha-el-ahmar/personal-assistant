// Request logging. Writes to Workers Analytics Engine when an ANALYTICS binding exists
// (see wrangler.toml), otherwise a structured console line (visible with `wrangler tail`).
// No IP addresses or user identifiers are recorded.

export function logEvent(env, event) {
  try {
    if (env?.ANALYTICS?.writeDataPoint) {
      env.ANALYTICS.writeDataPoint({
        indexes: [event.type],
        blobs: [
          event.type,
          event.mode ?? '',
          event.lang ?? '',
          event.model ?? '',
          event.chunks ?? '',
          event.rating ?? '',
          (event.question ?? '').slice(0, 200),
          event.status ?? '',
          event.finish ?? '',
        ],
        doubles: [event.ms ?? 0, event.promptTokens ?? 0, event.completionTokens ?? 0, event.contextTokens ?? 0],
      });
    } else {
      console.log(JSON.stringify({ ...event, question: event.question?.slice(0, 200) }));
    }
  } catch (err) {
    console.warn('analytics failed', err);
  }
}
