import { test } from 'node:test';
import assert from 'node:assert/strict';
import { modelParams, chatCompletion, streamDeltas, stripThinking } from '../src/llm.js';
import { fakeGroq, sseBody } from './helpers.js';

test('per-model reasoning parameters', () => {
  assert.deepEqual(modelParams('openai/gpt-oss-120b'), { reasoning_effort: 'low', include_reasoning: false });
  assert.deepEqual(modelParams('qwen/qwen3.8-27b'), { reasoning_effort: 'none' });
  assert.deepEqual(modelParams('other/model'), {});
});

test('falls back to the next model when one is decommissioned or rate-limited', async () => {
  const { fetchImpl, calls } = fakeGroq({ a: 404, b: 429, c: { text: 'ok' } });
  const { model } = await chatCompletion({
    apiKey: 'k',
    models: ['a', 'b', 'c'],
    messages: [],
    maxTokens: 10,
    fetchImpl,
  });
  assert.equal(model, 'c');
  assert.deepEqual(
    calls.map((c) => c.model),
    ['a', 'b', 'c'],
  );
  assert.equal(calls[0].max_completion_tokens, 10);
});

test('stops on non-retryable errors (bad API key)', async () => {
  const { fetchImpl, calls } = fakeGroq({ a: 401, b: { text: 'ok' } });
  await assert.rejects(
    chatCompletion({ apiKey: 'k', models: ['a', 'b'], messages: [], maxTokens: 10, fetchImpl }),
    /401/,
  );
  assert.equal(calls.length, 1);
});

test('stream parser joins deltas across chunk boundaries and reports usage', async () => {
  const res = new Response(sseBody(['Hel', 'lo ', 'world'], { prompt_tokens: 3, completion_tokens: 2 }));
  let text = '';
  let usage;
  for await (const p of streamDeltas(res)) {
    if (p.text) text += p.text;
    if (p.usage) usage = p.usage;
  }
  assert.equal(text, 'Hello world');
  assert.equal(usage.completion_tokens, 2);
});

test('stream parser removes an inline <think> block split across deltas', async () => {
  const res = new Response(sseBody(['<thi', 'nk>secret plan</th', 'ink>Answer', ' here']));
  let text = '';
  for await (const p of streamDeltas(res)) if (p.text) text += p.text;
  assert.equal(text, 'Answer here');
});

test('stripThinking for non-streamed answers', () => {
  assert.equal(stripThinking('<think>x</think>\nHello'), 'Hello');
  assert.equal(stripThinking('a < b'), 'a < b');
});
