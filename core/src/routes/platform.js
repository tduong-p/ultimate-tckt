'use strict';
const express = require('express');
const { SETTINGS } = require('../settings/catalog');
const { recordAudit } = require('../services/audit');
const { hasDycMembership } = require('../units/memberships');

function createPlatformRoutes(context) {
  const { db, auth, platformAdmin, asyncRoute } = context;
  const router = express.Router();
  const dycUnitId = req => req.memberships.find(m => m.kind === 'platform_owner')?.unit_id ?? null;

  // Đọc được bởi bất kỳ ai đăng nhập (đơn vị cần biết setting của mình đang bị khoá) nhưng
  // scope theo đơn vị của người gọi: DYC (admin toàn nền tảng) thấy mọi dòng; người khác chỉ
  // thấy khoá toàn cục (unit_id NULL) hoặc khoá gắn với đơn vị họ là thành viên.
  router.get('/api/platform/setting-locks', auth, asyncRoute(async (req, res) => {
    const isDyc = hasDycMembership(req.memberships);
    const unitIds = (req.memberships || []).map(m => m.unit_id);
    const where = isDyc ? '' : 'WHERE l.unit_id IS NULL OR l.unit_id IN (?)';
    const [rows] = await db.query(
      `SELECT l.id, l.setting_key, l.unit_id, u.code unit_code, l.reason, l.locked_by, l.created_at
       FROM setting_locks l LEFT JOIN org_units u ON u.id=l.unit_id ${where} ORDER BY l.id`,
      isDyc ? [] : [unitIds.length ? unitIds : [0]]
    );
    res.json(rows);
  }));

  router.post('/api/platform/setting-locks', auth, platformAdmin, asyncRoute(async (req, res) => {
    const key = String(req.body.setting_key || '');
    const reason = String(req.body.reason || '').trim().slice(0, 255);
    const unitId = req.body.unit_id == null ? null : Number(req.body.unit_id);
    if (SETTINGS[key]?.managed_by !== 'unit') return res.status(400).json({ error: 'Chỉ khoá được cấu hình do đơn vị quản lý.' });
    if (!reason) return res.status(400).json({ error: 'Cần ghi lý do khoá.' });
    if (unitId !== null) {
      const [[unit]] = await db.execute('SELECT id FROM org_units WHERE id=?', [unitId]);
      if (!unit) return res.status(400).json({ error: 'Đơn vị không tồn tại.' });
    }
    const [result] = await db.execute('INSERT INTO setting_locks(setting_key,unit_id,locked_by,reason) VALUES (?,?,?,?)', [key, unitId, req.session.user.id, reason]);
    await recordAudit(db, { actorId: req.session.user.id, actorUnitId: dycUnitId(req), action: 'setting.lock', targetType: 'setting', targetId: key, ownerUnitId: unitId, meta: { reason, lock_id: result.insertId } });
    res.status(201).json({ id: result.insertId });
  }));

  router.delete('/api/platform/setting-locks/:id', auth, platformAdmin, asyncRoute(async (req, res) => {
    const [[lock]] = await db.execute('SELECT * FROM setting_locks WHERE id=?', [req.params.id]);
    if (!lock) return res.status(404).json({ error: 'Không tìm thấy khoá.' });
    await db.execute('DELETE FROM setting_locks WHERE id=?', [lock.id]);
    await recordAudit(db, { actorId: req.session.user.id, actorUnitId: dycUnitId(req), action: 'setting.unlock', targetType: 'setting', targetId: lock.setting_key, ownerUnitId: lock.unit_id, meta: { reason: lock.reason, lock_id: lock.id } });
    res.json({ ok: true });
  }));

  return router;
}

module.exports = { createPlatformRoutes };
