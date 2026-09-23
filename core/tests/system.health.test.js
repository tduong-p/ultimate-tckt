const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');

test('GET /api/health returns ok against the seeded schema', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const result = await client.request('GET', '/api/health');
    assert.equal(result.status, 200);
    assert.deepEqual(result.json, { status: 'ok' });
  } finally {
    await close();
    await teardown();
  }
});
