'use strict';

const { SETTINGS } = require('../settings/catalog');
const { recordAudit } = require('../services/audit');

/**
 * Platform-level routes - quản lý setting locks và các tính năng admin toàn cục.
 * @param {Object} context
 */
function createPlatformRoutes(context) {
  const { db, auth, platformAdmin, asyncRoute } = context;
  
  // Get router from app (context doesn't have router property in this pattern)
  // We need to extract it from the context or use app.use pattern
  const express = require('express');
  const router = express.Router();

  /**
   * GET /api/platform/setting-locks
   * Lấy danh sách tất cả setting locks.
   * Auth: Bất kỳ user đã đăng nhập (để UI hiển thị icon 🔒)
   */
  router.get('/api/platform/setting-locks', auth, asyncRoute(async (req, res) => {
    const [rows] = await db.execute(`
      SELECT l.id, l.setting_key, l.unit_id, u.code AS unit_code, l.reason, l.locked_by, l.created_at
      FROM setting_locks l
      LEFT JOIN org_units u ON u.id = l.unit_id
      ORDER BY l.created_at DESC
    `);
    res.json(rows);
  }));

  /**
   * POST /api/platform/setting-locks
   * Tạo một setting lock mới.
   * Auth: Chỉ platformAdmin (DYC)
   * Body: { setting_key, unit_id?, reason }
   */
  router.post('/api/platform/setting-locks', auth, platformAdmin, asyncRoute(async (req, res) => {
    const { setting_key, unit_id, reason } = req.body;
    
    // Validate setting_key exists in catalog
    const setting = SETTINGS[setting_key];
    if (!setting) {
      return res.status(400).json({ 
        error: 'setting_key không tồn tại trong catalog.' 
      });
    }
    
    // Only unit-level settings can be locked
    if (setting.managed_by !== 'unit') {
      return res.status(400).json({ 
        error: 'Chỉ cấu hình unit-level mới có thể khoá.' 
      });
    }
    
    // Validate reason is not empty
    const trimmedReason = String(reason || '').trim();
    if (!trimmedReason) {
      return res.status(400).json({ 
        error: 'reason không được rỗng.' 
      });
    }
    
    // Insert lock
    const [result] = await db.execute(
      'INSERT INTO setting_locks(setting_key, unit_id, reason, locked_by) VALUES (?, ?, ?, ?)',
      [setting_key, unit_id || null, trimmedReason, req.session.user.id]
    );
    
    // Audit log
    await recordAudit(db, {
      actorId: req.session.user.id,
      actorUnitId: req.unit?.id,
      action: 'setting.lock',
      targetType: 'setting',
      targetId: setting_key,
      ownerUnitId: unit_id || null,
      meta: { reason: trimmedReason }
    });
    
    res.status(201).json({ id: result.insertId });
  }));

  /**
   * DELETE /api/platform/setting-locks/:id
   * Xóa một setting lock.
   * Auth: Chỉ platformAdmin (DYC)
   */
  router.delete('/api/platform/setting-locks/:id', auth, platformAdmin, asyncRoute(async (req, res) => {
    // Check if lock exists
    const [rows] = await db.execute(
      'SELECT id, setting_key, unit_id FROM setting_locks WHERE id = ?', 
      [req.params.id]
    );
    
    if (!rows.length) {
      return res.status(404).json({ 
        error: 'Lock không tồn tại.' 
      });
    }
    
    const lock = rows[0];
    
    // Delete lock
    await db.execute('DELETE FROM setting_locks WHERE id = ?', [req.params.id]);
    
    // Audit log
    await recordAudit(db, {
      actorId: req.session.user.id,
      actorUnitId: req.unit?.id,
      action: 'setting.unlock',
      targetType: 'setting',
      targetId: lock.setting_key,
      ownerUnitId: lock.unit_id,
      meta: null
    });
    
    res.json({ ok: true });
  }));
  
  return router;
}

module.exports = { createPlatformRoutes };
