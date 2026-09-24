'use strict';
const express = require('express');
const cron = require('node-cron');
const { getRegisteredHandlerKeys, runJobById, reschedule, unscheduleJob } = require('../services/cron-runner');

function createSettingsCronRoutes(context) {
  const { db, auth, platformAdmin, asyncRoute, one, logger } = context;
  const router = express.Router();

  router.get('/api/admin/cron/handlers', auth, platformAdmin, (_req, res) => {
    res.json({ handlers: getRegisteredHandlerKeys() });
  });

  router.get('/api/admin/cron/jobs', auth, platformAdmin, asyncRoute(async (_req, res) => {
    const [rows] = await db.execute('SELECT * FROM cron_jobs ORDER BY name');
    res.json({ jobs: rows });
  }));

  router.post('/api/admin/cron/jobs', auth, platformAdmin, asyncRoute(async (req, res) => {
    const { job_key, name, handler_key, schedule, timezone } = req.body;
    if (!job_key || !name || !handler_key || !schedule) return res.status(400).json({ error: 'job_key, name, handler_key, schedule là bắt buộc.' });
    if (!getRegisteredHandlerKeys().includes(handler_key)) return res.status(400).json({ error: `handler_key '${handler_key}' chưa được đăng ký trong code.` });
    if (!cron.validate(schedule)) return res.status(400).json({ error: `Lịch cron không hợp lệ: ${schedule}` });
    const [result] = await db.execute(
      'INSERT INTO cron_jobs(job_key,name,handler_key,schedule,timezone,is_active,created_by,updated_by) VALUES (?,?,?,?,?,0,?,?)',
      [job_key, name, handler_key, schedule, timezone || 'Asia/Ho_Chi_Minh', req.session.user.id, req.session.user.id]
    );
    const [rows] = await db.execute('SELECT * FROM cron_jobs WHERE id=?', [result.insertId]);
    res.status(201).json({ job: one(rows) });
  }));

  router.put('/api/admin/cron/jobs/:id', auth, platformAdmin, asyncRoute(async (req, res) => {
    const { name, handler_key, schedule, timezone } = req.body;
    if (handler_key && !getRegisteredHandlerKeys().includes(handler_key)) return res.status(400).json({ error: `handler_key '${handler_key}' chưa được đăng ký trong code.` });
    if (schedule && !cron.validate(schedule)) return res.status(400).json({ error: `Lịch cron không hợp lệ: ${schedule}` });
    await db.execute(
      'UPDATE cron_jobs SET name=COALESCE(?,name), handler_key=COALESCE(?,handler_key), schedule=COALESCE(?,schedule), timezone=COALESCE(?,timezone), updated_by=? WHERE id=?',
      [name || null, handler_key || null, schedule || null, timezone || null, req.session.user.id, req.params.id]
    );
    await reschedule(db, logger, req.params.id);
    const [rows] = await db.execute('SELECT * FROM cron_jobs WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Không tìm thấy cron job.' });
    res.json({ job: one(rows) });
  }));

  router.delete('/api/admin/cron/jobs/:id', auth, platformAdmin, asyncRoute(async (req, res) => {
    unscheduleJob(Number(req.params.id));
    await db.execute('DELETE FROM cron_jobs WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  }));

  router.patch('/api/admin/cron/jobs/:id/activate', auth, platformAdmin, asyncRoute(async (req, res) => {
    await db.execute('UPDATE cron_jobs SET is_active=1, updated_by=? WHERE id=?', [req.session.user.id, req.params.id]);
    await reschedule(db, logger, req.params.id);
    const [rows] = await db.execute('SELECT * FROM cron_jobs WHERE id=?', [req.params.id]);
    res.json({ job: one(rows) });
  }));

  router.patch('/api/admin/cron/jobs/:id/deactivate', auth, platformAdmin, asyncRoute(async (req, res) => {
    await db.execute('UPDATE cron_jobs SET is_active=0, updated_by=? WHERE id=?', [req.session.user.id, req.params.id]);
    unscheduleJob(Number(req.params.id));
    const [rows] = await db.execute('SELECT * FROM cron_jobs WHERE id=?', [req.params.id]);
    res.json({ job: one(rows) });
  }));

  router.post('/api/admin/cron/jobs/:id/run-now', auth, platformAdmin, asyncRoute(async (req, res) => {
    const outcome = await runJobById(db, logger, req.params.id);
    res.json(outcome);
  }));

  router.get('/api/admin/cron/jobs/:id/runs', auth, platformAdmin, asyncRoute(async (req, res) => {
    const [rows] = await db.execute('SELECT * FROM cron_job_runs WHERE cron_job_id=? ORDER BY id DESC LIMIT 50', [req.params.id]);
    res.json({ runs: rows });
  }));

  return router;
}

module.exports = { createSettingsCronRoutes };
