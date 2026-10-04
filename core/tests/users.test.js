const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createTeam, createUser } = require('./helpers/fixtures');

async function withServer(fn) {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try { await fn({ pool, client }); } finally { await close(); await teardown(); }
}

test('admin can create a local account with a password', () => withServer(async ({ pool, client }) => {
  const teamId = await createTeam(pool);
  const admin = await createUser(pool, { role: 'admin' });
  await client.login(admin.email, admin.password);
  const result = await client.request('POST', '/api/users', {
    body: { name: 'Thành viên A', email: 'a@example.com', password: 'MatKhau123!', role: 'member', team_ids: [teamId] }
  });
  assert.equal(result.status, 201);
  const [rows] = await pool.execute('SELECT auth_provider FROM users WHERE id=?', [result.json.id]);
  assert.equal(rows[0].auth_provider, 'local');
}));

test('admin can pre-provision an SSO-only account without a password', () => withServer(async ({ pool, client }) => {
  const teamId = await createTeam(pool);
  const admin = await createUser(pool, { role: 'admin' });
  await client.login(admin.email, admin.password);
  const result = await client.request('POST', '/api/users', {
    body: { name: 'Thành viên B', email: 'b@hust.edu.vn', auth_provider: 'microsoft', role: 'member', team_ids: [teamId] }
  });
  assert.equal(result.status, 201);
  const [rows] = await pool.execute('SELECT auth_provider FROM users WHERE id=?', [result.json.id]);
  assert.equal(rows[0].auth_provider, 'microsoft');
}));

test('bulk import creates multiple SSO stub accounts and skips existing emails', () => withServer(async ({ pool, client }) => {
  const teamId = await createTeam(pool);
  const admin = await createUser(pool, { role: 'admin' });
  const existing = await createUser(pool, { role: 'member', team_id: teamId, email: 'existing@hust.edu.vn' });
  await client.login(admin.email, admin.password);
  const result = await client.request('POST', '/api/users/bulk-import', {
    body: { rows: [
      { name: 'C', email: existing.email, team_ids: [teamId] },
      { name: 'D', email: 'd@hust.edu.vn', team_ids: [teamId] }
    ] }
  });
  assert.equal(result.status, 200);
  assert.equal(result.json.created, 1);
  assert.equal(result.json.skipped, 1);
}));

test('GET /api/people returns user list with auth_provider and can_manage flags', () => withServer(async ({ pool, client }) => {
  const teamId = await createTeam(pool);
  const admin = await createUser(pool, { role: 'admin' });
  const member = await createUser(pool, { role: 'member', team_id: teamId });
  await client.login(admin.email, admin.password);
  const result = await client.request('GET', '/api/people');
  assert.equal(result.status, 200);
  assert(Array.isArray(result.json));
  const found = result.json.find(u => u.id === member.id);
  assert(found);
  assert.equal(found.auth_provider, 'local');
  assert.equal(found.can_manage, true);
}));

test('admin can update user and delete/deactivate user', () => withServer(async ({ pool, client }) => {
  const teamId = await createTeam(pool);
  const admin = await createUser(pool, { role: 'admin' });
  const member = await createUser(pool, { role: 'member', team_id: teamId });
  await client.login(admin.email, admin.password);
  
  const updateRes = await client.request('PATCH', `/api/users/${member.id}`, {
    body: { name: 'Updated Name', email: 'updated@example.com', role: 'member', team_ids: [teamId], avatar_color: '#1E3A8A' }
  });
  assert.equal(updateRes.status, 200);

  const deleteRes = await client.request('DELETE', `/api/users/${member.id}`);
  assert.equal(deleteRes.status, 200);
}));

test('admin creating or editing a user with an undeliverable email gets 400', () => withServer(async ({ pool, client }) => {
  const teamId = await createTeam(pool);
  const admin = await createUser(pool, { role: 'admin' });
  const member = await createUser(pool, { role: 'member', team_id: teamId });
  await client.login(admin.email, admin.password);

  const createRes = await client.request('POST', '/api/users', {
    body: { name: 'Email giả', email: 'x@tckt.local', password: 'MatKhau123!', role: 'member', team_ids: [teamId] }
  });
  assert.equal(createRes.status, 400);
  assert.deepEqual(createRes.json, { error: 'Email không hợp lệ.' });

  const patchRes = await client.request('PATCH', `/api/users/${member.id}`, {
    body: { name: 'Tên mới', email: 'bad@', role: 'member', team_ids: [teamId], avatar_color: '#1E3A8A' }
  });
  assert.equal(patchRes.status, 400);
  assert.deepEqual(patchRes.json, { error: 'Email không hợp lệ.' });
  const [rows] = await pool.execute('SELECT email FROM users WHERE id=?', [member.id]);
  assert.equal(rows[0].email, member.email.toLowerCase());
}));

test('editing a user whose stored email is on a reserved domain succeeds when the email is unchanged', () => withServer(async ({ pool, client }) => {
  const teamId = await createTeam(pool);
  const admin = await createUser(pool, { role: 'admin' });
  const legacy = await createUser(pool, { role: 'member', team_id: teamId });
  await pool.execute('UPDATE users SET email=? WHERE id=?', ['legacy@tckt.local', legacy.id]);
  await client.login(admin.email, admin.password);

  const res = await client.request('PATCH', `/api/users/${legacy.id}`, {
    body: { name: 'Tên mới', role: 'member', team_ids: [teamId], avatar_color: '#1E3A8A' }
  });
  assert.equal(res.status, 200);
  const [rows] = await pool.execute('SELECT name,email FROM users WHERE id=?', [legacy.id]);
  assert.equal(rows[0].name, 'Tên mới');
  assert.equal(rows[0].email, 'legacy@tckt.local');
}));
