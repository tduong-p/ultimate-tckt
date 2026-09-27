'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createUser, addMembership } = require('./helpers/fixtures');
const { platformAdmin } = require('../src/middleware/auth');

const withEnv = async (value, fn) => {
  const original = process.env.DEVOPS_EMAILS;
  process.env.DEVOPS_EMAILS = value;
  try { await fn(); } finally { if (original === undefined) delete process.env.DEVOPS_EMAILS; else process.env.DEVOPS_EMAILS = original; }
};

test('platformAdmin: any DYC membership passes, anything else is 403', () => {
  const res = () => { const r = {}; r.status = c => { r.statusCode = c; return r; }; r.json = b => { r.body = b; return r; }; return r; };
  let called = false;
  platformAdmin({ memberships: [{ kind: 'platform_owner', role: 'dyc_engineer' }] }, res(), () => { called = true; });
  assert.equal(called, true);
  const r2 = res();
  platformAdmin({ memberships: [{ kind: 'department', role: 'admin' }] }, r2, () => assert.fail('must not pass'));
  assert.equal(r2.statusCode, 403);
});

test('an email in DEVOPS_EMAILS that did not exist at startup becomes dyc_admin on first login', async () => {
  await withEnv('late@example.com', async () => {
    const { pool, teardown } = await createTestDatabase();
    const { client, close } = await startTestServer(pool);
    try {
      const u = await createUser(pool, { email: 'late@example.com', units: [] });
      await client.login(u.email, u.password);
      const s = await client.request('GET', '/api/session');
      assert.equal(s.json.user.is_devops, 1);
      assert.ok(s.json.units.memberships.some(m => m.code === 'DYC' && m.role === 'dyc_admin'));
      assert.equal((await client.request('GET', '/api/admin/email/settings')).status, 200);
    } finally { await close(); await teardown(); }
  });
});

test('users.is_devops no longer grants platform access after the backfill; membership does', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const flagOnly = await createUser(pool, { role: 'admin' });
    await pool.query('UPDATE users SET is_devops=1 WHERE id=?', [flagOnly.id]);
    await client.login(flagOnly.email, flagOnly.password);
    assert.equal((await client.request('GET', '/api/admin/cron/jobs')).status, 403);
    const eng = await createUser(pool, { units: [['DYC', 'dyc_engineer']] });
    await client.login(eng.email, eng.password);
    assert.equal((await client.request('GET', '/api/admin/cron/jobs')).status, 200);
  } finally { await close(); await teardown(); }
});
