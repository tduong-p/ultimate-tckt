const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createTeam, createUser, createActivity, createTask } = require('./helpers/fixtures');

async function setup(overrides = {}) {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  const teamId = await createTeam(pool);
  const leader = await createUser(pool, { role: 'leader', team_id: teamId, is_lead: true });
  const member = await createUser(pool, { role: 'member', team_id: teamId });
  const activityId = await createActivity(pool, { team_id: teamId, creator_id: leader.id, status: 'approved' });
  const taskId = await createTask(pool, { activity_id: activityId, team_id: teamId, primary_assignee_id: member.id, assigned_by: leader.id, ...overrides });
  return { pool, client, close, teardown, teamId, leader, member, activityId, taskId };
}

test('submitting for review without a link or file is rejected', async () => {
  const ctx = await setup();
  try {
    await ctx.client.login(ctx.member.email, ctx.member.password);
    const result = await ctx.client.request('POST', `/api/tasks/${ctx.taskId}/submit-review`, { body: { notes: 'Xong rồi' } });
    assert.equal(result.status, 400);
  } finally { await ctx.close(); await ctx.teardown(); }
});

test('submit with a link moves the task to review; member cannot review their own task', async () => {
  const ctx = await setup();
  try {
    await ctx.client.login(ctx.member.email, ctx.member.password);
    const submitted = await ctx.client.request('POST', `/api/tasks/${ctx.taskId}/submit-review`, { body: { link_url: 'https://drive.google.com/file/x', notes: 'Bản thiết kế cuối' } });
    assert.equal(submitted.status, 201);
    const [[task]] = await ctx.pool.query('SELECT status,submitted_for_review_at FROM tasks WHERE id=?', [ctx.taskId]);
    assert.equal(task.status, 'review');
    assert.ok(task.submitted_for_review_at);

    const selfReview = await ctx.client.request('POST', `/api/tasks/${ctx.taskId}/review`, { body: { decision: 'approve' } });
    assert.equal(selfReview.status, 403);
  } finally { await ctx.close(); await ctx.teardown(); }
});

test('lead approval marks the task done; rejection sends it back with feedback', async () => {
  const ctx = await setup();
  try {
    await ctx.client.login(ctx.member.email, ctx.member.password);
    await ctx.client.request('POST', `/api/tasks/${ctx.taskId}/submit-review`, { body: { link_url: 'https://drive.google.com/file/x' } });

    await ctx.client.login(ctx.leader.email, ctx.leader.password);
    const rejectNoFeedback = await ctx.client.request('POST', `/api/tasks/${ctx.taskId}/review`, { body: { decision: 'reject' } });
    assert.equal(rejectNoFeedback.status, 400);

    const reject = await ctx.client.request('POST', `/api/tasks/${ctx.taskId}/review`, { body: { decision: 'reject', feedback: 'Link trắng, làm lại.' } });
    assert.equal(reject.status, 200);
    const [[afterReject]] = await ctx.pool.query('SELECT status FROM tasks WHERE id=?', [ctx.taskId]);
    assert.equal(afterReject.status, 'in_progress');

    await ctx.client.login(ctx.member.email, ctx.member.password);
    await ctx.client.request('POST', `/api/tasks/${ctx.taskId}/submit-review`, { body: { link_url: 'https://drive.google.com/file/y' } });
    await ctx.client.login(ctx.leader.email, ctx.leader.password);
    const approve = await ctx.client.request('POST', `/api/tasks/${ctx.taskId}/review`, { body: { decision: 'approve' } });
    assert.equal(approve.status, 200);
    const [[done]] = await ctx.pool.query('SELECT status,completed_at FROM tasks WHERE id=?', [ctx.taskId]);
    assert.equal(done.status, 'done');
    assert.ok(done.completed_at);

    const [[reviewNote]] = await ctx.pool.query("SELECT COUNT(*) count FROM updates WHERE task_id=? AND kind='review_note'", [ctx.taskId]);
    assert.equal(reviewNote.count, 2);
  } finally { await ctx.close(); await ctx.teardown(); }
});

test('a co-assignee (non-primary) who is also the team lead can review their task (leadership bypass)', async () => {
  const ctx = await setup();
  try {
    await ctx.pool.execute('INSERT INTO task_assignees(task_id,user_id,is_primary) VALUES (?,?,0)', [ctx.taskId, ctx.leader.id]);

    await ctx.client.login(ctx.member.email, ctx.member.password);
    await ctx.client.request('POST', `/api/tasks/${ctx.taskId}/submit-review`, { body: { link_url: 'https://drive.google.com/file/z' } });

    await ctx.client.login(ctx.leader.email, ctx.leader.password);
    const selfReview = await ctx.client.request('POST', `/api/tasks/${ctx.taskId}/review`, { body: { decision: 'approve' } });
    assert.equal(selfReview.status, 200);
  } finally { await ctx.close(); await ctx.teardown(); }
});
