'use strict';
const cron = require('node-cron');

const handlers = new Map();
const tasks = new Map();

function registerCronHandler(key, fn) {
  handlers.set(key, fn);
}

function getRegisteredHandlerKeys() {
  return [...handlers.keys()];
}

registerCronHandler('system.noop', async () => ({ ok: true }));

async function runJobById(db, logger, jobId) {
  const [rows] = await db.execute('SELECT * FROM cron_jobs WHERE id=?', [jobId]);
  const job = rows[0];
  if (!job) return { status: 'failed', error: 'Cron job not found.' };
  const handler = handlers.get(job.handler_key);
  const [runResult] = await db.execute('INSERT INTO cron_job_runs(cron_job_id,status) VALUES (?,\'running\')', [jobId]);
  const runId = runResult.insertId;
  await db.execute('UPDATE cron_jobs SET last_status=\'running\' WHERE id=?', [jobId]);
  if (!handler) {
    const error = `Handler_key '${job.handler_key}' is not registered.`;
    await db.execute('UPDATE cron_job_runs SET status=\'failed\', error_message=?, finished_at=NOW() WHERE id=?', [error, runId]);
    await db.execute('UPDATE cron_jobs SET last_status=\'failed\', last_error=?, last_run_at=NOW() WHERE id=?', [error, jobId]);
    return { status: 'failed', error };
  }
  try {
    const result = await handler({ db, logger, job });
    const summary = result ? JSON.stringify(result).slice(0, 490) : null;
    await db.execute('UPDATE cron_job_runs SET status=\'success\', result_summary=?, finished_at=NOW() WHERE id=?', [summary, runId]);
    await db.execute('UPDATE cron_jobs SET last_status=\'success\', last_error=NULL, last_run_at=NOW() WHERE id=?', [jobId]);
    return { status: 'success' };
  } catch (error) {
    logger?.error?.(`Cron job ${job.job_key} failed.`, error);
    await db.execute('UPDATE cron_job_runs SET status=\'failed\', error_message=?, finished_at=NOW() WHERE id=?', [error.message, runId]);
    await db.execute('UPDATE cron_jobs SET last_status=\'failed\', last_error=?, last_run_at=NOW() WHERE id=?', [error.message, jobId]);
    return { status: 'failed', error: error.message };
  }
}

function unscheduleJob(jobId) {
  const task = tasks.get(jobId);
  if (task) { task.stop(); tasks.delete(jobId); }
}

async function scheduleJob(db, logger, job) {
  unscheduleJob(job.id);
  if (!job.is_active) return;
  if (!cron.validate(job.schedule)) { logger?.error?.(`Cron job ${job.job_key} has an invalid schedule '${job.schedule}'; not scheduled.`); return; }
  const task = cron.schedule(job.schedule, () => runJobById(db, logger, job.id), { timezone: job.timezone || 'Asia/Ho_Chi_Minh' });
  tasks.set(job.id, task);
}

async function start(db, logger) {
  const [jobs] = await db.execute('SELECT * FROM cron_jobs WHERE is_active=1');
  for (const job of jobs) await scheduleJob(db, logger, job);
}

async function reschedule(db, logger, jobId) {
  const [rows] = await db.execute('SELECT * FROM cron_jobs WHERE id=?', [jobId]);
  const job = rows[0];
  if (!job) { unscheduleJob(jobId); return; }
  await scheduleJob(db, logger, job);
}

function stopAll() {
  for (const task of tasks.values()) task.stop();
  tasks.clear();
}

module.exports = { registerCronHandler, getRegisteredHandlerKeys, runJobById, scheduleJob, unscheduleJob, start, reschedule, stopAll };
