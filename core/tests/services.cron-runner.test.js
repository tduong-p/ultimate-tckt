'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { registerCronHandler, getRegisteredHandlerKeys, runJobById, scheduleJob, unscheduleJob, start, stopAll } = require('../src/services/cron-runner');

test('system.noop handler is registered by default', () => {
  assert.ok(getRegisteredHandlerKeys().includes('system.noop'));
});

test('registerCronHandler adds a handler that runJobById can invoke', async () => {
  const { pool, teardown } = await createTestDatabase();
  try {
    let called = false;
    registerCronHandler('unit_test.mark_called', async () => { called = true; return { marked: true }; });
    const [result] = await pool.execute(
      "INSERT INTO cron_jobs(job_key,name,handler_key,schedule,is_active) VALUES ('t1','Test job','unit_test.mark_called','*/5 * * * *',0)"
    );
    const jobId = result.insertId;
    const outcome = await runJobById(pool, { info: () => {}, error: () => {} }, jobId);
    assert.equal(outcome.status, 'success');
    assert.equal(called, true);
    const [[job]] = await pool.query('SELECT last_status FROM cron_jobs WHERE id=?', [jobId]);
    assert.equal(job.last_status, 'success');
    const [runs] = await pool.execute('SELECT * FROM cron_job_runs WHERE cron_job_id=?', [jobId]);
    assert.equal(runs.length, 1);
    assert.equal(runs[0].status, 'success');
  } finally {
    await teardown();
  }
});

test('runJobById records failure without throwing when the handler rejects', async () => {
  const { pool, teardown } = await createTestDatabase();
  try {
    registerCronHandler('unit_test.always_fails', async () => { throw new Error('boom'); });
    const [result] = await pool.execute(
      "INSERT INTO cron_jobs(job_key,name,handler_key,schedule,is_active) VALUES ('t2','Failing job','unit_test.always_fails','*/5 * * * *',0)"
    );
    const jobId = result.insertId;
    const outcome = await runJobById(pool, { info: () => {}, error: () => {} }, jobId);
    assert.equal(outcome.status, 'failed');
    assert.match(outcome.error, /boom/);
    const [[job]] = await pool.query('SELECT last_status, last_error FROM cron_jobs WHERE id=?', [jobId]);
    assert.equal(job.last_status, 'failed');
    assert.match(job.last_error, /boom/);
  } finally {
    await teardown();
  }
});

test('runJobById fails clearly when handler_key is not registered', async () => {
  const { pool, teardown } = await createTestDatabase();
  try {
    const [result] = await pool.execute(
      "INSERT INTO cron_jobs(job_key,name,handler_key,schedule,is_active) VALUES ('t3','Unknown handler job','no.such.handler','*/5 * * * *',0)"
    );
    const outcome = await runJobById(pool, { info: () => {}, error: () => {} }, result.insertId);
    assert.equal(outcome.status, 'failed');
    assert.match(outcome.error, /not registered|handler/i);
  } finally {
    await teardown();
  }
});

test('start schedules only active jobs and stopAll clears them without throwing', async () => {
  const { pool, teardown } = await createTestDatabase();
  try {
    await pool.execute("INSERT INTO cron_jobs(job_key,name,handler_key,schedule,is_active) VALUES ('t4','Active job','system.noop','*/5 * * * *',1)");
    await pool.execute("INSERT INTO cron_jobs(job_key,name,handler_key,schedule,is_active) VALUES ('t5','Inactive job','system.noop','*/5 * * * *',0)");
    await start(pool, { info: () => {}, error: () => {} });
    stopAll();
  } finally {
    await teardown();
  }
});
