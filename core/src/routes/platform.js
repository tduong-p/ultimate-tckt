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
  
  /**
   * GET /api/platform/visibility-policies
   * Lấy danh sách các visibility policies.
   * Auth: authenticated users (để xem policies của đơn vị mình)
   */
  router.get('/api/platform/visibility-policies', auth, asyncRoute(async (req, res) => {
    const { hasDycMembership } = require('../units/memberships');
    const isDyc = hasDycMembership(req.memberships);
    
    let query, params;
    if (isDyc) {
      // DYC sees all policies
      query = `
        SELECT vp.*, 
          viewer.code AS viewer_code, viewer.name AS viewer_name,
          owner.code AS owner_code, owner.name AS owner_name,
          u.name AS updated_by_name
        FROM unit_visibility_policies vp
        JOIN org_units viewer ON viewer.id = vp.viewer_unit_id
        JOIN org_units owner ON owner.id = vp.owner_unit_id
        LEFT JOIN users u ON u.id = vp.updated_by
        ORDER BY viewer.code, owner.code
      `;
      params = [];
    } else {
      // Regular users see policies where their unit is owner
      const myUnitIds = req.memberships.map(m => m.unit_id);
      if (!myUnitIds.length) {
        return res.json([]);
      }
      
      query = `
        SELECT vp.*, 
          viewer.code AS viewer_code, viewer.name AS viewer_name,
          owner.code AS owner_code, owner.name AS owner_name,
          u.name AS updated_by_name
        FROM unit_visibility_policies vp
        JOIN org_units viewer ON viewer.id = vp.viewer_unit_id
        JOIN org_units owner ON owner.id = vp.owner_unit_id
        LEFT JOIN users u ON u.id = vp.updated_by
        WHERE vp.owner_unit_id IN (?)
        ORDER BY viewer.code, owner.code
      `;
      params = [myUnitIds];
    }
    
    const [rows] = await db.query(query, params);
    res.json(rows);
  }));
  
  /**
   * PUT /api/platform/visibility-policies/:viewerUnitId/:ownerUnitId
   * Tạo hoặc cập nhật visibility policy.
   * Auth: admin/vice_admin của owner unit, hoặc DYC
   * Body: { level }
   */
  router.put('/api/platform/visibility-policies/:viewerUnitId/:ownerUnitId', auth, asyncRoute(async (req, res) => {
    const viewerUnitId = Number(req.params.viewerUnitId);
    const ownerUnitId = Number(req.params.ownerUnitId);
    const { level } = req.body;
    
    // Validate level
    const validLevels = ['summary', 'tasks_readonly', 'full_readonly'];
    if (!level || !validLevels.includes(level)) {
      return res.status(400).json({ 
        error: 'level phải là một trong: summary, tasks_readonly, full_readonly.' 
      });
    }
    
    const { hasDycMembership, getUnit } = require('../units/memberships');
    const { isUnitAdmin } = require('../units/catalog');
    
    // Check permission: DYC or admin of owner unit
    const isDyc = hasDycMembership(req.memberships);
    const ownerMembership = req.memberships.find(m => m.unit_id === ownerUnitId);
    
    const ownerUnit = await getUnit(db, ownerUnitId);
    if (!ownerUnit) {
      return res.status(404).json({ error: 'Owner unit không tồn tại.' });
    }
    
    const canManage = isDyc || (ownerMembership && isUnitAdmin(ownerUnit.kind, ownerMembership.role));
    
    if (!canManage) {
      return res.status(403).json({ 
        error: 'Chỉ admin/vice_admin của đơn vị sở hữu hoặc DYC được cấu hình visibility.' 
      });
    }
    
    // Check viewer unit exists
    const viewerUnit = await getUnit(db, viewerUnitId);
    if (!viewerUnit) {
      return res.status(404).json({ error: 'Viewer unit không tồn tại.' });
    }
    
    // Upsert policy
    await db.execute(`
      INSERT INTO unit_visibility_policies(viewer_unit_id, owner_unit_id, level, updated_by)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE level = VALUES(level), updated_by = VALUES(updated_by), updated_at = CURRENT_TIMESTAMP
    `, [viewerUnitId, ownerUnitId, level, req.session.user.id]);
    
    // Audit log
    await recordAudit(db, {
      actorId: req.session.user.id,
      actorUnitId: req.unit?.id,
      action: 'visibility_policy.update',
      targetType: 'visibility_policy',
      targetId: `${viewerUnit.code}->${ownerUnit.code}`,
      ownerUnitId: ownerUnitId,
      meta: { level, viewer_unit_code: viewerUnit.code }
    });
    
    res.json({ ok: true });
  }));
  
  /**
   * DELETE /api/platform/visibility-policies/:viewerUnitId/:ownerUnitId
   * Xóa một visibility policy.
   * Auth: admin/vice_admin của owner unit, hoặc DYC
   */
  router.delete('/api/platform/visibility-policies/:viewerUnitId/:ownerUnitId', auth, asyncRoute(async (req, res) => {
    const viewerUnitId = Number(req.params.viewerUnitId);
    const ownerUnitId = Number(req.params.ownerUnitId);
    
    const { hasDycMembership, getUnit } = require('../units/memberships');
    const { isUnitAdmin } = require('../units/catalog');
    
    // Check permission: DYC or admin of owner unit
    const isDyc = hasDycMembership(req.memberships);
    const ownerMembership = req.memberships.find(m => m.unit_id === ownerUnitId);
    
    const ownerUnit = await getUnit(db, ownerUnitId);
    if (!ownerUnit) {
      return res.status(404).json({ error: 'Owner unit không tồn tại.' });
    }
    
    const canManage = isDyc || (ownerMembership && isUnitAdmin(ownerUnit.kind, ownerMembership.role));
    
    if (!canManage) {
      return res.status(403).json({ 
        error: 'Chỉ admin/vice_admin của đơn vị sở hữu hoặc DYC được xóa visibility policy.' 
      });
    }
    
    // Check policy exists
    const [[policy]] = await db.execute(
      'SELECT level FROM unit_visibility_policies WHERE viewer_unit_id = ? AND owner_unit_id = ?',
      [viewerUnitId, ownerUnitId]
    );
    
    if (!policy) {
      return res.status(404).json({ error: 'Policy không tồn tại.' });
    }
    
    const viewerUnit = await getUnit(db, viewerUnitId);
    
    // Delete policy
    await db.execute(
      'DELETE FROM unit_visibility_policies WHERE viewer_unit_id = ? AND owner_unit_id = ?',
      [viewerUnitId, ownerUnitId]
    );
    
    // Audit log
    await recordAudit(db, {
      actorId: req.session.user.id,
      actorUnitId: req.unit?.id,
      action: 'visibility_policy.delete',
      targetType: 'visibility_policy',
      targetId: `${viewerUnit?.code || viewerUnitId}->${ownerUnit.code}`,
      ownerUnitId: ownerUnitId,
      meta: { level: policy.level, viewer_unit_id: viewerUnitId }
    });
    
    res.json({ ok: true });
  }));
  
  return router;
}

module.exports = { createPlatformRoutes };
