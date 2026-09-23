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

test('removing a leader from their only leadership team reverts role to member', () => withServer(async ({ pool, client }) => {
  const teamId = await createTeam(pool);
  const admin = await createUser(pool, { role: 'admin' });
  const leader = await createUser(pool, { role: 'leader', team_id: teamId, is_lead: 1 });

  await client.login(admin.email, admin.password);
  const res = await client.request('DELETE', `/api/teams/${teamId}/members/${leader.id}`);
  assert.equal(res.status, 200);

  const [users] = await pool.execute('SELECT role FROM users WHERE id=?', [leader.id]);
  assert.equal(users[0].role, 'member');
}));
