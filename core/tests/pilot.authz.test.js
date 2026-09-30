'use strict';
// SPEC-PILOT-001 — lỗi phân quyền c3, c5, c6, c10, c19, c21, c23, c24.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createTeam, createUser, createActivity, createTask } = require('./helpers/fixtures');

async function withServer(fn) {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try { await fn({ pool, client }); } finally { await close(); await teardown(); }
}

// c3 — event lead là member phải thêm được task và người tham gia
test('c3: event lead (member) can add a task to the activity', () => withServer(async ({ pool, client }) => {
  const teamId = await createTeam(pool);
  const admin = await createUser(pool, { role: 'admin' });
  const lead = await createUser(pool, { role: 'member', team_id: teamId });
  const worker = await createUser(pool, { role: 'member', team_id: teamId });
  const activityId = await createActivity(pool, { team_id: teamId, creator_id: admin.id, event_lead_id: lead.id, status: 'approved' });
  await client.login(lead.email, lead.password);
  const result = await client.request('POST', `/api/activities/${activityId}/tasks`, {
    body: { title: 'Chuẩn bị âm thanh', team_id: teamId, deadline: '2030-01-01', primary_assignee_id: worker.id }
  });
  assert.equal(result.status, 201, JSON.stringify(result.json));
}));

test('c3: event lead (member) can add participants from the activity teams', () => withServer(async ({ pool, client }) => {
  const teamId = await createTeam(pool);
  const admin = await createUser(pool, { role: 'admin' });
  const lead = await createUser(pool, { role: 'member', team_id: teamId });
  const worker = await createUser(pool, { role: 'member', team_id: teamId });
  const activityId = await createActivity(pool, { team_id: teamId, creator_id: admin.id, event_lead_id: lead.id, status: 'approved' });
  await client.login(lead.email, lead.password);
  const result = await client.request('POST', `/api/activities/${activityId}/participants`, { body: { user_ids: [worker.id] } });
  assert.equal(result.status, 201, JSON.stringify(result.json));
}));

test('c3: event lead cannot give a task to a team outside the activity', () => withServer(async ({ pool, client }) => {
  const teamId = await createTeam(pool);
  const otherTeamId = await createTeam(pool);
  const admin = await createUser(pool, { role: 'admin' });
  const lead = await createUser(pool, { role: 'member', team_id: teamId });
  const stranger = await createUser(pool, { role: 'member', team_id: otherTeamId });
  const activityId = await createActivity(pool, { team_id: teamId, creator_id: admin.id, event_lead_id: lead.id, status: 'approved' });
  await client.login(lead.email, lead.password);
  const result = await client.request('POST', `/api/activities/${activityId}/tasks`, {
    body: { title: 'Ngoài phạm vi', team_id: otherTeamId, deadline: '2030-01-01', primary_assignee_id: stranger.id }
  });
  assert.equal(result.status, 403);
}));

// c19 — event lead / người tạo / người tham gia mở được hoạt động dù không thuộc team nào của nó
test('c19: event lead, creator and participant outside the activity teams can open it', () => withServer(async ({ pool, client }) => {
  const teamId = await createTeam(pool);
  const outsideTeamId = await createTeam(pool);
  const admin = await createUser(pool, { role: 'admin' });
  const lead = await createUser(pool, { role: 'member', team_id: outsideTeamId });
  const creator = await createUser(pool, { role: 'member', team_id: outsideTeamId });
  const guest = await createUser(pool, { role: 'member', team_id: outsideTeamId });
  const bystander = await createUser(pool, { role: 'member', team_id: outsideTeamId });
  const activityId = await createActivity(pool, { team_id: teamId, creator_id: creator.id, event_lead_id: lead.id, status: 'approved' });
  await pool.execute("INSERT INTO participants(activity_id,user_id,state) VALUES (?,?,'confirmed')", [activityId, guest.id]);
  for (const person of [lead, creator, guest]) {
    await client.login(person.email, person.password);
    const result = await client.request('GET', `/api/activities/${activityId}`);
    assert.equal(result.status, 200, `user ${person.id}`);
  }
  await client.login(bystander.email, bystander.password);
  assert.equal((await client.request('GET', `/api/activities/${activityId}`)).status, 404);
  void admin;
}));

// c24 — "Tình nguyện" không hạ người đã confirmed
test('c24: volunteering does not downgrade a confirmed participant', () => withServer(async ({ pool, client }) => {
  const teamId = await createTeam(pool);
  const admin = await createUser(pool, { role: 'admin' });
  const member = await createUser(pool, { role: 'member', team_id: teamId });
  const activityId = await createActivity(pool, { team_id: teamId, creator_id: admin.id, status: 'approved' });
  await pool.execute("INSERT INTO participants(activity_id,user_id,state) VALUES (?,?,'confirmed')", [activityId, member.id]);
  await client.login(member.email, member.password);
  const result = await client.request('POST', `/api/activities/${activityId}/volunteer`, { body: {} });
  assert.equal(result.status, 200);
  const [rows] = await pool.execute('SELECT state FROM participants WHERE activity_id=? AND user_id=?', [activityId, member.id]);
  assert.equal(rows[0].state, 'confirmed');
}));

// c5 — admin sửa tài khoản không được ghi lại cờ trưởng/phó sai
test('c5: admin editing a user keeps team lead flags per team', () => withServer(async ({ pool, client }) => {
  const teamA = await createTeam(pool);
  const teamB = await createTeam(pool);
  const admin = await createUser(pool, { role: 'admin' });
  const leader = await createUser(pool, { role: 'leader', team_id: teamA, is_lead: true });
  await pool.execute('INSERT INTO user_teams(user_id,team_id,is_lead,is_vice_lead) VALUES (?,?,0,0)', [leader.id, teamB]);
  await client.login(admin.email, admin.password);
  const result = await client.request('PATCH', `/api/users/${leader.id}`, {
    body: { name: 'Tên mới', role: 'leader', team_ids: [teamA, teamB] }
  });
  assert.equal(result.status, 200, JSON.stringify(result.json));
  const [rows] = await pool.execute('SELECT team_id,is_lead,is_vice_lead FROM user_teams WHERE user_id=? ORDER BY team_id', [leader.id]);
  assert.deepEqual(rows.map(r => [r.team_id, Number(r.is_lead), Number(r.is_vice_lead)]), [[teamA, 1, 0], [teamB, 0, 0]]);
}));

// c6 — return sớm không được để transaction mở trên connection trả về pool
test('c6: a rejected password change leaves no open transaction on the connection', () => withServer(async ({ pool, client }) => {
  const teamId = await createTeam(pool);
  const admin = await createUser(pool, { role: 'admin' });
  const member = await createUser(pool, { role: 'member', team_id: teamId });
  const open = new Set();
  const original = pool.getConnection.bind(pool);
  pool.getConnection = async (...args) => {
    const conn = await original(...args);
    const begin = conn.beginTransaction.bind(conn), commit = conn.commit.bind(conn), rollback = conn.rollback.bind(conn);
    conn.beginTransaction = async () => { open.add(conn); return begin(); };
    conn.commit = async () => { open.delete(conn); return commit(); };
    conn.rollback = async () => { open.delete(conn); return rollback(); };
    return conn;
  };
  try {
    await client.login(admin.email, admin.password);
    const result = await client.request('PATCH', `/api/users/${member.id}`, { body: { name: 'X', team_ids: [teamId], password: 'ngan' } });
    assert.equal(result.status, 400);
    assert.equal(open.size, 0, 'transaction still open after early return');
  } finally { pool.getConnection = original; }
}));

// c10 — chỉ người liên quan tới task mới đính kèm được
test('c10: only people who can touch the task may attach to it', () => withServer(async ({ pool, client }) => {
  const teamId = await createTeam(pool);
  const admin = await createUser(pool, { role: 'admin' });
  const assignee = await createUser(pool, { role: 'member', team_id: teamId });
  const other = await createUser(pool, { role: 'member', team_id: teamId });
  const activityId = await createActivity(pool, { team_id: teamId, creator_id: admin.id, status: 'approved' });
  const taskId = await createTask(pool, { activity_id: activityId, team_id: teamId, primary_assignee_id: assignee.id, assigned_by: admin.id });
  const body = { kind: 'clarification', label: 'Tài liệu', link_url: 'https://example.com/tai-lieu' };
  await client.login(other.email, other.password);
  assert.equal((await client.request('POST', `/api/tasks/${taskId}/attachments`, { body })).status, 403);
  await client.login(assignee.email, assignee.password);
  assert.equal((await client.request('POST', `/api/tasks/${taskId}/attachments`, { body })).status, 201);
}));

// c21 — trưởng team không chiếm được tài khoản người khác
test('c21: a team leader cannot change password or email of a member', () => withServer(async ({ pool, client }) => {
  const teamId = await createTeam(pool);
  const leader = await createUser(pool, { role: 'leader', team_id: teamId, is_lead: true });
  const member = await createUser(pool, { role: 'member', team_id: teamId });
  await client.login(leader.email, leader.password);
  const byPassword = await client.request('PATCH', `/api/users/${member.id}`, { body: { name: 'A', team_ids: [teamId], password: 'MatKhauMoi2026!' } });
  assert.equal(byPassword.status, 403);
  const byEmail = await client.request('PATCH', `/api/users/${member.id}`, { body: { name: 'A', team_ids: [teamId], email: 'chiem@example.com' } });
  assert.equal(byEmail.status, 403);
  const [rows] = await pool.execute('SELECT email FROM users WHERE id=?', [member.id]);
  assert.equal(rows[0].email, member.email);
}));

test('c21: a team leader can still edit the name of a member of their own team', () => withServer(async ({ pool, client }) => {
  const teamId = await createTeam(pool);
  const leader = await createUser(pool, { role: 'leader', team_id: teamId, is_lead: true });
  const member = await createUser(pool, { role: 'member', team_id: teamId });
  await client.login(leader.email, leader.password);
  const result = await client.request('PATCH', `/api/users/${member.id}`, { body: { name: 'Tên đã sửa', email: member.email, team_ids: [teamId] } });
  assert.equal(result.status, 200, JSON.stringify(result.json));
}));

test('c21: adding an outside member to a team does not let the leader take over that account', () => withServer(async ({ pool, client }) => {
  const teamId = await createTeam(pool);
  const otherTeamId = await createTeam(pool);
  const leader = await createUser(pool, { role: 'leader', team_id: teamId, is_lead: true });
  const victim = await createUser(pool, { role: 'member', team_id: otherTeamId });
  await client.login(leader.email, leader.password);
  const added = await client.request('POST', `/api/teams/${teamId}/members`, { body: { user_id: victim.id } });
  assert.equal(added.status, 201);
  const takeover = await client.request('PATCH', `/api/users/${victim.id}`, { body: { name: 'V', team_ids: [teamId], password: 'MatKhauMoi2026!' } });
  assert.equal(takeover.status, 403);
  const lock = await client.request('PATCH', `/api/users/${victim.id}`, { body: { name: 'V', team_ids: [teamId], is_active: false } });
  assert.equal(lock.status, 403);
}));

// c23 — bài cập nhật hoạt động
async function updateFixture(pool) {
  const teamId = await createTeam(pool);
  const admin = await createUser(pool, { role: 'admin' });
  const member = await createUser(pool, { role: 'member', team_id: teamId });
  const activityId = await createActivity(pool, { team_id: teamId, creator_id: admin.id, status: 'approved' });
  const otherActivityId = await createActivity(pool, { team_id: teamId, creator_id: admin.id, status: 'approved' });
  const otherTaskId = await createTask(pool, { activity_id: otherActivityId, team_id: teamId, primary_assignee_id: member.id, assigned_by: admin.id });
  return { teamId, admin, member, activityId, otherTaskId };
}

test('c23: a member cannot post a review_note update but can still post evidence and comments', () => withServer(async ({ pool, client }) => {
  const { member, activityId } = await updateFixture(pool);
  await client.login(member.email, member.password);
  const forged = await client.request('POST', `/api/activities/${activityId}/updates`, { body: { body: 'Giả mạo', kind: 'review_note' } });
  assert.equal(forged.status, 403);
  for (const kind of ['comment', 'evidence']) {
    const ok = await client.request('POST', `/api/activities/${activityId}/updates`, { body: { body: 'Nội dung', kind } });
    assert.equal(ok.status, 201, kind);
  }
}));

test('c23: an unknown update kind is a 400, not a 500', () => withServer(async ({ pool, client }) => {
  const { member, activityId } = await updateFixture(pool);
  await client.login(member.email, member.password);
  const result = await client.request('POST', `/api/activities/${activityId}/updates`, { body: { body: 'x', kind: 'khong-co' } });
  assert.equal(result.status, 400);
}));

test('c23: an update cannot point at a task of another activity', () => withServer(async ({ pool, client }) => {
  const { member, activityId, otherTaskId } = await updateFixture(pool);
  await client.login(member.email, member.password);
  const result = await client.request('POST', `/api/activities/${activityId}/updates`, { body: { body: 'x', task_id: otherTaskId } });
  assert.equal(result.status, 400);
}));

test('c23: attachment_url must be http(s)', () => withServer(async ({ pool, client }) => {
  const { member, activityId } = await updateFixture(pool);
  await client.login(member.email, member.password);
  const bad = await client.request('POST', `/api/activities/${activityId}/updates`, { body: { body: 'x', attachment_url: 'javascript:alert(1)' } });
  assert.equal(bad.status, 400);
  const good = await client.request('POST', `/api/activities/${activityId}/updates`, { body: { body: 'x', attachment_url: 'https://example.com/a' } });
  assert.equal(good.status, 201);
}));
