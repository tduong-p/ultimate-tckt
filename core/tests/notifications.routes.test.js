'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { createApplication } = require('../src/app');
const { createTestDatabase } = require('./helpers/db');
const { createTeam, createUser, createActivity, createTask } = require('./helpers/fixtures');

// Giống testConfig trong helpers/server.js, nhưng cần notiSender ghi lại event nên không dùng startTestServer.
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
    const result = await request('POST', '/api/login', { email: user.email, password: user.password });
    assert.equal(result.status, 200);
  }
  return { request, login, sent, close: () => new Promise(resolve => server.close(resolve)) };
}

// Route gửi thông báo sau khi trả response nên phải chờ.
async function waitFor(fn, ms = 2000) {
  const end = Date.now() + ms;
  for (;;) {
    const value = fn();
    if (value) return value;
    if (Date.now() > end) throw new Error('waitFor timed out');
    await new Promise(resolve => setTimeout(resolve, 20));
  }
}
const settle = () => new Promise(resolve => setTimeout(resolve, 200));
const emailsOf = (sent, name) => sent.filter(e => e.event === name).map(e => e.recipient.email).sort();

async function withEnv(fn) {
  const { pool, teardown } = await createTestDatabase();
  const server = await startRecordingServer(pool);
  try { await fn({ pool, ...server }); } finally { await server.close(); await teardown(); }
}

test('review request reaches team leads and the event lead, never the submitter', async () => {
  await withEnv(async ({ pool, request, login, sent }) => {
    const teamId = await createTeam(pool);
    const lead = await createUser(pool, { role: 'leader', team_id: teamId, is_lead: true });
    const eventLead = await createUser(pool, { role: 'member' });
    const member = await createUser(pool, { role: 'member', team_id: teamId });
    const activityId = await createActivity(pool, { team_id: teamId, creator_id: lead.id, event_lead_id: eventLead.id, status: 'approved' });
    const taskId = await createTask(pool, { activity_id: activityId, team_id: teamId, primary_assignee_id: member.id, assigned_by: lead.id, status: 'in_progress' });
    await login(member);
    const res = await request('POST', `/api/tasks/${taskId}/submit-review`, { link_url: 'https://drive.google.com/evidence' });
    assert.equal(res.status, 201);
    await waitFor(() => sent.filter(e => e.event === 'task.review_requested').length >= 2);
    await settle();
    assert.deepEqual(emailsOf(sent, 'task.review_requested'), [lead.email, eventLead.email].sort());
    assert.ok(!sent.some(e => e.recipient.email === member.email));
  });
});

test('a lead submitting their own task with no other reviewer falls back to admins', async () => {
  await withEnv(async ({ pool, request, login, sent }) => {
    const teamId = await createTeam(pool);
    const lead = await createUser(pool, { role: 'leader', team_id: teamId, is_lead: true });
    const admin = await createUser(pool, { role: 'admin' });
    const activityId = await createActivity(pool, { team_id: teamId, creator_id: lead.id, status: 'approved' });
    const taskId = await createTask(pool, { activity_id: activityId, team_id: teamId, primary_assignee_id: lead.id, assigned_by: lead.id, status: 'in_progress' });
    await login(lead);
    const res = await request('POST', `/api/tasks/${taskId}/submit-review`, { link_url: 'https://drive.google.com/evidence' });
    assert.equal(res.status, 201);
    await waitFor(() => sent.some(e => e.event === 'task.review_requested' && e.recipient.email === admin.email));
    await settle();
    assert.ok(!sent.some(e => e.recipient.email === lead.email));
  });
});

test('self-logged task notifies the same reviewers in mail and in-app', async () => {
  await withEnv(async ({ pool, request, login, sent }) => {
    const teamId = await createTeam(pool);
    const lead = await createUser(pool, { role: 'leader', team_id: teamId, is_lead: true });
    const eventLead = await createUser(pool, { role: 'member' });
    const member = await createUser(pool, { role: 'member', team_id: teamId });
    const activityId = await createActivity(pool, { team_id: teamId, creator_id: lead.id, event_lead_id: eventLead.id, status: 'approved' });
    await login(member);
    const res = await request('POST', `/api/activities/${activityId}/log-task`, { title: 'Trực ca sáng', team_id: teamId, weight: 2 });
    assert.equal(res.status, 201);
    await waitFor(() => sent.filter(e => e.event === 'task.review_requested').length >= 2);
    const [rows] = await pool.query("SELECT user_id FROM notifications WHERE kind='task_review' AND task_id=?", [res.json.id]);
    assert.deepEqual(rows.map(r => r.user_id).sort((a, b) => a - b), [lead.id, eventLead.id].sort((a, b) => a - b));
    assert.deepEqual(emailsOf(sent, 'task.review_requested'), [lead.email, eventLead.email].sort());
  });
});

test('rejecting a proposal sends activity.decided without a link; approving keeps it', async () => {
  await withEnv(async ({ pool, request, login, sent }) => {
    const teamId = await createTeam(pool);
    const lead = await createUser(pool, { role: 'leader', team_id: teamId, is_lead: true });
    const admin = await createUser(pool, { role: 'admin' });
    const rejected = await createActivity(pool, { team_id: teamId, creator_id: lead.id, status: 'proposed' });
    const approved = await createActivity(pool, { team_id: teamId, creator_id: lead.id, status: 'proposed' });
    await login(admin);
    assert.equal((await request('POST', `/api/activities/${rejected}/reject`, { feedback: 'Không phù hợp' })).status, 200);
    assert.equal((await request('POST', `/api/activities/${approved}/approve`, {})).status, 200);
    await waitFor(() => sent.filter(e => e.event === 'activity.decided').length >= 2);
    const byId = id => sent.find(e => e.event === 'activity.decided' && e.data.activity.id === id);
    assert.equal(byId(rejected).data.activity.path, undefined);
    assert.equal(byId(approved).data.activity.path, `/#activity/${approved}`);
  });
});

test('proposal mails carry type, deadline and priority and go to admin and vice_admin', async () => {
  await withEnv(async ({ pool, request, login, sent }) => {
    const teamId = await createTeam(pool);
    const lead = await createUser(pool, { role: 'leader', team_id: teamId, is_lead: true });
    const admin = await createUser(pool, { role: 'admin' });
    const viceAdmin = await createUser(pool, { role: 'vice_admin' });
    await login(lead);
    const created = await request('POST', '/api/activities', { title: 'Đề án mới', description: 'Mô tả', type: 'event', deadline: '2030-01-15', priority: 'high', team_id: teamId });
    assert.equal(created.status, 201);
    await waitFor(() => emailsOf(sent, 'activity.proposed').includes(admin.email) && emailsOf(sent, 'activity.proposed').includes(viceAdmin.email));
    const first = sent.find(e => e.event === 'activity.proposed');
    assert.equal(first.data.activity.type, 'event');
    assert.equal(first.data.activity.priority, 'high');
    assert.ok(first.data.activity.deadline);

    sent.length = 0;
    const resub = await createActivity(pool, { team_id: teamId, creator_id: lead.id, status: 'changes_requested' });
    assert.equal((await request('POST', `/api/activities/${resub}/submit`, {})).status, 200);
    await waitFor(() => emailsOf(sent, 'activity.proposed').includes(admin.email) && emailsOf(sent, 'activity.proposed').includes(viceAdmin.email));
    const again = sent.find(e => e.event === 'activity.proposed');
    assert.equal(again.data.activity.type, 'event');
    assert.ok(again.data.activity.deadline);
    assert.ok(again.data.activity.priority);
  });
});

test('a leader assigning a task to themselves gets no mail', async () => {
  await withEnv(async ({ pool, request, login, sent }) => {
    const teamId = await createTeam(pool);
    const lead = await createUser(pool, { role: 'leader', team_id: teamId, is_lead: true });
    const member = await createUser(pool, { role: 'member', team_id: teamId });
    const activityId = await createActivity(pool, { team_id: teamId, creator_id: lead.id, status: 'approved' });
    await login(lead);
    const res = await request('POST', `/api/activities/${activityId}/tasks`, { title: 'Việc chung', team_id: teamId, deadline: '2030-01-15', primary_assignee_id: lead.id, co_assignee_ids: [member.id] });
    assert.equal(res.status, 201);
    await waitFor(() => emailsOf(sent, 'task.assigned').includes(member.email));
    await settle();
    assert.ok(!emailsOf(sent, 'task.assigned').includes(lead.email));
  });
});
