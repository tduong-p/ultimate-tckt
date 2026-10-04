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
  const notifier = createNotifier({ logger, timeoutMs: 20, retryDelaysMs: [0, 0], sender: () => new Promise(() => {}) });
  assert.deepEqual(await notifier.notify(valid), { delivered: false, reason: 'timeout', retryable: true });
});

const fast = { retryDelaysMs: [0, 0] };
const transientError = () => Object.assign(new Error('Noti unreachable'), { transient: true });

test('the actor never receives a mail about their own action', async () => {
  let calls = 0;
  const notifier = createNotifier({ logger, sender: async () => { calls += 1; }, ...fast });
  assert.deepEqual(await notifier.notify({ ...valid, actorId: 7 }), { delivered: false, reason: 'self' });
  assert.deepEqual(await notifier.notify({ ...valid, actorId: '7' }), { delivered: false, reason: 'self' });
  assert.equal(calls, 0);
});

test('an undeliverable email is skipped with a warning that has no full address', async () => {
  const warnings = [];
  let calls = 0;
  const notifier = createNotifier({ logger: { ...logger, warn: m => warnings.push(String(m)) }, sender: async () => { calls += 1; }, ...fast });
  const result = await notifier.notify({ ...valid, recipient: { id: 8, name: 'X', email: 'x@tckt.local' } });
  assert.deepEqual(result, { delivered: false, reason: 'invalid-email' });
  assert.equal(calls, 0);
  assert.ok(warnings.some(m => m.includes('tckt.local')));
  assert.ok(!warnings.some(m => m.includes('x@tckt.local')));
});

test('transient failures are retried up to 3 attempts then reported retryable', async () => {
  let calls = 0;
  const notifier = createNotifier({ logger, sender: async () => { calls += 1; throw transientError(); }, ...fast });
  assert.deepEqual(await notifier.notify(valid), { delivered: false, reason: 'sender-error', retryable: true });
  assert.equal(calls, 3);
});

test('a transient failure followed by success is delivered', async () => {
  let calls = 0;
  const notifier = createNotifier({ logger, sender: async () => { calls += 1; if (calls === 1) throw transientError(); }, ...fast });
  assert.deepEqual(await notifier.notify(valid), { delivered: true });
  assert.equal(calls, 2);
});

test('a non-transient failure is not retried', async () => {
  let calls = 0;
  const notifier = createNotifier({ logger, sender: async () => { calls += 1; throw new Error('Noti responded 400'); }, ...fast });
  const result = await notifier.notify(valid);
  assert.equal(calls, 1);
  assert.equal(result.reason, 'sender-error');
  assert.equal('retryable' in result, false);
});

test('a hanging attempt times out and is retried', async () => {
  let calls = 0;
  const notifier = createNotifier({ logger, sender: () => { calls += 1; return new Promise(() => {}); }, timeoutMs: 20, ...fast });
  assert.deepEqual(await notifier.notify(valid), { delivered: false, reason: 'timeout', retryable: true });
  assert.equal(calls, 3);
});
