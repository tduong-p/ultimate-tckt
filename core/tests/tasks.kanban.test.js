const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createTeam, createUser, createActivity } = require('./helpers/fixtures');

async function setup() {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  const teamId = await createTeam(pool);
  const leader = await createUser(pool, { role: 'leader', team_id: teamId, is_lead: true });
  const member = await createUser(pool, { role: 'member', team_id: teamId });
  const activityId = await createActivity(pool, { team_id: teamId, creator_id: leader.id, status: 'approved' });
  return { pool, client, close, teardown, teamId, leader, member, activityId };
}

test('creating a task requires a primary assignee who belongs to the team', async () => {
  const ctx = await setup();
  try {
    await ctx.client.login(ctx.leader.email, ctx.leader.password);
    const missing = await ctx.client.request('POST', `/api/activities/${ctx.activityId}/tasks`, { body: { title: 'Thiết kế standee', team_id: ctx.teamId, deadline: '2026-12-31' } });
    assert.equal(missing.status, 400);
    const ok = await ctx.client.request('POST', `/api/activities/${ctx.activityId}/tasks`, { body: { title: 'Thiết kế standee', team_id: ctx.teamId, deadline: '2026-12-31', primary_assignee_id: ctx.member.id } });
    assert.equal(ok.status, 201);
    const [[assignee]] = await ctx.pool.query('SELECT is_primary FROM task_assignees WHERE task_id=? AND user_id=?', [ok.json.id, ctx.member.id]);
    assert.equal(assignee.is_primary, 1);
  } finally { await ctx.close(); await ctx.teardown(); }
});

test('a member can acknowledge and move todo -> in_progress, but cannot jump to review or done', async () => {
  const ctx = await setup();
  try {
    await ctx.client.login(ctx.leader.email, ctx.leader.password);
    const created = await ctx.client.request('POST', `/api/activities/${ctx.activityId}/tasks`, { body: { title: 'Thiết kế standee', team_id: ctx.teamId, deadline: '2026-12-31', primary_assignee_id: ctx.member.id } });
    const taskId = created.json.id;

    await ctx.client.login(ctx.member.email, ctx.member.password);
    const beforeAck = await ctx.client.request('GET', `/api/tasks/${taskId}`);
    assert.equal(beforeAck.status, 200);
    assert.equal(beforeAck.json.myAcknowledgedAt, null);
    assert.equal(beforeAck.json.assignees.length, 1);
    assert.equal(beforeAck.json.assignees[0].is_primary, 1);
    assert.equal(beforeAck.json.assignees[0].acknowledged_at, null);

    const ack = await ctx.client.request('POST', `/api/tasks/${taskId}/acknowledge`, {});
    assert.equal(ack.status, 200);
    const [[assignee]] = await ctx.pool.query('SELECT acknowledged_at FROM task_assignees WHERE task_id=? AND user_id=?', [taskId, ctx.member.id]);
    assert.ok(assignee.acknowledged_at);

    const afterAck = await ctx.client.request('GET', `/api/tasks/${taskId}`);
    assert.equal(afterAck.status, 200);
    assert.ok(afterAck.json.myAcknowledgedAt);
    assert.ok(afterAck.json.assignees[0].acknowledged_at);

    const advance = await ctx.client.request('PATCH', `/api/tasks/${taskId}/status`, { body: { status: 'in_progress' } });
    assert.equal(advance.status, 200);

    const skipToReview = await ctx.client.request('PATCH', `/api/tasks/${taskId}/status`, { body: { status: 'review' } });
    assert.equal(skipToReview.status, 400);

    const skipToDone = await ctx.client.request('PATCH', `/api/tasks/${taskId}/status`, { body: { status: 'done' } });
    assert.equal(skipToDone.status, 400);
  } finally { await ctx.close(); await ctx.teardown(); }
});
