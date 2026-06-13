/**
 * Cloudflare Worker — Groq API proxy with agent-style doc selection
 * for Mohammed Taha El Ahmar's recruiter chatbot
 *
 * How it works (2-pass):
 *   Pass 1 — Router: ask the LLM which documents are relevant to the question.
 *            The LLM responds with a tool call: { docs: ["resume", "faq"] }
 *   Pass 2 — Answer: fetch only those docs from GitHub, inject into system
 *            prompt, and call the LLM again for the final answer.
 *
 * Deploy:
 *   1. dash.cloudflare.com → Workers & Pages → Create → paste this file
 *   2. Settings → Variables & Secrets → add GROQ_API_KEY (encrypt it)
 *   3. Deploy → copy your worker URL
 *   4. Set ALLOWED_ORIGIN to your GitHub Pages URL below
 *
 * To add more documents:
 *   - Add the file to your GitHub repo /docs folder
 *   - Add an entry to the DOCS map below (key + raw URL + description)
 *   - The router will automatically know it can select it
 */

// ── ✏️ EDIT THESE ────────────────────────────────────────────────────────────

const ALLOWED_ORIGIN = 'https://mohammed-taha-el-ahmar.github.io';

// Document registry — add/remove entries here as you update your repo.
// key:         short id used by the router tool call
// url:         raw GitHub URL
// description: one sentence — tells the router what the doc contains
const DOCS = {
  resume: {
    url:         'https://raw.githubusercontent.com/mohammed-taha-el-ahmar/personal-assistant/main/docs/resume.md',
    description: 'Full work history, roles, certifications, responsibilities, and technologies used at each company.',
  },
  faq: {
    url:         'https://raw.githubusercontent.com/mohammed-taha-el-ahmar/personal-assistant/main/docs/faq.md',
    description: 'Availability, work preferences, contract type, salary expectations, remote/relocation.',
  },
  projects: {
    url:         'https://raw.githubusercontent.com/mohammed-taha-el-ahmar/personal-assistant/main/docs/projects.md',
    description: 'Detailed descriptions of key projects, outcomes, and technical achievements.',
  },
};

// ── CONFIG ───────────────────────────────────────────────────────────────────

const MODEL      = 'llama-3.3-70b-versatile';
const MAX_TOKENS = 1000;

const RATE_LIMIT     = 30;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const DOC_CACHE_TTL  = 5 * 60 * 1000; // 5 minutes

// ── PERSONA (no document content here — docs are injected dynamically) ───────

const BASE_PROMPT = `
You are an AI assistant representing Mohammed Taha El Ahmar, a Senior Cloud Data Engineer based in Paris, France.
Answer recruiters' questions in a professional, warm, and concise tone — as if you are his knowledgeable personal assistant.
Be specific and reference real projects, technologies, and achievements from the documents provided.
Never invent information not present in the documents. If something is not covered, say he would be happy to discuss it on a call.
When relevant, invite the recruiter to book a 30-minute intro call at: https://cal.eu/mohammed-taha-el-ahmar

Some questions will start with "Tell me more about this:" followed by a quoted resume bullet point.
For these, go beyond the bullet itself — explain the likely real-world challenge behind it, the
approach he took, the tradeoffs involved, and the impact or outcome. Use the supporting detail in
the projects document if available. Write 3-5 sentences, concrete and specific, in a tone that helps
a recruiter understand the seniority and depth behind a single resume line.
`.trim();

// ── ROUTER TOOL DEFINITION ───────────────────────────────────────────────────
// Passed to the LLM in Pass 1. The LLM must call this tool to indicate
// which documents are needed to answer the recruiter's question.

function buildRouterTool() {
  return {
    type: 'function',
    function: {
      name: 'select_documents',
      description:
        'Select which documents are needed to answer the recruiter question. ' +
        'Choose only the documents that are relevant — do not select all by default.',
      parameters: {
        type: 'object',
        properties: {
          docs: {
            type: 'array',
            items: {
              type: 'string',
              enum: Object.keys(DOCS),
            },
            description: 'List of document keys needed to answer this question.',
          },
          reason: {
            type: 'string',
            description: 'One sentence explaining why these documents were selected.',
          },
        },
        required: ['docs'],
      },
    },
  };
}

// Build the router system prompt — lists available docs so the LLM knows what it can pick
function buildRouterSystemPrompt() {
  const docList = Object.entries(DOCS)
    .map(([key, { description }]) => `- "${key}": ${description}`)
    .join('\n');

  return (
    'You are a document routing assistant.\n' +
    'Given a recruiter question, call the select_documents tool with the minimal set of documents ' +
    'needed to answer it accurately. Available documents:\n' +
    docList + '\n\n' +
    'Rules:\n' +
    '- Select ONLY what is needed. A question about availability needs only "faq".\n' +
    '- A question about past work needs "resume" and/or "projects".\n' +
    '- A general question about skills or tech stack needs "resume".\n' +
    '- A question starting with "Tell me more about this:" needs "resume" AND "projects" if available.\n' +
    '- You MUST call the select_documents tool. Do not answer the question yourself.'
  );
}

// ── IN-MEMORY STORES ─────────────────────────────────────────────────────────

const rateLimitMap = new Map();
const docCache     = new Map(); // key → { text, fetchedAt }

// ── HELPERS ──────────────────────────────────────────────────────────────────

function isRateLimited(ip) {
  const now   = Date.now();
  const entry = rateLimitMap.get(ip) ?? { count: 0, windowStart: now };
  if (now - entry.windowStart > RATE_WINDOW_MS) {
    entry.count = 1; entry.windowStart = now;
  } else {
    entry.count++;
  }
  rateLimitMap.set(ip, entry);
  return entry.count > RATE_LIMIT;
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age':       '86400',
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

// Fetch a single doc with per-key in-memory cache
async function fetchDoc(key) {
  const cached = docCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < DOC_CACHE_TTL) {
    return cached.text;
  }
  const res = await fetch(DOCS[key].url, { cf: { cacheEverything: true, cacheTtl: 300 } });
  if (!res.ok) throw new Error(`Failed to fetch doc "${key}": ${res.status}`);
  const text = await res.text();
  docCache.set(key, { text, fetchedAt: Date.now() });
  return text;
}

// Fetch only the selected docs in parallel
async function fetchSelectedDocs(keys) {
  const validKeys = keys.filter(k => DOCS[k]); // ignore unknown keys
  const results   = await Promise.allSettled(validKeys.map(k => fetchDoc(k)));
  return validKeys
    .map((key, i) => {
      if (results[i].status === 'fulfilled') {
        return `## Document: ${key}\n\n${results[i].value}`;
      }
      console.warn(`Could not fetch doc "${key}":`, results[i].reason);
      return null;
    })
    .filter(Boolean)
    .join('\n\n---\n\n');
}

// Single Groq API call (shared by both passes)
async function callGroq(apiKey, messages, tools, toolChoice) {
  const body = { model: MODEL, max_tokens: MAX_TOKENS, messages };
  if (tools)      body.tools       = tools;
  if (toolChoice) body.tool_choice = toolChoice;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body:    JSON.stringify(body),
  });
  return res.json();
}

// ── MAIN HANDLER ─────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') ?? '';
    const url    = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (origin && origin !== ALLOWED_ORIGIN) {
      return new Response('Forbidden', { status: 403 });
    }

    if (request.method !== 'POST' || url.pathname !== '/chat') {
      return new Response('Not found', { status: 404 });
    }

    // ── Rate limit ────────────────────────────────────────────────────────────
    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    if (isRateLimited(ip)) {
      return json({ error: { message: 'Rate limit exceeded. Please wait before sending more messages.' } }, 429);
    }

    let body;
    try { body = await request.json(); }
    catch { return json({ error: { message: 'Invalid JSON body.' } }, 400); }

    const { messages } = body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return json({ error: { message: 'messages array is required.' } }, 400);
    }

    // ── Pass 1: Router — ask LLM which docs are needed ────────────────────────
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content ?? '';

    let selectedDocKeys = Object.keys(DOCS); // fallback: all docs

    try {
      const routerMessages = [
        { role: 'system',  content: buildRouterSystemPrompt() },
        { role: 'user',    content: lastUserMessage },
      ];

      const routerData = await callGroq(
        env.GROQ_API_KEY,
        routerMessages,
        [buildRouterTool()],
        { type: 'function', function: { name: 'select_documents' } }
      );

      const toolCall = routerData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.name === 'select_documents') {
        const args = JSON.parse(toolCall.function.arguments ?? '{}');
        if (Array.isArray(args.docs) && args.docs.length > 0) {
          selectedDocKeys = args.docs;
        }
      }
    } catch (e) {
      console.warn('Router pass failed, falling back to all docs:', e);
      // non-fatal — continue with all docs
    }

    // ── Fetch only the selected docs (cached per key) ─────────────────────────
    let docContent = '';
    try {
      docContent = await fetchSelectedDocs(selectedDocKeys);
    } catch (e) {
      console.error('fetchSelectedDocs failed:', e);
      // non-fatal — continue with base prompt only
    }

    // ── Pass 2: Final answer with injected docs ───────────────────────────────
    const systemPrompt = docContent
      ? `${BASE_PROMPT}\n\n== RELEVANT DOCUMENTS ==\n\n${docContent}`
      : BASE_PROMPT;

    const finalMessages = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    const finalData = await callGroq(env.GROQ_API_KEY, finalMessages);

    if (finalData.error) {
      return json({ error: finalData.error }, 500);
    }

    const text = finalData.choices?.[0]?.message?.content ?? '';
    return json({ content: [{ type: 'text', text }] });
  },
};
