const test = require('node:test');
const assert = require('node:assert/strict');
const { createNotifier } = require('../src/notifier');

const logger = { warn: () => {}, error: () => {}, info: () => {} };
const valid = { event: 'task.assigned', recipient: { id: 7, name: 'An', email: 'an@hust.edu.vn' }, data: { task: { id: 1 } }, sourceKey: 'task-assigned:1:7' };

test('without a sender nothing is delivered and nothing throws', async () => {
  const result = await createNotifier({ logger }).notify(valid);
  assert.deepEqual(result, { delivered: false, reason: 'no-sender' });
});

test('a valid event reaches the sender unchanged', async () => {
  const seen = [];
  const result = await createNotifier({ logger, sender: async e => { seen.push(e); } }).notify(valid);
  assert.equal(result.delivered, true);
  assert.deepEqual(seen, [valid]);
});

test('an event without recipient email or sourceKey is skipped, never sent, never thrown', async () => {
  const seen = [];
  const notifier = createNotifier({ logger, sender: async e => { seen.push(e); } });
  const noEmail = await notifier.notify({ ...valid, recipient: { id: 7, name: 'An', email: null } });
  const noKey = await notifier.notify({ ...valid, sourceKey: '' });
  const noEvent = await notifier.notify({ ...valid, event: '' });
  assert.deepEqual([noEmail.reason, noKey.reason, noEvent.reason], ['invalid-event', 'invalid-event', 'invalid-event']);
  assert.equal(seen.length, 0);
});

test('a throwing sender is contained', async () => {
  const notifier = createNotifier({ logger, sender: async () => { throw new Error('boom'); } });
  assert.deepEqual(await notifier.notify(valid), { delivered: false, reason: 'sender-error' });
});

test('a hanging sender is cut off by the timeout', async () => {
  const notifier = createNotifier({ logger, timeoutMs: 20, sender: () => new Promise(() => {}) });
  assert.deepEqual(await notifier.notify(valid), { delivered: false, reason: 'timeout' });
});
