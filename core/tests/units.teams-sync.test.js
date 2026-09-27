'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createUser, createTeam } = require('./helpers/fixtures');

const tcktRole = async (pool, email) => {
  const [[row]] = await pool.query(
    "SELECT m.role FROM unit_memberships m JOIN users u ON u.id=m.user_id JOIN org_units o ON o.id=m.unit_id AND o.code='TCKT' WHERE u.email=?",
    [email]
  );
  return row?.role;
};

test('promoting a member to team leader via the teams API syncs their TCKT membership and grants manager access', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const teamId = await createTeam(pool);
    const boss = await createUser(pool, { role: 'admin' });
    const member = await createUser(pool, { role: 'member', team_id: teamId });

    assert.equal(await tcktRole(pool, member.email), 'member');

    await client.login(boss.email, boss.password);
    const promoted = await client.request('PATCH', `/api/teams/${teamId}/members/${member.id}`, { body: { team_role: 'leader' } });
    assert.equal(promoted.status, 200);
    assert.equal(promoted.json.role, 'leader');

    // The write went through teams.js, not users.js — the TCKT membership must still follow it.
    assert.equal(await tcktRole(pool, member.email), 'leader');

    // req.actor.role is now derived from unit_memberships (Task 4), so the promoted member must
    // pass the `manager` middleware without needing anything from users.js.
    await client.login(member.email, member.password);
    const created = await client.request('POST', '/api/users', {
      body: { name: 'Người mới', email: 'nguoimoi@example.com', password: 'MatKhauTest2026!', role: 'member', team_ids: [teamId] }
    });
    assert.equal(created.status, 201);
  } finally { await close(); await teardown(); }
});
