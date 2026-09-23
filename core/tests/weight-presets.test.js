'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createTeam, createUser } = require('./helpers/fixtures');

test('GET /api/weight-presets returns active presets for authenticated user', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const teamId = await createTeam(pool);
    const member = await createUser(pool, { role: 'member', team_id: teamId });
    await client.login(member.email, member.password);

    const res = await client.request('GET', '/api/weight-presets');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.json));
    // Default seeded presets: 0, 1, 2, 3, 5
    assert.ok(res.json.length >= 5);
    const pointsList = res.json.map(p => p.points);
    assert.ok(pointsList.includes(0));
    assert.ok(pointsList.includes(1));
    assert.ok(pointsList.includes(2));
    assert.ok(pointsList.includes(3));
    assert.ok(pointsList.includes(5));
  } finally {
    await close();
    await teardown();
  }
});

test('executive can create, update, and delete weight presets; validates points 0-10', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const admin = await createUser(pool, { role: 'admin' });
    const viceAdmin = await createUser(pool, { role: 'vice_admin' });
    const member = await createUser(pool, { role: 'member' });

    // Member forbidden
    await client.login(member.email, member.password);
    const forbiddenRes = await client.request('POST', '/api/admin/weight-presets', {
      body: { label: 'Task siêu to', points: 8 }
    });
    assert.equal(forbiddenRes.status, 403);

    // Admin creates valid preset
    await client.login(admin.email, admin.password);
    const createRes = await client.request('POST', '/api/admin/weight-presets', {
      body: { label: 'Task trọng điểm', points: 8 }
    });
    assert.equal(createRes.status, 201);
    const presetId = createRes.json.id;
    assert.ok(presetId);

    // Validation: points < 0 or > 10 rejected
    const invalidRes1 = await client.request('POST', '/api/admin/weight-presets', {
      body: { label: 'Lỗi', points: -1 }
    });
    assert.equal(invalidRes1.status, 400);

    const invalidRes2 = await client.request('POST', '/api/admin/weight-presets', {
      body: { label: 'Lỗi', points: 11 }
    });
    assert.equal(invalidRes2.status, 400);

    // vice_admin updates preset
    await client.login(viceAdmin.email, viceAdmin.password);
    const updateRes = await client.request('PATCH', `/api/admin/weight-presets/${presetId}`, {
      body: { label: 'Đặc biệt quan trọng', points: 9 }
    });
    assert.equal(updateRes.status, 200);

    const [[updated]] = await pool.query('SELECT label, points FROM weight_presets WHERE id=?', [presetId]);
    assert.equal(updated.label, 'Đặc biệt quan trọng');
    assert.equal(updated.points, 9);

    // vice_admin deletes preset
    const deleteRes = await client.request('DELETE', `/api/admin/weight-presets/${presetId}`);
    assert.equal(deleteRes.status, 200);

    const [[deleted]] = await pool.query('SELECT id FROM weight_presets WHERE id=?', [presetId]);
    assert.equal(deleted, undefined);
  } finally {
    await close();
    await teardown();
  }
});
