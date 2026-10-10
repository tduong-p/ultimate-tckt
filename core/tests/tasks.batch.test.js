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
  const third = await createUser(pool, { role: 'member', team_id: teamId });
  const activityId = await createActivity(pool, { team_id: teamId, creator_id: leader.id, status: 'approved' });
  const taskId = await createTask(pool, { activity_id: activityId, team_id: teamId, primary_assignee_id: member.id, assigned_by: leader.id, ...overrides });
  return { pool, client, close, teardown, teamId, leader, member, third, activityId, taskId };
}
const batch = (ctx, body) => ctx.client.request('PATCH', `/api/tasks/${ctx.taskId}/batch`, { body });

test('assignee may edit title/description but not deadline; batch is all-or-nothing', async () => {
  const ctx = await setup();
  try {
    await ctx.client.login(ctx.member.email, ctx.member.password);
    const ok = await batch(ctx, { changes: { title: 'Tên mới' }, base: {} });
    assert.equal(ok.status, 200);
    const bad = await batch(ctx, { changes: { title: 'Tên khác', deadline: '2030-01-01' }, base: {} });
    assert.equal(bad.status, 403);
    assert.deepEqual(bad.json.forbidden, ['deadline']);
    const [[t]] = await ctx.pool.query('SELECT title FROM tasks WHERE id=?', [ctx.taskId]);
    assert.equal(t.title, 'Tên mới');
  } finally { await ctx.close(); await ctx.teardown(); }
});

test('stale base returns 409 and writes nothing', async () => {
  const ctx = await setup();
  try {
    await ctx.client.login(ctx.leader.email, ctx.leader.password);
    const res = await batch(ctx, { changes: { title: 'X' }, base: { title: 'không khớp' } });
    assert.equal(res.status, 409);
    assert.deepEqual(res.json.conflicts, ['title']);
    const [[t]] = await ctx.pool.query('SELECT title FROM tasks WHERE id=?', [ctx.taskId]);
    assert.notEqual(t.title, 'X');
  } finally { await ctx.close(); await ctx.teardown(); }
});

test('no-op batch is 200 and reports nothing changed', async () => {
  const ctx = await setup();
  try {
    await ctx.client.login(ctx.leader.email, ctx.leader.password);
    const [[t]] = await ctx.pool.query('SELECT title FROM tasks WHERE id=?', [ctx.taskId]);
    const res = await batch(ctx, { changes: { title: t.title }, base: { title: t.title } });
    assert.equal(res.status, 200);
    assert.deepEqual(res.json.changed, []);
  } finally { await ctx.close(); await ctx.teardown(); }
});

test('priority outside enum is 400; empty title is 400; empty deadline is 400', async () => {
  const ctx = await setup();
  try {
    await ctx.client.login(ctx.leader.email, ctx.leader.password);
    assert.equal((await batch(ctx, { changes: { priority: 'x' }, base: {} })).status, 400);
    assert.equal((await batch(ctx, { changes: { title: '  ' }, base: {} })).status, 400);
    assert.equal((await batch(ctx, { changes: { deadline: '' }, base: {} })).status, 400);
  } finally { await ctx.close(); await ctx.teardown(); }
});

test('leader changes deadline, priority and co-assignees in one batch', async () => {
  const ctx = await setup();
  try {
    await ctx.client.login(ctx.leader.email, ctx.leader.password);
    const res = await batch(ctx, { changes: { deadline: '2030-01-05', priority: 'high', co_assignee_ids: [ctx.third.id] }, base: {} });
    assert.equal(res.status, 200);
    assert.deepEqual([...res.json.changed].sort(), ['co_assignee_ids', 'deadline', 'priority']);
    const [[t]] = await ctx.pool.query("SELECT priority,DATE_FORMAT(deadline,'%Y-%m-%d') deadline FROM tasks WHERE id=?", [ctx.taskId]);
    assert.equal(t.priority, 'high');
    assert.equal(t.deadline, '2030-01-05');
    const [co] = await ctx.pool.query('SELECT user_id FROM task_assignees WHERE task_id=? AND is_primary=0', [ctx.taskId]);
    assert.deepEqual(co.map((r) => r.user_id), [ctx.third.id]);
  } finally { await ctx.close(); await ctx.teardown(); }
});

test('a member who is not assigned gets 403, not 404, when the task is visible; unknown field is 400', async () => {
  const ctx = await setup();
  try {
    await ctx.client.login(ctx.third.email, ctx.third.password);
    assert.equal((await batch(ctx, { changes: { title: 'Z' }, base: {} })).status, 403);
    await ctx.client.login(ctx.leader.email, ctx.leader.password);
    assert.equal((await batch(ctx, { changes: { status: 'done' }, base: {} })).status, 400);
  } finally { await ctx.close(); await ctx.teardown(); }
});
