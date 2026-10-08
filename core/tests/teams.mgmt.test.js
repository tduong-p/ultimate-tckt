'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createTeam, createUser, createActivity, createTask } = require('./helpers/fixtures');

async function withServer(fn) {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    await fn({ pool, client });
  } finally {
    await close();
    await teardown();
  }
}

test('admin can delete an empty team', () => withServer(async ({ pool, client }) => {
  const teamId = await createTeam(pool, { name: 'Tổ Thử Nghiệm Xóa' });
  const admin = await createUser(pool, { role: 'admin' });
  await client.login(admin.email, admin.password);

  const res = await client.request('DELETE', `/api/teams/${teamId}`);
  assert.equal(res.status, 200);
  assert.equal(res.json.ok, true);

  const [rows] = await pool.execute('SELECT is_active FROM teams WHERE id=?', [teamId]);
  assert.equal(rows.length === 0 || rows[0].is_active === 0, true);
}));

test('vice_admin can delete an empty team', () => withServer(async ({ pool, client }) => {
  const teamId = await createTeam(pool, { name: 'Tổ Phó Ban Xóa' });
  const viceAdmin = await createUser(pool, { role: 'vice_admin' });
  await client.login(viceAdmin.email, viceAdmin.password);

  const res = await client.request('DELETE', `/api/teams/${teamId}`);
  assert.equal(res.status, 200);
  assert.equal(res.json.ok, true);
}));

test('cannot delete a team that has active activities', () => withServer(async ({ pool, client }) => {
  const teamId = await createTeam(pool, { name: 'Tổ Có Hoạt Động' });
  const admin = await createUser(pool, { role: 'admin' });
  await createActivity(pool, { team_id: teamId, creator_id: admin.id, status: 'active' });

  await client.login(admin.email, admin.password);
  const res = await client.request('DELETE', `/api/teams/${teamId}`);
  assert.equal(res.status, 400);
  assert.match(res.json.error, /hoạt động|activity/i);
}));

test('cannot delete a team that has uncompleted tasks', () => withServer(async ({ pool, client }) => {
  const teamId = await createTeam(pool, { name: 'Tổ Có Công Việc' });
  const admin = await createUser(pool, { role: 'admin' });
  const actId = await createActivity(pool, { team_id: teamId, creator_id: admin.id, status: 'completed' });
  await createTask(pool, { activity_id: actId, team_id: teamId, status: 'in_progress', assigned_by: admin.id });

  await client.login(admin.email, admin.password);
  const res = await client.request('DELETE', `/api/teams/${teamId}`);
  assert.equal(res.status, 400);
  assert.match(res.json.error, /công việc|task/i);
}));

test('team leader and regular member cannot delete a team', () => withServer(async ({ pool, client }) => {
  const teamId = await createTeam(pool, { name: 'Tổ Không Cho Xóa' });
  const leader = await createUser(pool, { role: 'leader', team_id: teamId });
  const member = await createUser(pool, { role: 'member', team_id: teamId });

  await client.login(leader.email, leader.password);
  const resLeader = await client.request('DELETE', `/api/teams/${teamId}`);
  assert.equal(resLeader.status, 403);

  await client.login(member.email, member.password);
  const resMember = await client.request('DELETE', `/api/teams/${teamId}`);
  assert.equal(resMember.status, 403);
}));

test('team leader can remove a regular member from their team', () => withServer(async ({ pool, client }) => {
  const teamId = await createTeam(pool, { name: 'Tổ Quản Lý Thành Viên' });
  const leader = await createUser(pool, { role: 'leader', team_id: teamId, is_lead: 1 });
  const member = await createUser(pool, { role: 'member', team_id: teamId });

  await client.login(leader.email, leader.password);
  const res = await client.request('DELETE', `/api/teams/${teamId}/members/${member.id}`);
  assert.equal(res.status, 200);
  assert.equal(res.json.ok, true);

  const [inTeam] = await pool.execute('SELECT 1 FROM user_teams WHERE team_id=? AND user_id=?', [teamId, member.id]);
  assert.equal(inTeam.length, 0);
}));

test('team leader cannot remove another leader from the team', () => withServer(async ({ pool, client }) => {
  const teamId = await createTeam(pool, { name: 'Tổ Có 2 Lãnh Đạo' });
  const leader1 = await createUser(pool, { role: 'leader', team_id: teamId, is_lead: 1 });
  const leader2 = await createUser(pool, { role: 'leader', team_id: teamId, is_lead: 1 });

  await client.login(leader1.email, leader1.password);
  const res = await client.request('DELETE', `/api/teams/${teamId}/members/${leader2.id}`);
  assert.equal(res.status, 403);
}));

test('regular member cannot remove anyone from a team', () => withServer(async ({ pool, client }) => {
  const teamId = await createTeam(pool);
  const member1 = await createUser(pool, { role: 'member', team_id: teamId });
  const member2 = await createUser(pool, { role: 'member', team_id: teamId });

  await client.login(member1.email, member1.password);
  const res = await client.request('DELETE', `/api/teams/${teamId}/members/${member2.id}`);
  assert.equal(res.status, 403);
}));

test('removing a leader from their only leadership team reverts role to member and syncs TCKT membership', () => withServer(async ({ pool, client }) => {
  const teamId = await createTeam(pool);
  const admin = await createUser(pool, { role: 'admin' });
  const leader = await createUser(pool, { role: 'leader', team_id: teamId, is_lead: 1 });

  await client.login(admin.email, admin.password);
  const res = await client.request('DELETE', `/api/teams/${teamId}/members/${leader.id}`);
  assert.equal(res.status, 200);

  const [users] = await pool.execute('SELECT role FROM users WHERE id=?', [leader.id]);
  assert.equal(users[0].role, 'member');

  const [memberships] = await pool.execute(
    'SELECT m.role FROM unit_memberships m JOIN org_units o ON o.id = m.unit_id WHERE m.user_id = ? AND o.code = "TCKT"',
    [leader.id]
  );
  assert.equal(memberships[0]?.role, 'member');
}));

test('adding a member as leader via POST /api/teams/:id/members syncs users.role and TCKT membership', () => withServer(async ({ pool, client }) => {
  const teamId = await createTeam(pool);
  const admin = await createUser(pool, { role: 'admin' });
  const user = await createUser(pool, { role: 'member' });

  await client.login(admin.email, admin.password);
  const res = await client.request('POST', `/api/teams/${teamId}/members`, {
    body: { user_id: user.id, team_role: 'leader' }
  });
  assert.equal(res.status, 201);

  const [users] = await pool.execute('SELECT role FROM users WHERE id=?', [user.id]);
  assert.equal(users[0].role, 'leader');

  const [memberships] = await pool.execute(
    'SELECT m.role FROM unit_memberships m JOIN org_units o ON o.id = m.unit_id WHERE m.user_id = ? AND o.code = "TCKT"',
    [user.id]
  );
  assert.equal(memberships[0]?.role, 'leader');
}));

test('promoting member to leader via PATCH /api/teams/:id/members/:userId syncs users.role and TCKT membership', () => withServer(async ({ pool, client }) => {
  const teamId = await createTeam(pool);
  const admin = await createUser(pool, { role: 'admin' });
  const user = await createUser(pool, { role: 'member', team_id: teamId });

  await client.login(admin.email, admin.password);
  const res = await client.request('PATCH', `/api/teams/${teamId}/members/${user.id}`, {
    body: { team_role: 'leader' }
  });
  assert.equal(res.status, 200);

  const [users] = await pool.execute('SELECT role FROM users WHERE id=?', [user.id]);
  assert.equal(users[0].role, 'leader');

  const [memberships] = await pool.execute(
    'SELECT m.role FROM unit_memberships m JOIN org_units o ON o.id = m.unit_id WHERE m.user_id = ? AND o.code = "TCKT"',
    [user.id]
  );
  assert.equal(memberships[0]?.role, 'leader');
}));

test('demoting leader to member via PATCH /api/teams/:id/members/:userId syncs users.role and TCKT membership', () => withServer(async ({ pool, client }) => {
  const teamId = await createTeam(pool);
  const admin = await createUser(pool, { role: 'admin' });
  const leader = await createUser(pool, { role: 'leader', team_id: teamId, is_lead: 1 });

  await client.login(admin.email, admin.password);
  const res = await client.request('PATCH', `/api/teams/${teamId}/members/${leader.id}`, {
    body: { team_role: 'member' }
  });
  assert.equal(res.status, 200);

  const [users] = await pool.execute('SELECT role FROM users WHERE id=?', [leader.id]);
  assert.equal(users[0].role, 'member');

  const [memberships] = await pool.execute(
    'SELECT m.role FROM unit_memberships m JOIN org_units o ON o.id = m.unit_id WHERE m.user_id = ? AND o.code = "TCKT"',
    [leader.id]
  );
  assert.equal(memberships[0]?.role, 'member');
}));

test('deleting a team with a leader reverts role to member and syncs TCKT membership', () => withServer(async ({ pool, client }) => {
  const teamId = await createTeam(pool);
  const admin = await createUser(pool, { role: 'admin' });
  const leader = await createUser(pool, { role: 'leader', team_id: teamId, is_lead: 1 });

  await client.login(admin.email, admin.password);
  const res = await client.request('DELETE', `/api/teams/${teamId}`);
  assert.equal(res.status, 200);

  const [users] = await pool.execute('SELECT role FROM users WHERE id=?', [leader.id]);
  assert.equal(users[0].role, 'member');

  const [memberships] = await pool.execute(
    'SELECT m.role FROM unit_memberships m JOIN org_units o ON o.id = m.unit_id WHERE m.user_id = ? AND o.code = "TCKT"',
    [leader.id]
  );
  assert.equal(memberships[0]?.role, 'member');
}));


// Hồi quy R1: thao tác tổ chỉ cập nhật membership TCKT đã có, không tái sinh membership đã bị chủ động gỡ.
async function tcktMembershipCount(pool, userId) {
  const [rows] = await pool.execute(
    'SELECT COUNT(*) n FROM unit_memberships m JOIN org_units o ON o.id = m.unit_id WHERE m.user_id = ? AND o.code = "TCKT"',
    [userId]
  );
  return rows[0].n;
}

test('PATCH team member does not recreate a removed TCKT membership', () => withServer(async ({ pool, client }) => {
  const teamId = await createTeam(pool);
  const admin = await createUser(pool, { role: 'admin' });
  const removed = await createUser(pool, { role: 'member', team_id: teamId, units: [] });

  await client.login(admin.email, admin.password);
  const res = await client.request('PATCH', `/api/teams/${teamId}/members/${removed.id}`, { body: { team_role: 'leader' } });
  assert.equal(res.status, 200);
  assert.equal(await tcktMembershipCount(pool, removed.id), 0);
}));

test('POST team member does not recreate a removed TCKT membership', () => withServer(async ({ pool, client }) => {
  const teamId = await createTeam(pool);
  const admin = await createUser(pool, { role: 'admin' });
  const removed = await createUser(pool, { role: 'member', units: [] });

  await client.login(admin.email, admin.password);
  const res = await client.request('POST', `/api/teams/${teamId}/members`, { body: { user_id: removed.id, team_role: 'member' } });
  assert.equal(res.status, 201);
  assert.equal(await tcktMembershipCount(pool, removed.id), 0);
}));

test('DELETE team member does not recreate a removed TCKT membership', () => withServer(async ({ pool, client }) => {
  const teamId = await createTeam(pool);
  const admin = await createUser(pool, { role: 'admin' });
  const removed = await createUser(pool, { role: 'member', team_id: teamId, units: [] });

  await client.login(admin.email, admin.password);
  const res = await client.request('DELETE', `/api/teams/${teamId}/members/${removed.id}`);
  assert.equal(res.status, 200);
  assert.equal(await tcktMembershipCount(pool, removed.id), 0);
}));

test('DELETE team does not recreate a removed TCKT membership of its members', () => withServer(async ({ pool, client }) => {
  const teamId = await createTeam(pool);
  const admin = await createUser(pool, { role: 'admin' });
  const removed = await createUser(pool, { role: 'member', team_id: teamId, units: [] });

  await client.login(admin.email, admin.password);
  const res = await client.request('DELETE', `/api/teams/${teamId}`);
  assert.equal(res.status, 200);
  assert.equal(await tcktMembershipCount(pool, removed.id), 0);
}));

test('membership removed through /api/units stays removed after a later team operation', () => withServer(async ({ pool, client }) => {
  const teamId = await createTeam(pool);
  const [[tckt]] = await pool.execute('SELECT id FROM org_units WHERE code="TCKT"');
  const dyc = await createUser(pool, { units: [['DYC', 'dyc_admin']] });
  const admin = await createUser(pool, { role: 'admin' });
  const target = await createUser(pool, { role: 'member', team_id: teamId });

  await client.login(dyc.email, dyc.password);
  const removedRes = await client.request('DELETE', `/api/units/${tckt.id}/members/${target.id}`);
  assert.equal(removedRes.status, 200);
  assert.equal(await tcktMembershipCount(pool, target.id), 0);

  await client.login(admin.email, admin.password);
  const res = await client.request('PATCH', `/api/teams/${teamId}/members/${target.id}`, { body: { team_role: 'vice_leader' } });
  assert.equal(res.status, 200);
  assert.equal(await tcktMembershipCount(pool, target.id), 0);
}));

test('GET /api/teams returns unit teams when user id differs from unit id', () => withServer(async ({ pool, client }) => {
  const teamId = await createTeam(pool, { name: 'Tổ Hiển Thị Phó Ban' });
  const [[tckt]] = await pool.execute("SELECT id FROM org_units WHERE code='TCKT'");
  let viceAdmin;
  do viceAdmin = await createUser(pool, { role: 'vice_admin' }); while (viceAdmin.id === tckt.id);
  await client.login(viceAdmin.email, viceAdmin.password);

  const res = await client.request('GET', '/api/teams');
  assert.equal(res.status, 200);
  assert.ok(res.json.some(t => t.id === teamId), 'vice_admin must see teams of their unit');
}));

test('GET /api/teams marks can_manage for the team the caller leads', () => withServer(async ({ pool, client }) => {
  const teamId = await createTeam(pool, { name: 'Tổ Trưởng Quản Lý' });
  const [[tckt]] = await pool.execute("SELECT id FROM org_units WHERE code='TCKT'");
  let leader;
  do leader = await createUser(pool, { role: 'leader', team_id: teamId }); while (leader.id === tckt.id);
  await client.login(leader.email, leader.password);

  const res = await client.request('GET', '/api/teams');
  assert.equal(res.status, 200);
  assert.equal(Number(res.json.find(t => t.id === teamId)?.can_manage), 1);
}));
