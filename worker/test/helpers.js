// Fake Groq endpoint for tests.
export const ORIGIN = 'https://www.tahaelahmar.dev';
export const ENV = { GROQ_API_KEY: 'test', ALLOWED_ORIGINS: `${ORIGIN},https://x.github.io` };

export function sseBody(parts, usage) {
  const lines = parts.map((t) => `data: ${JSON.stringify({ choices: [{ delta: { content: t } }] })}\n\n`);
  if (usage) lines.push(`data: ${JSON.stringify({ choices: [{ delta: {} }], x_groq: { usage } })}\n\n`);
  lines.push('data: [DONE]\n\n');
  // Split into awkward byte chunks to exercise buffering.
  const text = lines.join('');
  const enc = new TextEncoder();
  return new ReadableStream({
    start(c) {
      for (let i = 0; i < text.length; i += 17) c.enqueue(enc.encode(text.slice(i, i + 17)));
      c.close();
    },
  });
}

/** fakeGroq({ 'model-a': 404, 'model-b': { text: 'hi' } }) — per-model behaviour; records calls. */
export function fakeGroq(behaviour) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push(body);
    const b = behaviour[body.model] ?? behaviour['*'];
    if (typeof b === 'number') return new Response(`{"error":{"message":"status ${b}"}}`, { status: b });
    if (body.stream)
      return new Response(sseBody(b.parts ?? [b.text], b.usage), { headers: { 'Content-Type': 'text/event-stream' } });
    return Response.json({
      choices: [{ message: { content: b.text } }],
      usage: { prompt_tokens: 10, completion_tokens: 5 },
    });
  };
  return { fetchImpl, calls };
}

export function chatRequest(body, origin = ORIGIN, path = '/chat') {
  return new Request(`https://worker.test${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}) },
    body: JSON.stringify(body),
  });
}

export async function readSse(res) {
  const text = await res.text();
  return text
    .split('\n\n')
    .filter(Boolean)
    .map((block) => {
      const event = /event: (.*)/.exec(block)?.[1];
      const data = JSON.parse(/data: (.*)/.exec(block)?.[1] ?? 'null');
      return { event, data };
    });
}
