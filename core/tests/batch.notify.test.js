'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { createApplication } = require('../src/app');
const { createTestDatabase } = require('./helpers/db');
const { createTeam, createUser, createActivity, createTask } = require('./helpers/fixtures');

// Giống startRecordingServer trong notifications.routes.test.js: notiSender ghi lại mọi event gửi đi.
async function startRecordingServer(db) {
  const sent = [];
  const { app } = createApplication({
    db,
    config: { packageInfo: require('../package.json'), isProduction: false, hasConfiguredDatabase: false, sessionSecret: 'test-secret', microsoftSso: { tenant: 'hust.edu.vn', clientId: '', clientSecret: '', redirectUri: '', allowedDomain: 'hust.edu.vn' } },
    notiSender: async event => { sent.push(event); }
  });
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  let cookie = '';
  async function request(method, urlPath, body) {
    const response = await fetch(`${baseUrl}${urlPath}`, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined });
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    const text = await response.text();
    return { status: response.status, json: text ? JSON.parse(text) : null };
  }
  async function login(user) {
    cookie = '';
    assert.equal((await request('POST', '/api/login', { email: user.email, password: user.password })).status, 200);
  }
  return { request, login, sent, close: () => new Promise(resolve => server.close(resolve)) };
}

const settle = () => new Promise(resolve => setTimeout(resolve, 250));
const emailsOf = (sent, name) => sent.filter(e => e.event === name).map(e => e.recipient.email).sort();

async function withEnv(fn) {
  const { pool, teardown } = await createTestDatabase();
  const server = await startRecordingServer(pool);
  try {
    const teamId = await createTeam(pool);
    const admin = await createUser(pool, { role: 'admin', name: 'Quản trị A' });
    const leader = await createUser(pool, { role: 'leader', team_id: teamId, is_lead: true });
    const member = await createUser(pool, { role: 'member', team_id: teamId });
    const newcomer = await createUser(pool, { role: 'member', team_id: teamId });
    const eventLead = await createUser(pool, { role: 'member' });
    const activityId = await createActivity(pool, { team_id: teamId, creator_id: admin.id, event_lead_id: eventLead.id, status: 'approved' });
    const taskId = await createTask(pool, { activity_id: activityId, team_id: teamId, primary_assignee_id: member.id, assigned_by: leader.id });
    await fn({ pool, ...server, teamId, admin, leader, member, newcomer, eventLead, activityId, taskId });
  } finally { await server.close(); await teardown(); }
}

test('one consolidated task.updated lists both changed fields; the actor gets nothing', async () => {
  await withEnv(async ({ request, login, sent, leader, member, taskId }) => {
    await login(leader);
    const res = await request('PATCH', `/api/tasks/${taskId}/batch`, { changes: { title: 'Tên mới', deadline: '2030-06-01' }, base: {} });
    assert.equal(res.status, 200);
    await settle();
    assert.equal(sent.length, 1);
    assert.deepEqual(emailsOf(sent, 'task.updated'), [member.email]);
    const [event] = sent;
    assert.deepEqual(event.data.changed, ['Tiêu đề', 'Hạn']);
    assert.equal(event.data.title, 'Tên mới');
    assert.ok(event.data.actorName);
    assert.match(event.sourceKey, new RegExp(`^task\\.updated:${taskId}:\\d{10}$`));
  });
});

test('team lead and assignee both receive task.updated when an admin edits', async () => {
  await withEnv(async ({ request, login, sent, admin, leader, member, taskId, pool }) => {
    await login(admin);
    assert.equal((await request('PATCH', `/api/tasks/${taskId}/batch`, { changes: { priority: 'urgent' }, base: {} })).status, 200);
    await settle();
    assert.deepEqual(emailsOf(sent, 'task.updated'), [leader.email, member.email].sort());
    const [rows] = await pool.query("SELECT user_id,task_id FROM notifications WHERE kind='task.updated' ORDER BY user_id");
    assert.equal(rows.length, 2);
    assert.ok(rows.every(r => r.task_id === taskId));
  });
});

test('newly added assignees get task.assigned instead of task.updated', async () => {
  await withEnv(async ({ request, login, sent, leader, member, newcomer, taskId }) => {
    await login(leader);
    const res = await request('PATCH', `/api/tasks/${taskId}/batch`, { changes: { title: 'Đổi tên', co_assignee_ids: [newcomer.id] }, base: {} });
    assert.equal(res.status, 200);
    await settle();
    assert.deepEqual(emailsOf(sent, 'task.assigned'), [newcomer.email]);
    assert.deepEqual(emailsOf(sent, 'task.updated'), [member.email]);
    assert.ok(!sent.some(e => e.event === 'task.updated' && e.recipient.email === newcomer.email));
  });
});

test('a no-op task batch sends nothing', async () => {
  await withEnv(async ({ request, login, sent, leader, taskId, pool }) => {
    await login(leader);
    const [[task]] = await pool.query('SELECT title FROM tasks WHERE id=?', [taskId]);
    assert.equal((await request('PATCH', `/api/tasks/${taskId}/batch`, { changes: { title: task.title }, base: {} })).status, 200);
    assert.equal((await request('PATCH', `/api/tasks/${taskId}/batch`, { changes: {}, base: {} })).status, 200);
    await settle();
    assert.equal(sent.length, 0);
    const [rows] = await pool.query('SELECT id FROM notifications');
    assert.equal(rows.length, 0);
  });
});

test('activity.updated reaches the event lead (and the replaced one) but not the actor', async () => {
  await withEnv(async ({ request, login, sent, admin, leader, eventLead, activityId }) => {
    await login(admin);
    const res = await request('PATCH', `/api/activities/${activityId}/batch`, { changes: { title: 'Tên hoạt động mới', priority: 'high' }, base: {} });
    assert.equal(res.status, 200);
    await settle();
    assert.deepEqual(emailsOf(sent, 'activity.updated'), [eventLead.email]);
    assert.deepEqual(sent[0].data.changed, ['Tiêu đề', 'Ưu tiên']);
    assert.match(sent[0].sourceKey, new RegExp(`^activity\\.updated:${activityId}:\\d{10}$`));

    sent.length = 0;
    const swap = await request('PATCH', `/api/activities/${activityId}/batch`, { changes: { event_lead_id: leader.id }, base: {} });
    assert.equal(swap.status, 200);
    await settle();
    assert.deepEqual(emailsOf(sent, 'activity.updated'), [eventLead.email, leader.email].sort());
  });
});

test('a no-op activity batch sends nothing', async () => {
  await withEnv(async ({ request, login, sent, admin, activityId }) => {
    await login(admin);
    assert.equal((await request('PATCH', `/api/activities/${activityId}/batch`, { changes: { priority: 'medium' }, base: {} })).status, 200);
    await settle();
    assert.equal(sent.length, 0);
  });
});
