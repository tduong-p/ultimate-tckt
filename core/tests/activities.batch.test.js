const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createTeam, createUser, createActivity } = require('./helpers/fixtures');

async function setup() {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  const teamId = await createTeam(pool);
  const otherTeamId = await createTeam(pool);
  const admin = await createUser(pool, { role: 'admin' });
  const lead = await createUser(pool, { role: 'member', team_id: teamId });
  const leader = await createUser(pool, { role: 'leader', team_id: teamId, is_lead: true });
  const activityId = await createActivity(pool, { team_id: teamId, creator_id: admin.id, event_lead_id: lead.id, status: 'approved' });
  return { pool, client, close, teardown, teamId, otherTeamId, admin, lead, leader, activityId };
}
const batch = (ctx, body, id) => ctx.client.request('PATCH', `/api/activities/${id || ctx.activityId}/batch`, { body });
const row = async (ctx) => (await ctx.pool.query('SELECT * FROM activities WHERE id=?', [ctx.activityId]))[0][0];
const run = (name, fn) => test(name, async () => {
  const ctx = await setup();
  try { await fn(ctx); } finally { await ctx.close(); await ctx.teardown(); }
});

run('event_lead edits title (200) but not team_id (403, nothing saved)', async (ctx) => {
  await ctx.client.login(ctx.lead.email, ctx.lead.password);
  const ok = await batch(ctx, { changes: { title: 'Tên mới', description: 'Mô tả mới' }, base: {} });
  assert.equal(ok.status, 200);
  assert.deepEqual(ok.json.changed, ['title', 'description']);
  const bad = await batch(ctx, { changes: { title: 'Tên khác', team_id: ctx.otherTeamId }, base: {} });
  assert.equal(bad.status, 403);
  assert.deepEqual(bad.json.forbidden, ['team_id']);
  const a = await row(ctx);
  assert.equal(a.title, 'Tên mới');
  assert.equal(a.team_id, ctx.teamId);
});

run('event_lead cannot edit deadline, start_date, priority, event_lead_id', async (ctx) => {
  await ctx.client.login(ctx.lead.email, ctx.lead.password);
  const res = await batch(ctx, { changes: { deadline: '2030-01-01', start_date: '2030-01-01', priority: 'high', event_lead_id: ctx.leader.id }, base: {} });
  assert.equal(res.status, 403);
  assert.deepEqual(res.json.forbidden, ['deadline', 'start_date', 'priority', 'event_lead_id']);
});

run('admin changes event_lead_id and heavy fields', async (ctx) => {
  await ctx.client.login(ctx.admin.email, ctx.admin.password);
  const res = await batch(ctx, { changes: { event_lead_id: ctx.leader.id, priority: 'urgent', deadline: '2030-05-06', start_date: '2030-05-01' }, base: { event_lead_id: ctx.lead.id } });
  assert.equal(res.status, 200);
  assert.deepEqual(res.json.changed.sort(), ['deadline', 'event_lead_id', 'priority', 'start_date']);
  const [[a]] = await ctx.pool.query("SELECT event_lead_id,priority,DATE_FORMAT(deadline,'%Y-%m-%d') d FROM activities WHERE id=?", [ctx.activityId]);
  assert.equal(a.event_lead_id, ctx.leader.id);
  assert.equal(a.priority, 'urgent');
  assert.equal(a.d, '2030-05-06');
});

run('admin edits an activity of any team and moving team_id syncs activity_teams', async (ctx) => {
  await ctx.client.login(ctx.admin.email, ctx.admin.password);
  const res = await batch(ctx, { changes: { team_id: ctx.otherTeamId }, base: { team_id: ctx.teamId } });
  assert.equal(res.status, 200);
  const [teams] = await ctx.pool.query('SELECT team_id,role FROM activity_teams WHERE activity_id=? ORDER BY team_id', [ctx.activityId]);
  const primary = teams.filter((t) => t.role === 'primary');
  assert.equal(primary.length, 1);
  assert.equal(primary[0].team_id, ctx.otherTeamId);
});

run('leader who is not event_lead gets 403', async (ctx) => {
  await ctx.client.login(ctx.leader.email, ctx.leader.password);
  const res = await batch(ctx, { changes: { title: 'X' }, base: {} });
  assert.equal(res.status, 403);
  assert.deepEqual(res.json.forbidden, ['title']);
});

run('stale base returns 409 and writes nothing', async (ctx) => {
  await ctx.client.login(ctx.admin.email, ctx.admin.password);
  const res = await batch(ctx, { changes: { title: 'X' }, base: { title: 'không khớp' } });
  assert.equal(res.status, 409);
  assert.deepEqual(res.json.conflicts, ['title']);
  assert.notEqual((await row(ctx)).title, 'X');
});

run('no-op batch (including empty changes and unchanged date) is 200 with empty changed', async (ctx) => {
  await ctx.client.login(ctx.admin.email, ctx.admin.password);
  const [[a]] = await ctx.pool.query("SELECT title,DATE_FORMAT(deadline,'%Y-%m-%d') d FROM activities WHERE id=?", [ctx.activityId]);
  const res = await batch(ctx, { changes: { title: a.title, deadline: a.d }, base: { title: a.title, deadline: a.d } });
  assert.equal(res.status, 200);
  assert.deepEqual(res.json.changed, []);
  const empty = await batch(ctx, { changes: {}, base: {} });
  assert.equal(empty.status, 200);
  assert.deepEqual(empty.json.changed, []);
});

run('validation: bad priority, empty title, empty deadline, bad date, unknown field are 400', async (ctx) => {
  await ctx.client.login(ctx.admin.email, ctx.admin.password);
  for (const changes of [{ priority: 'nope' }, { title: '  ' }, { deadline: '' }, { start_date: '2030-02-31' }, { team_id: null }]) {
    assert.equal((await batch(ctx, { changes, base: {} })).status, 400, JSON.stringify(changes));
  }
  const unknown = await batch(ctx, { changes: { status: 'completed' }, base: {} });
  assert.equal(unknown.status, 400);
  assert.deepEqual(unknown.json.fields, ['status']);
  assert.equal((await batch(ctx, { base: {} })).status, 400);
});

run('unknown team or inactive/unknown event lead is 400; event_lead_id null clears it', async (ctx) => {
  await ctx.client.login(ctx.admin.email, ctx.admin.password);
  assert.equal((await batch(ctx, { changes: { team_id: 99999999 }, base: {} })).status, 400);
  assert.equal((await batch(ctx, { changes: { event_lead_id: 99999999 }, base: {} })).status, 400);
  const off = await createUser(ctx.pool, { role: 'member' });
  await ctx.pool.execute('UPDATE users SET is_active=0 WHERE id=?', [off.id]);
  assert.equal((await batch(ctx, { changes: { event_lead_id: off.id }, base: {} })).status, 400);
  const clear = await batch(ctx, { changes: { event_lead_id: null }, base: {} });
  assert.equal(clear.status, 200);
  assert.equal((await row(ctx)).event_lead_id, null);
});

run('missing activity is 404', async (ctx) => {
  await ctx.client.login(ctx.admin.email, ctx.admin.password);
  assert.equal((await batch(ctx, { changes: { title: 'X' }, base: {} }, 99999999)).status, 404);
});

run('activity invisible to the caller is 404, matching GET', async (ctx) => {
  const outsider = await createUser(ctx.pool, { role: 'member', team_id: ctx.otherTeamId });
  await ctx.client.login(outsider.email, outsider.password);
  const get = await ctx.client.request('GET', `/api/activities/${ctx.activityId}`);
  const res = await batch(ctx, { changes: { title: 'X' }, base: {} });
  assert.equal(get.status, 404);
  assert.equal(res.status, 404);
});

test('GET /api/activities/:id reports editable fields per caller', async () => {
  const ctx = await setup();
  try {
    await ctx.client.login(ctx.lead.email, ctx.lead.password);
    const asLead = await ctx.client.request('GET', `/api/activities/${ctx.activityId}`);
    assert.deepEqual(asLead.json.editable, ['title', 'description']);
    await ctx.client.login(ctx.admin.email, ctx.admin.password);
    const asAdmin = await ctx.client.request('GET', `/api/activities/${ctx.activityId}`);
    assert.ok(asAdmin.json.editable.includes('deadline'));
  } finally { await ctx.close(); await ctx.teardown(); }
});
