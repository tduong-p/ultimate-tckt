'use strict';
// Email nào đi tới ai: gắn thẻ trong bình luận, phản hồi công việc, nghiệm thu, giao việc.
// Bảng người nhận: docs/dev/email-cron.md. Subject gom thread do template Noti quyết định (services/noti-api/templates).
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createTeam, createUser, createActivity, createTask } = require('./helpers/fixtures');

async function setup() {
  const { pool, teardown } = await createTestDatabase();
  const sent = [];
  const { client, close } = await startTestServer(pool, { notiSender: async event => { sent.push(event); } });
  const teamId = await createTeam(pool);
  const leader = await createUser(pool, { role: 'leader', team_id: teamId, is_lead: true });
  const member = await createUser(pool, { role: 'member', team_id: teamId });
  const other = await createUser(pool, { role: 'member', team_id: teamId });
  const activityId = await createActivity(pool, { team_id: teamId, creator_id: leader.id, status: 'approved', title: 'Mùa hè xanh' });
  const taskId = await createTask(pool, { activity_id: activityId, team_id: teamId, primary_assignee_id: member.id, assigned_by: leader.id, title: 'Làm poster' });
  return { pool, client, sent, teamId, leader, member, other, activityId, taskId, done: async () => { await close(); await teardown(); } };
}

// Email gửi sau khi trả response (không chờ), nên đợi tới khi đủ số event mong đợi.
async function waitFor(sent, predicate, count) {
  for (let i = 0; i < 100; i += 1) {
    if (sent.filter(predicate).length >= count) break;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  await new Promise(resolve => setTimeout(resolve, 100));
  return sent.filter(predicate);
}

const to = (events, user) => events.filter(e => Number(e.recipient.id) === Number(user.id)).map(e => e.event).sort();

test('tagging someone in a task comment emails them a mention with project and task titles', async () => {
  const ctx = await setup();
  try {
    await ctx.client.login(ctx.member.email, ctx.member.password);
    const posted = await ctx.client.request('POST', `/api/activities/${ctx.activityId}/updates`, { body: { body: 'Nhờ xem giúp', kind: 'comment', task_id: ctx.taskId, tagged_user_ids: String(ctx.other.id) } });
    assert.equal(posted.status, 201);
    const events = await waitFor(ctx.sent, () => true, 2);

    assert.deepEqual(to(events, ctx.other), ['comment.mentioned']);
    const mention = events.find(e => e.event === 'comment.mentioned');
    assert.equal(mention.recipient.email, ctx.other.email);
    assert.deepEqual(mention.data.activity, { title: 'Mùa hè xanh', path: `/#activity/${ctx.activityId}` });
    assert.deepEqual(mention.data.task, { id: ctx.taskId, title: 'Làm poster' });
    assert.equal(mention.data.comment.body, 'Nhờ xem giúp');
    assert.equal(mention.sourceKey, `comment-mention:${posted.json.id}:${ctx.other.id}`);

    // Người giao việc không bị tag vẫn nhận phản hồi công việc như cũ.
    assert.deepEqual(to(events, ctx.leader), ['task.response']);
    assert.deepEqual(to(events, ctx.member), []);
  } finally { await ctx.done(); }
});

test('a tagged task owner gets only the mention, not a second task.response email', async () => {
  const ctx = await setup();
  try {
    await ctx.client.login(ctx.member.email, ctx.member.password);
    const posted = await ctx.client.request('POST', `/api/activities/${ctx.activityId}/updates`, { body: { body: 'Anh duyệt giúp', kind: 'comment', task_id: ctx.taskId, tagged_user_ids: String(ctx.leader.id) } });
    assert.equal(posted.status, 201);
    const events = await waitFor(ctx.sent, () => true, 1);
    assert.deepEqual(to(events, ctx.leader), ['comment.mentioned']);
  } finally { await ctx.done(); }
});

test('tagging someone in an activity comment emails a mention without task fields', async () => {
  const ctx = await setup();
  try {
    await ctx.client.login(ctx.member.email, ctx.member.password);
    const posted = await ctx.client.request('POST', `/api/activities/${ctx.activityId}/updates`, { body: { body: 'Họp lúc 9h', kind: 'comment', tagged_user_ids: String(ctx.other.id) } });
    assert.equal(posted.status, 201);
    const events = await waitFor(ctx.sent, () => true, 1);
    assert.deepEqual(events.map(e => e.event), ['comment.mentioned']);
    assert.equal(events[0].data.task, undefined);
    assert.equal(events[0].data.activity.title, 'Mùa hè xanh');
  } finally { await ctx.done(); }
});

test('review result email carries the project title so it threads with the task', async () => {
  const ctx = await setup();
  try {
    await ctx.client.login(ctx.member.email, ctx.member.password);
    await ctx.client.request('POST', `/api/tasks/${ctx.taskId}/submit-review`, { body: { link_url: 'https://drive.google.com/file/x' } });
    await ctx.client.login(ctx.leader.email, ctx.leader.password);
    const reviewed = await ctx.client.request('POST', `/api/tasks/${ctx.taskId}/review`, { body: { decision: 'approve' } });
    assert.equal(reviewed.status, 200);
    const [result] = await waitFor(ctx.sent, e => e.event === 'task.reviewed', 1);
    assert.equal(result.data.activity.title, 'Mùa hè xanh');
    assert.equal(result.data.task.title, 'Làm poster');
  } finally { await ctx.done(); }
});

test('a deactivated assignee gets no task.assigned email or in-app notification', async () => {
  const ctx = await setup();
  try {
    const admin = await createUser(ctx.pool, { role: 'admin', units: [['TCKT', 'admin']] });
    await ctx.pool.execute('UPDATE users SET is_active=0 WHERE id=?', [ctx.other.id]);
    await ctx.client.login(admin.email, admin.password);
    const created = await ctx.client.request('POST', `/api/activities/${ctx.activityId}/tasks`, { body: { title: 'Thuê loa', team_id: ctx.teamId, deadline: '2030-01-01', primary_assignee_id: ctx.member.id, co_assignee_ids: String(ctx.other.id) } });
    assert.equal(created.status, 201, JSON.stringify(created.json));
    const events = await waitFor(ctx.sent, e => e.event === 'task.assigned', 1);
    assert.deepEqual(events.map(e => Number(e.recipient.id)), [ctx.member.id]);
    const [rows] = await ctx.pool.query("SELECT user_id FROM notifications WHERE kind='task_assigned'");
    assert.deepEqual(rows.map(r => Number(r.user_id)), [ctx.member.id]);
  } finally { await ctx.done(); }
});
