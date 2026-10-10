const test = require('node:test');
const assert = require('node:assert/strict');
const { dateInVietnam } = require('../src/date-vn');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createTeam, createUser, createActivity, createTask } = require('./helpers/fixtures');

const daysFromToday = (n) => dateInVietnam(new Date(Date.now() + n * 24 * 60 * 60 * 1000));

async function setup() {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  const teamId = await createTeam(pool);
  const otherTeamId = await createTeam(pool);
  const leader = await createUser(pool, { role: 'leader', team_id: teamId, is_lead: true });
  const member = await createUser(pool, { role: 'member', team_id: teamId });
  const stranger = await createUser(pool, { role: 'member', team_id: otherTeamId });
  const activityId = await createActivity(pool, { team_id: teamId, creator_id: leader.id, status: 'approved' });
  await pool.execute('UPDATE activities SET is_public=0 WHERE id=?', [activityId]);
  const mk = async (overrides, deadline, status) => {
    const id = await createTask(pool, { activity_id: activityId, team_id: teamId, assigned_by: leader.id, ...overrides });
    await pool.execute('UPDATE tasks SET deadline=?,status=COALESCE(?,status) WHERE id=?', [deadline, status || null, id]);
    return id;
  };
  return { pool, client, close, teardown, teamId, otherTeamId, leader, member, stranger, activityId, mk };
}

test('list is scoped: member sees activity tasks, stranger from another team sees none', async () => {
  const ctx = await setup();
  try {
    const t1 = await ctx.mk({ primary_assignee_id: ctx.member.id }, daysFromToday(3));
    await ctx.client.login(ctx.member.email, ctx.member.password);
    const mine = await ctx.client.request('GET', '/api/tasks');
    assert.equal(mine.status, 200);
    assert.deepEqual(mine.json.map((t) => t.id), [t1]);
    const row = mine.json[0];
    for (const key of ['id', 'title', 'status', 'priority', 'deadline', 'team_id', 'team_name', 'activity_id', 'activity_title', 'primary_assignee_id', 'assignee_name', 'acknowledged_at', 'review_feedback']) assert.ok(key in row, key);
    assert.equal(row.activity_title, 'Hoạt động thử nghiệm');
    assert.equal(row.acknowledged_at, null);

    await ctx.client.login(ctx.stranger.email, ctx.stranger.password);
    const none = await ctx.client.request('GET', '/api/tasks');
    assert.equal(none.status, 200);
    assert.deepEqual(none.json, []);
  } finally { await ctx.close(); await ctx.teardown(); }
});

test('mine=1 returns only tasks assigned to the caller and exposes own acknowledgement', async () => {
  const ctx = await setup();
  try {
    const mineId = await ctx.mk({ primary_assignee_id: ctx.member.id }, daysFromToday(2));
    const otherId = await ctx.mk({ primary_assignee_id: ctx.leader.id }, daysFromToday(1));
    await ctx.pool.execute('UPDATE task_assignees SET acknowledged_at=NOW() WHERE task_id=? AND user_id=?', [mineId, ctx.member.id]);
    await ctx.client.login(ctx.member.email, ctx.member.password);
    const all = await ctx.client.request('GET', '/api/tasks');
    assert.deepEqual(all.json.map((t) => t.id), [otherId, mineId]);
    const only = await ctx.client.request('GET', '/api/tasks?mine=1');
    assert.deepEqual(only.json.map((t) => t.id), [mineId]);
    assert.ok(only.json[0].acknowledged_at);
    assert.equal(all.json.find((t) => t.id === otherId).acknowledged_at, null);
  } finally { await ctx.close(); await ctx.teardown(); }
});

test('overdue=1 keeps past-deadline tasks that are not done/cancelled; status/from/to filter', async () => {
  const ctx = await setup();
  try {
    const late = await ctx.mk({ primary_assignee_id: ctx.member.id }, daysFromToday(-3));
    await ctx.mk({ primary_assignee_id: ctx.member.id }, daysFromToday(-3), 'done');
    await ctx.mk({ primary_assignee_id: ctx.member.id }, daysFromToday(-3), 'cancelled');
    const future = await ctx.mk({ primary_assignee_id: ctx.member.id }, daysFromToday(5), 'in_progress');
    await ctx.client.login(ctx.member.email, ctx.member.password);
    const overdue = await ctx.client.request('GET', '/api/tasks?overdue=1');
    assert.deepEqual(overdue.json.map((t) => t.id), [late]);
    const prog = await ctx.client.request('GET', '/api/tasks?status=in_progress');
    assert.deepEqual(prog.json.map((t) => t.id), [future]);
    const range = await ctx.client.request('GET', `/api/tasks?from=${daysFromToday(4)}&to=${daysFromToday(6)}`);
    assert.deepEqual(range.json.map((t) => t.id), [future]);
    const team = await ctx.client.request('GET', `/api/tasks?team_id=${ctx.otherTeamId}`);
    assert.deepEqual(team.json, []);
  } finally { await ctx.close(); await ctx.teardown(); }
});

test('pending_review=1 lists review tasks only to someone who can review them', async () => {
  const ctx = await setup();
  try {
    const inReview = await ctx.mk({ primary_assignee_id: ctx.member.id }, daysFromToday(2), 'review');
    await ctx.mk({ primary_assignee_id: ctx.member.id }, daysFromToday(2));
    await ctx.client.login(ctx.leader.email, ctx.leader.password);
    const lead = await ctx.client.request('GET', '/api/tasks?pending_review=1');
    assert.deepEqual(lead.json.map((t) => t.id), [inReview]);
    await ctx.client.login(ctx.member.email, ctx.member.password);
    const member = await ctx.client.request('GET', '/api/tasks?pending_review=1');
    assert.deepEqual(member.json, []);
  } finally { await ctx.close(); await ctx.teardown(); }
});

test('review_feedback is returned; ordering is by deadline then id', async () => {
  const ctx = await setup();
  try {
    const later = await ctx.mk({ primary_assignee_id: ctx.member.id }, daysFromToday(4));
    const soon = await ctx.mk({ primary_assignee_id: ctx.member.id }, daysFromToday(1));
    await ctx.pool.execute("UPDATE tasks SET review_feedback='Làm lại phần 2' WHERE id=?", [soon]);
    await ctx.client.login(ctx.member.email, ctx.member.password);
    const res = await ctx.client.request('GET', '/api/tasks');
    assert.deepEqual(res.json.map((t) => t.id), [soon, later]);
    assert.equal(res.json[0].review_feedback, 'Làm lại phần 2');
  } finally { await ctx.close(); await ctx.teardown(); }
});

test('invalid filters return 400; outsider unit gets 403', async () => {
  const ctx = await setup();
  try {
    await ctx.client.login(ctx.member.email, ctx.member.password);
    for (const qs of ['status=bogus', 'from=2026-1-1', 'to=hôm-nay', 'team_id=abc']) {
      const res = await ctx.client.request('GET', `/api/tasks?${encodeURI(qs)}`);
      assert.equal(res.status, 400, qs);
    }
    const outsider = await createUser(ctx.pool, { role: 'member', units: [['VPD', 'officer']] });
    await ctx.client.login(outsider.email, outsider.password);
    const res = await ctx.client.request('GET', '/api/tasks');
    assert.equal(res.status, 403);
  } finally { await ctx.close(); await ctx.teardown(); }
});
