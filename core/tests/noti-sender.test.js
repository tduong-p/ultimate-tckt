const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { toNotiPayload, createNotiSender, notiSenderFromEnv } = require('../src/noti-sender');

const templatesDir = path.join(__dirname, '..', '..', 'services', 'noti-api', 'templates');
const recipient = { id: 7, name: 'An', email: 'an@hust.edu.vn' };
const deadline = new Date(2026, 9, 15); // mysql2 trả cột DATE thành nửa đêm giờ máy chủ

// Đọc danh sách `required` trong meta.yaml (YAML phẳng, mỗi dòng "  - a.b").
function requiredFields(template) {
  const text = fs.readFileSync(path.join(templatesDir, template, 'meta.yaml'), 'utf8');
  const block = text.split(/^required:\s*$/m)[1].split(/^\S/m)[0];
  return [...block.matchAll(/^\s+-\s+(\S+)\s*$/gm)].map(m => m[1]);
}
const get = (data, dotted) => dotted.split('.').reduce((v, k) => (v == null ? undefined : v[k]), data);

// Dữ liệu giống hệt chỗ gọi thật trong routes/ và services/deadline-notifications.js.
const callSites = [
  { event: 'activity.proposed', data: { actor: 'Bình', activity: { id: 3, title: 'MHX', path: '/#activity/3', type: 'event', deadline, priority: 'high' } }, sourceKey: 'activity-proposed:3:1:create' },
  { event: 'activity.participant_added', data: { actor: 'Bình', responsibility: 'Truyền thông', activity: { id: 3, title: 'MHX', path: '/#activity/3', deadline } }, sourceKey: 'activity-participant:3:7' },
  { event: 'activity.decided', data: { actor: 'Bình', action: 'approve', feedback: '', activity: { id: 3, title: 'MHX', path: '/#activity/3' } }, sourceKey: 'activity-decided:3:9:7' },
  { event: 'task.assigned', data: { actor: 'Bình', task: { id: 5, title: 'Poster', path: '/#activity/3', deadline }, activity: { title: 'MHX' } }, sourceKey: 'task-assigned:5:7' },
  { event: 'task.response', data: { actor: 'Bình', response: { kind: 'comment', body: 'Xong bản nháp' }, task: { id: 5, title: 'Poster', path: '/#activity/3' }, activity: { title: 'MHX' } }, sourceKey: 'task-response:11:7' },
  { event: 'task.review_requested', data: { actor: 'Bình', task: { id: 5, title: 'Poster', path: '/#activity/3' }, activity: { title: 'MHX' } }, sourceKey: 'task-review:5:7:1' },
  { event: 'task.reviewed', data: { actor: 'Bình', decision: 'reject', feedback: 'Sửa màu', task: { id: 5, title: 'Poster', path: '/#activity/3' }, activity: { title: 'MHX' } }, sourceKey: 'task-reviewed:5:7:reject:1' },
  { event: 'task.deadline_soon', data: { window: '1 ngày', task: { id: 5, title: 'Poster', path: '/#activity/3', deadline }, activity: { title: 'MHX' } }, sourceKey: 'task-deadline-1d:5:7:2026-10-14' },
  { event: 'task.overdue', data: { task: { id: 5, title: 'Poster', path: '/#activity/3', deadline }, activity: { title: 'MHX' } }, sourceKey: 'task-overdue:5:7:2026-10-16' },
  { event: 'task.unacknowledged', data: { memberName: 'Cường', task: { id: 5, title: 'Poster', path: '/#activity/3' }, activity: { title: 'MHX' } }, sourceKey: 'task-unacknowledged:5:8:1791000000' },
  { event: 'comment.mentioned', data: { actor: 'Bình', comment: { body: 'Nhờ xem giúp' }, activity: { title: 'MHX', path: '/#activity/3' }, task: { id: 5, title: 'Poster' } }, sourceKey: 'comment-mention:11:7' },
  { event: 'comment.mentioned', data: { actor: 'Bình', comment: { body: 'Nhờ xem giúp' }, activity: { title: 'MHX', path: '/#activity/3' } }, sourceKey: 'comment-mention:12:7' },
  { event: 'activity.decided', data: { actor: 'Bình', action: 'reject', feedback: 'Thiếu kinh phí', activity: { id: 3, title: 'MHX' } }, sourceKey: 'activity-decided:3:9:8' },
];

for (const site of callSites) {
  test(`${site.event}: payload has every field the Noti template requires`, () => {
    const payload = toNotiPayload({ ...site, recipient });
    assert.equal(payload.template, site.event);
    assert.deepEqual(payload.recipients, [{ email: 'an@hust.edu.vn', name: 'An' }]);
    assert.equal(payload.dedupe_key, site.sourceKey);
    for (const field of requiredFields(site.event)) {
      const value = get(payload.data, field);
      assert.ok(value !== undefined && value !== null && value !== '', `${site.event} missing ${field}`);
    }
  });
}

test('every Core event is covered by a template', () => {
  for (const site of callSites) assert.ok(fs.existsSync(path.join(templatesDir, site.event, 'meta.yaml')), site.event);
});

test('raw codes become Vietnamese labels; unknown codes pass through', () => {
  const data = e => toNotiPayload({ ...e, recipient, sourceKey: 'k' }).data;
  assert.equal(data({ event: 'activity.decided', data: { action: 'approve' } }).action, 'Đã phê duyệt');
  assert.equal(data({ event: 'activity.decided', data: { action: 'reject' } }).action, 'Đã từ chối');
  assert.equal(data({ event: 'activity.decided', data: { action: 'request_changes' } }).action, 'Yêu cầu chỉnh sửa');
  assert.equal(data({ event: 'task.reviewed', data: { decision: 'approve' } }).decision, 'Đã nghiệm thu đạt');
  assert.equal(data({ event: 'task.reviewed', data: { decision: 'reject' } }).decision, 'Yêu cầu làm lại');
  assert.equal(data({ event: 'task.reviewed', data: { decision: 'cancel' } }).decision, 'Đã bác bỏ');
  assert.equal(data({ event: 'task.response', data: { response: { kind: 'evidence', body: 'x' } } }).response.kind, 'Minh chứng');
  assert.equal(data({ event: 'task.reviewed', data: { decision: 'weird' } }).decision, 'weird');
});

test('dates print as plain local dates; empty values are dropped', () => {
  const { data } = toNotiPayload({ event: 'task.assigned', recipient, sourceKey: 'k', data: {
    feedback: '', note: null, gone: undefined,
    task: { deadline, due: new Date(2026, 9, 15, 17, 5) },
  } });
  assert.deepEqual(data, { task: { deadline: '2026-10-15', due: '2026-10-15 17:05' } });
});

test('recipient without a name is sent with email only', () => {
  const payload = toNotiPayload({ event: 'task.overdue', recipient: { id: 1, email: 'x@hust.edu.vn', name: null }, sourceKey: 'k', data: {} });
  assert.deepEqual(payload.recipients, [{ email: 'x@hust.edu.vn' }]);
});

function fakeFetch(response) {
  const calls = [];
  const fn = async (url, init) => { calls.push({ url, init }); return typeof response === 'function' ? response(init) : response; };
  fn.calls = calls;
  return fn;
}
const reply = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body, body: { cancel: async () => { reply.cancelled += 1; } } });
reply.cancelled = 0;
const event = { ...callSites[3], recipient };

test('sender POSTs the payload with the bearer key and accepts 202 and 200', async () => {
  for (const status of [202, 200]) {
    const fetchImpl = fakeFetch(reply(status, { id: 'n1', status: 'queued' }));
    await createNotiSender({ url: 'http://noti-api:8000/', apiKey: 'secret-key', fetchImpl })(event);
    const [{ url, init }] = fetchImpl.calls;
    assert.equal(url, 'http://noti-api:8000/v1/notifications');
    assert.equal(init.method, 'POST');
    assert.equal(init.headers.Authorization, 'Bearer secret-key');
    assert.equal(init.headers['Content-Type'], 'application/json');
    assert.deepEqual(JSON.parse(init.body), toNotiPayload(event));
  }
});

test('sender rejects on 4xx/5xx with status and Noti error code, never the key', async () => {
  for (const [status, body] of [[409, { error: 'data_purged' }], [401, { error: 'unauthorized' }], [400, { error: 'validation_error', details: [{ field: 'actor' }] }], [503, null]]) {
    const fetchImpl = fakeFetch({ ok: false, status, json: async () => { if (!body) throw new Error('no json'); return body; } });
    await assert.rejects(createNotiSender({ url: 'http://n', apiKey: 'secret-key', fetchImpl })(event), error => {
      assert.match(error.message, new RegExp(String(status)));
      if (body) assert.match(error.message, new RegExp(body.error));
      assert.doesNotMatch(`${error.message} ${error.stack}`, /secret-key/);
      return true;
    });
  }
});

test('sender treats 409 dedupe_key_conflict as already sent (scheduler resends every 15 min)', async () => {
  const fetchImpl = fakeFetch(reply(409, { error: 'dedupe_key_conflict' }));
  await createNotiSender({ url: 'http://n', apiKey: 'k', fetchImpl })(event);
});

test('sender releases the response body on success', async () => {
  const before = reply.cancelled;
  await createNotiSender({ url: 'http://n', apiKey: 'k', fetchImpl: fakeFetch(reply(202, {})) })(event);
  assert.equal(reply.cancelled, before + 1);
});

test('a fetch failure is rethrown without the request (header value would carry the key)', async () => {
  const fetchImpl = async () => { throw new TypeError('Headers.append: "Bearer secret-key\n" is an invalid header value.'); };
  await assert.rejects(createNotiSender({ url: 'http://n', apiKey: 'secret-key', fetchImpl })(event), error => {
    assert.doesNotMatch(`${error.message} ${error.stack}`, /secret-key/);
    assert.match(error.message, /TypeError/);
    return true;
  });
});

test('a long task response body is cut so Noti does not reject it (64 KB limit)', () => {
  const { data } = toNotiPayload({ event: 'task.response', recipient, sourceKey: 'k', data: { response: { kind: 'comment', body: 'ả'.repeat(10000) } } });
  assert.ok(data.response.body.length <= 4000);
  assert.ok(data.response.body.endsWith('…'));
});

test('a long mention comment is cut to 4000 characters', () => {
  const { data } = toNotiPayload({ event: 'comment.mentioned', recipient, sourceKey: 'k', data: { comment: { body: 'ả'.repeat(10000) } } });
  assert.equal(data.comment.body.length, 4000);
  assert.ok(data.comment.body.endsWith('…'));
});

test('5xx, 429 and network failures are transient; 400/401/413 are not', async () => {
  const run = fetchImpl => createNotiSender({ url: 'http://n', apiKey: 'k', fetchImpl })(event);
  for (const status of [500, 503, 429]) {
    await assert.rejects(run(fakeFetch({ ok: false, status, json: async () => ({}) })), err => err.transient === true && err.status === status);
  }
  for (const status of [400, 401, 413]) {
    await assert.rejects(run(fakeFetch({ ok: false, status, json: async () => ({}) })), err => err.transient !== true && err.status === status);
  }
  await assert.rejects(run(async () => { throw new TypeError('fetch failed'); }), err => err.transient === true);
});

test('a long decision feedback is cut to 4000 characters', () => {
  for (const [name, data] of [['task.reviewed', { decision: 'reject' }], ['activity.decided', { action: 'reject' }]]) {
    const payload = toNotiPayload({ event: name, recipient, sourceKey: 'k', data: { ...data, feedback: 'ả'.repeat(5000) } });
    assert.equal(payload.data.feedback.length, 4000);
    assert.ok(payload.data.feedback.endsWith('…'));
  }
});

test('activity.proposed priority and type get Vietnamese labels', () => {
  const data = activity => toNotiPayload({ event: 'activity.proposed', recipient, sourceKey: 'k', data: { activity } }).data.activity;
  assert.equal(data({ priority: 'urgent', type: 'event' }).priority, 'Khẩn cấp');
  assert.equal(data({ priority: 'urgent', type: 'event' }).type, 'Tổ đề xuất');
  assert.equal(data({ priority: 'low', type: 'assigned' }).priority, 'Thấp');
  assert.equal(data({ priority: 'low', type: 'assigned' }).type, 'Lãnh đạo giao');
  assert.equal(data({ priority: 'medium' }).priority, 'Trung bình');
  assert.equal(data({ priority: 'high' }).priority, 'Cao');
  assert.equal(data({ type: 'xyz' }).type, 'xyz');
});

test('sender passes an abort signal so a hung request is cancelled', async () => {
  const fetchImpl = fakeFetch(init => new Promise((_resolve, reject) => {
    init.signal.addEventListener('abort', () => reject(init.signal.reason));
  }));
  await assert.rejects(createNotiSender({ url: 'http://n', apiKey: 'k', fetchImpl, timeoutMs: 20 })(event));
});

test('notiSenderFromEnv needs both NOTI_URL and NOTI_API_KEY', () => {
  assert.equal(notiSenderFromEnv({}), null);
  assert.equal(notiSenderFromEnv({ NOTI_URL: 'http://noti-api:8000' }), null);
  assert.equal(notiSenderFromEnv({ NOTI_API_KEY: 'k' }), null);
  assert.equal(notiSenderFromEnv({ NOTI_URL: ' ', NOTI_API_KEY: 'k' }), null);
  assert.equal(typeof notiSenderFromEnv({ NOTI_URL: 'http://noti-api:8000', NOTI_API_KEY: 'k' }), 'function');
});
