'use strict';
const express = require('express');
const { getPublicSettings, updateSettings } = require('../services/email-settings');
const { validateConditions } = require('../services/email-condition-evaluator');
const { getEventCatalog, getEvent, validateRecipients, simulateRule, sendRaw } = require('../services/email-events');

function createSettingsEmailRoutes(context) {
  const { db, auth, admin, settingGuard, asyncRoute, one } = context;
  const router = express.Router();

  router.get('/api/admin/email/settings', auth, settingGuard('email.smtp'), asyncRoute(async (_req, res) => {
    res.json({ settings: await getPublicSettings(db) });
  }));

  router.put('/api/admin/email/settings', auth, settingGuard('email.smtp'), asyncRoute(async (req, res) => {
    await updateSettings(db, req.body.settings || {}, req.session.user.id);
    res.json({ ok: true });
  }));

  router.post('/api/admin/email/settings/test-send', auth, settingGuard('email.smtp'), asyncRoute(async (req, res) => {
    try {
      const info = await sendRaw(db, { to: req.session.user.email, subject: '[TCKT] Kiểm tra cấu hình Email module', html: '<p>Nếu bạn nhận được email này, cấu hình SMTP đang hoạt động.</p>' });
      res.json({ ok: true, message_id: info.messageId });
    } catch (error) {
      res.status(502).json({ error: `Không thể gửi email kiểm tra: ${error.message}` });
    }
  }));

  router.get('/api/admin/email/events', auth, settingGuard('email.smtp'), (_req, res) => {
    res.json({ events: getEventCatalog() });
  });

  router.get('/api/admin/email/templates', auth, settingGuard('email.templates'), asyncRoute(async (_req, res) => {
    const [rows] = await db.execute('SELECT * FROM email_templates ORDER BY name');
    res.json({ templates: rows });
  }));

  router.post('/api/admin/email/templates', auth, settingGuard('email.templates'), asyncRoute(async (req, res) => {
    const { template_key, name, subject, body_html, variables_hint } = req.body;
    if (!template_key || !name || !subject || !body_html) return res.status(400).json({ error: 'template_key, name, subject, body_html là bắt buộc.' });
    const [result] = await db.execute(
      'INSERT INTO email_templates(template_key,name,subject,body_html,variables_hint,created_by,updated_by) VALUES (?,?,?,?,?,?,?)',
      [template_key, name, subject, body_html, variables_hint ? JSON.stringify(variables_hint) : null, req.session.user.id, req.session.user.id]
    );
    const [rows] = await db.execute('SELECT * FROM email_templates WHERE id=?', [result.insertId]);
    res.status(201).json({ template: one(rows) });
  }));

  router.put('/api/admin/email/templates/:id', auth, settingGuard('email.templates'), asyncRoute(async (req, res) => {
    const { name, subject, body_html, variables_hint, is_active } = req.body;
    await db.execute(
      'UPDATE email_templates SET name=COALESCE(?,name), subject=COALESCE(?,subject), body_html=COALESCE(?,body_html), variables_hint=COALESCE(?,variables_hint), is_active=COALESCE(?,is_active), updated_by=? WHERE id=?',
      [name || null, subject || null, body_html || null, variables_hint ? JSON.stringify(variables_hint) : null, is_active === undefined ? null : (is_active ? 1 : 0), req.session.user.id, req.params.id]
    );
    const [rows] = await db.execute('SELECT * FROM email_templates WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Không tìm thấy template.' });
    res.json({ template: one(rows) });
  }));

  router.delete('/api/admin/email/templates/:id', auth, settingGuard('email.templates'), asyncRoute(async (req, res) => {
    const [[usage]] = await db.query('SELECT COUNT(*) c FROM email_rules WHERE template_id=?', [req.params.id]);
    if (usage.c > 0) return res.status(409).json({ error: 'Template đang được dùng bởi ít nhất 1 rule, không thể xóa.' });
    await db.execute('DELETE FROM email_templates WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  }));

  function fieldsByPathFor(eventKey) {
    const event = getEvent(eventKey);
    if (!event) return null;
    return new Map(event.fields.map(field => [field.path, field]));
  }

  function allowedFieldSetFor(eventKey) {
    const fieldsByPath = fieldsByPathFor(eventKey);
    return fieldsByPath ? new Set(fieldsByPath.keys()) : null;
  }

  router.get('/api/admin/email/rules', auth, settingGuard('email.rules'), asyncRoute(async (_req, res) => {
    const [rows] = await db.execute('SELECT * FROM email_rules ORDER BY event_key, priority DESC');
    res.json({ rules: rows });
  }));

  router.post('/api/admin/email/rules', auth, settingGuard('email.rules'), asyncRoute(async (req, res) => {
    const { name, event_key, template_id, conditions, recipients, priority } = req.body;
    if (!name || !event_key || !template_id || !recipients) return res.status(400).json({ error: 'name, event_key, template_id, recipients là bắt buộc.' });
    try {
      validateConditions(conditions ?? null, allowedFieldSetFor(event_key));
      validateRecipients(recipients, fieldsByPathFor(event_key));
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
    const [result] = await db.execute(
      'INSERT INTO email_rules(name,event_key,template_id,conditions,recipients,priority,is_active,created_by,updated_by) VALUES (?,?,?,?,?,?,0,?,?)',
      [name, event_key, template_id, conditions ? JSON.stringify(conditions) : null, JSON.stringify(recipients), Number(priority) || 0, req.session.user.id, req.session.user.id]
    );
    const [rows] = await db.execute('SELECT * FROM email_rules WHERE id=?', [result.insertId]);
    res.status(201).json({ rule: one(rows) });
  }));

  router.put('/api/admin/email/rules/:id', auth, settingGuard('email.rules'), asyncRoute(async (req, res) => {
    const [existingRows] = await db.execute('SELECT * FROM email_rules WHERE id=?', [req.params.id]);
    const existing = one(existingRows);
    if (!existing) return res.status(404).json({ error: 'Không tìm thấy rule.' });
    const eventKey = req.body.event_key || existing.event_key;
    const conditions = req.body.conditions !== undefined ? req.body.conditions : (typeof existing.conditions === 'string' ? JSON.parse(existing.conditions) : existing.conditions);
    const recipients = req.body.recipients || (typeof existing.recipients === 'string' ? JSON.parse(existing.recipients) : existing.recipients);
    try {
      validateConditions(conditions ?? null, allowedFieldSetFor(eventKey));
      validateRecipients(recipients, fieldsByPathFor(eventKey));
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
    // Note: is_active is intentionally never accepted here — use /activate or /deactivate.
    await db.execute(
      'UPDATE email_rules SET name=COALESCE(?,name), event_key=?, template_id=COALESCE(?,template_id), conditions=?, recipients=?, priority=COALESCE(?,priority), updated_by=? WHERE id=?',
      [req.body.name || null, eventKey, req.body.template_id || null, conditions ? JSON.stringify(conditions) : null, JSON.stringify(recipients), req.body.priority, req.session.user.id, req.params.id]
    );
    const [rows] = await db.execute('SELECT * FROM email_rules WHERE id=?', [req.params.id]);
    res.json({ rule: one(rows) });
  }));

  router.delete('/api/admin/email/rules/:id', auth, settingGuard('email.rules'), asyncRoute(async (req, res) => {
    await db.execute('DELETE FROM email_rules WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  }));

  router.post('/api/admin/email/rules/:id/simulate', auth, settingGuard('email.rules'), asyncRoute(async (req, res) => {
    const [rows] = await db.execute('SELECT * FROM email_rules WHERE id=?', [req.params.id]);
    const rule = one(rows);
    if (!rule) return res.status(404).json({ error: 'Không tìm thấy rule.' });
    const event = getEvent(rule.event_key);
    const payload = req.body.payload || event?.samplePayload;
    if (!payload) return res.status(400).json({ error: 'Không có payload mẫu cho sự kiện này, hãy truyền payload thủ công.' });
    const result = await simulateRule(db, rule, payload);
    res.json(result);
  }));

  router.patch('/api/admin/email/rules/:id/activate', auth, settingGuard('email.rules'), asyncRoute(async (req, res) => {
    const [rows] = await db.execute('SELECT * FROM email_rules WHERE id=?', [req.params.id]);
    const rule = one(rows);
    if (!rule) return res.status(404).json({ error: 'Không tìm thấy rule.' });
    const event = getEvent(rule.event_key);
    const payload = event?.samplePayload || {};
    const { recipients } = await simulateRule(db, rule, payload);
    const expected = Number(req.body.confirmed_recipient_count);
    if (!Number.isInteger(expected) || expected !== recipients.length) {
      return res.status(409).json({ error: 'Số người nhận đã thay đổi, vui lòng simulate lại trước khi bật rule.', recipient_count: recipients.length });
    }
    await db.execute('UPDATE email_rules SET is_active=1, updated_by=? WHERE id=?', [req.session.user.id, req.params.id]);
    const [updatedRows] = await db.execute('SELECT * FROM email_rules WHERE id=?', [req.params.id]);
    res.json({ rule: one(updatedRows) });
  }));

  router.patch('/api/admin/email/rules/:id/deactivate', auth, settingGuard('email.rules'), asyncRoute(async (req, res) => {
    await db.execute('UPDATE email_rules SET is_active=0, updated_by=? WHERE id=?', [req.session.user.id, req.params.id]);
    const [rows] = await db.execute('SELECT * FROM email_rules WHERE id=?', [req.params.id]);
    res.json({ rule: one(rows) });
  }));

  router.get('/api/admin/email/deliveries', auth, admin, asyncRoute(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = 50;
    const filters = [];
    const params = [];
    if (req.query.status) { filters.push('status=?'); params.push(req.query.status); }
    if (req.query.event_key) { filters.push('event_key=?'); params.push(req.query.event_key); }
    if (req.query.recipient) { filters.push('recipient_email LIKE ?'); params.push(`%${req.query.recipient}%`); }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const [rows] = await db.query(`SELECT * FROM email_deliveries ${where} ORDER BY id DESC LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`, params);
    const [[{ total }]] = await db.query(`SELECT COUNT(*) total FROM email_deliveries ${where}`, params);
    res.json({ deliveries: rows, total, page, pageSize });
  }));

  return router;
}

module.exports = { createSettingsEmailRoutes };
