// Regression tests: answers cut off by the output-token limit (finish_reason "length"),
// e.g. when gpt-oss spends part of max_completion_tokens on hidden reasoning.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleRequest } from '../src/index.js';
import { ENV, fakeGroq, chatRequest, readSse } from './helpers.js';

const question = {
  messages: [
    {
      role: 'user',
      content:
        'Tell me more about this: "Refactored and enhanced Spark Databricks notebooks to build scalable big data ETL pipelines." — what was the real challenge, the approach taken, and the impact?',
    },
  ],
};
const deltasOf = (events) =>
  events
    .filter((e) => e.event === 'delta')
    .map((e) => e.data.t)
    .join('');

test('default output budget leaves room for reasoning', async () => {
  const { fetchImpl, calls } = fakeGroq({ '*': { text: 'ok' } });
  await handleRequest(chatRequest(question), ENV, { fetchImpl });
  assert.equal(calls[0].max_completion_tokens, 2048);
});

test('stream: a cut-off answer is continued automatically and joined cleanly', async () => {
  const { fetchImpl, calls } = fakeGroq({
    '*': [
      { parts: ['At Toyota, the notebooks were fragile. To'], finish: 'length' },
      { parts: ['stabilise them he refactored them into tested jobs.'], finish: 'stop' },
    ],
  });
  const events = await readSse(await handleRequest(chatRequest({ ...question, stream: true }), ENV, { fetchImpl }));
  assert.equal(
    deltasOf(events),
    'At Toyota, the notebooks were fragile. To stabilise them he refactored them into tested jobs.',
  );
  assert.equal(events.at(-1).event, 'done');
  assert.equal(events.at(-1).data.truncated, false);
  assert.equal(calls.length, 2);
  const cont = calls[1].messages;
  assert.equal(cont.at(-2).role, 'assistant');
  assert.match(cont.at(-2).content, /To$/);
  assert.match(cont.at(-1).content, /cut off/);
});

test('stream: still cut off after the continuation → ends with an ellipsis and truncated flag', async () => {
  const { fetchImpl, calls } = fakeGroq({ '*': { parts: ['Partial answer'], finish: 'length' } });
  const events = await readSse(await handleRequest(chatRequest({ ...question, stream: true }), ENV, { fetchImpl }));
  assert.match(deltasOf(events), /…$/);
  assert.equal(events.at(-1).data.truncated, true);
  assert.equal(calls.length, 2, 'one continuation attempt only');
});

test('stream: an error reported mid-stream is surfaced, not swallowed', async () => {
  const { fetchImpl } = fakeGroq({ '*': { parts: ['At Toyota, the'], error: { message: 'rate limit', status: 429 } } });
  const events = await readSse(await handleRequest(chatRequest({ ...question, stream: true }), ENV, { fetchImpl }));
  assert.ok(
    events.some((e) => e.event === 'error'),
    'error event sent to the browser',
  );
});

test('JSON mode: continuation is applied too', async () => {
  const { fetchImpl } = fakeGroq({
    '*': [
      { text: 'First half', finish: 'length' },
      { text: 'second half.', finish: 'stop' },
    ],
  });
  const data = await (await handleRequest(chatRequest(question), ENV, { fetchImpl })).json();
  assert.equal(data.content[0].text, 'First half second half.');
  assert.equal(data.truncated, false);
});
