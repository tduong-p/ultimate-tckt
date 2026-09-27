'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createUser, addMembership } = require('./helpers/fixtures');

test('settings-cron routes: handler list, job lifecycle, run-now, run history', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const devopsUser = await createUser(pool, { role: 'admin' });
    await addMembership(pool, devopsUser.id, 'DYC', 'dyc_engineer');
    await client.login(devopsUser.email, devopsUser.password);

    let res = await client.request('GET', '/api/admin/cron/handlers');
    assert.equal(res.status, 200);
    assert.ok(res.json.handlers.includes('system.noop'));

    res = await client.request('POST', '/api/admin/cron/jobs', { body: { job_key: 'demo_job', name: 'Demo job', handler_key: 'system.noop', schedule: '*/5 * * * *' } });
    assert.equal(res.status, 201);
    assert.equal(res.json.job.is_active, 0);
    const jobId = res.json.job.id;

    res = await client.request('POST', '/api/admin/cron/jobs', { body: { job_key: 'bad_job', name: 'Bad', handler_key: 'no.such.handler', schedule: '*/5 * * * *' } });
    assert.equal(res.status, 400);

    res = await client.request('PATCH', `/api/admin/cron/jobs/${jobId}/activate`, {});
    assert.equal(res.status, 200);
    assert.equal(res.json.job.is_active, 1);

    res = await client.request('POST', `/api/admin/cron/jobs/${jobId}/run-now`, {});
    assert.equal(res.status, 200);
    assert.equal(res.json.status, 'success');

    res = await client.request('GET', `/api/admin/cron/jobs/${jobId}/runs`);
    assert.equal(res.status, 200);
    assert.equal(res.json.runs.length, 1);

    res = await client.request('PATCH', `/api/admin/cron/jobs/${jobId}/deactivate`, {});
    assert.equal(res.status, 200);
    assert.equal(res.json.job.is_active, 0);
  } finally {
    await close();
    await teardown();
  }
});
