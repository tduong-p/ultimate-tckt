'use strict';

const express = require('express');
const { hasDycMembership, unitIdByCode, getUnit, listMemberships, upsertMembership, removeMembership, setTcktRoleColumn } = require('../units/memberships');
const { TCKT_CODE, isUnitAdmin, isValidRole } = require('../units/catalog');
const { recordAudit } = require('../services/audit');

/**
 * Check if user can manage a specific unit's memberships.
 * @param {Array} memberships - req.memberships
 * @param {Object} unit - { id, code, kind, name }
 * @returns {boolean}
 */
function canManageUnit(memberships, unit) {
  const isDyc = hasDycMembership(memberships);
  
  if (isDyc) {
    // DYC manages all units, but only dyc_admin can manage DYC itself
    if (unit.kind === 'platform_owner') {
      const dycMembership = memberships.find(m => m.kind === 'platform_owner');
      return dycMembership?.role === 'dyc_admin';
    }
    return true; // DYC can manage all other units
  }
  
  // Unit admin can only manage their own unit
  const myMembership = memberships.find(m => m.unit_id === unit.id);
  if (!myMembership) return false;
  
  return isUnitAdmin(unit.kind, myMembership.role);
}

/**
 * Create unit routes.
 * @param {Object} context
 */
function createUnitRoutes(context) {
  const { db, auth, asyncRoute } = context;
  const router = express.Router();

  /**
   * GET /api/units
   * List all units user has access to.
   * - DYC sees all active units
   * - Regular users see only their units
   */
  router.get('/api/units', auth, asyncRoute(async (req, res) => {
    const memberships = req.memberships || [];
    const isDyc = hasDycMembership(memberships);
    
    let query, params;
    
    if (isDyc) {
      // DYC sees all active units
      query = 'SELECT id, code, name, kind, is_active, created_at FROM org_units WHERE is_active = 1 ORDER BY code';
      params = [];
    } else {
      // Regular users see only their units
      const unitIds = memberships.map(m => m.unit_id);
      
      if (!unitIds.length) {
        return res.json([]); // User has no memberships
      }
      
      query = 'SELECT id, code, name, kind, is_active, created_at FROM org_units WHERE id IN (?) AND is_active = 1 ORDER BY code';
      params = [unitIds];
    }
    
    const [rows] = await db.query(query, params);
    res.json(rows);
  }));

  /**
   * GET /api/units/:id/members
   * List all members of a unit.
   * Requires: User must be able to view this unit (either DYC or member of the unit)
   */
  router.get('/api/units/:id/members', auth, asyncRoute(async (req, res) => {
    const unitId = Number(req.params.id);
    const memberships = req.memberships || [];
    const isDyc = hasDycMembership(memberships);
    
    // Check if user has access to view this unit
    const hasAccess = isDyc || memberships.some(m => m.unit_id === unitId);
    
    if (!hasAccess) {
      return res.status(403).json({ 
        error: 'Bạn không có quyền xem thành viên của đơn vị này.' 
      });
    }
    
    // Get members list
    const [rows] = await db.execute(
      `SELECT m.user_id, u.name, u.email, m.role
       FROM unit_memberships m
       JOIN users u ON u.id = m.user_id
       WHERE m.unit_id = ?
       ORDER BY m.role, u.name`,
      [unitId]
    );
    
    res.json(rows);
  }));

  /**
   * PUT /api/units/:id/members/:userId
   * Add or update a member's role in a unit.
   * Requires: canManageUnit permission
   */
  router.put('/api/units/:id/members/:userId', auth, asyncRoute(async (req, res) => {
    const unitId = Number(req.params.id);
    const userId = Number(req.params.userId);
    const { role } = req.body;
    
    if (!role || typeof role !== 'string') {
      return res.status(400).json({ error: 'role là bắt buộc.' });
    }
    
    const memberships = req.memberships || [];
    
    // Get unit info
    const unit = await getUnit(db, unitId);
    if (!unit) {
      return res.status(404).json({ error: 'Đơn vị không tồn tại.' });
    }
    
    // Check permission
    if (!canManageUnit(memberships, unit)) {
      return res.status(403).json({ 
        error: 'Bạn không có quyền quản lý thành viên của đơn vị này.' 
      });
    }
    
    // Validate role for unit kind
    if (!isValidRole(unit.kind, role)) {
      return res.status(400).json({ 
        error: `Role "${role}" không hợp lệ cho đơn vị loại "${unit.kind}".` 
      });
    }
    
    // Check user exists and is active
    const [[user]] = await db.execute(
      'SELECT id, is_active FROM users WHERE id = ?', 
      [userId]
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User không tồn tại.' });
    }
    
    if (!user.is_active) {
      return res.status(400).json({ error: 'User đã bị vô hiệu hóa.' });
    }
    
    // Upsert membership
    await upsertMembership(db, userId, unitId, role);
    
    // Sync users.role if TCKT (legacy compatibility)
    if (unit.code === TCKT_CODE) {
      await setTcktRoleColumn(db, userId, role);
    }
    
    // Audit log
    await recordAudit(db, {
      actorId: req.session.user.id,
      actorUnitId: req.unit?.id,
      action: 'membership.upsert',
      targetType: 'user',
      targetId: userId,
      ownerUnitId: unitId,
      meta: { role, unit_code: unit.code }
    });
    
    res.json({ ok: true });
  }));

  /**
   * DELETE /api/units/:id/members/:userId
   * Remove a member from a unit.
   * Requires: canManageUnit permission
   * Special: Prevents removing last dyc_admin
   */
  router.delete('/api/units/:id/members/:userId', auth, asyncRoute(async (req, res) => {
    const unitId = Number(req.params.id);
    const userId = Number(req.params.userId);
    
    const memberships = req.memberships || [];
    
    // Get unit info
    const unit = await getUnit(db, unitId);
    if (!unit) {
      return res.status(404).json({ error: 'Đơn vị không tồn tại.' });
    }
    
    // Check permission
    if (!canManageUnit(memberships, unit)) {
      return res.status(403).json({ 
        error: 'Bạn không có quyền quản lý thành viên của đơn vị này.' 
      });
    }
    
    // Get current membership to check role
    const [[currentMembership]] = await db.execute(
      'SELECT role FROM unit_memberships WHERE user_id = ? AND unit_id = ?',
      [userId, unitId]
    );
    
    if (!currentMembership) {
      return res.status(404).json({ error: 'Membership không tồn tại.' });
    }
    
    // Prevent removing last dyc_admin
    if (unit.kind === 'platform_owner' && currentMembership.role === 'dyc_admin') {
      const [[countResult]] = await db.execute(
        'SELECT COUNT(*) as count FROM unit_memberships WHERE unit_id = ? AND role = ?',
        [unitId, 'dyc_admin']
      );
      
      if (countResult.count <= 1) {
        return res.status(409).json({
          error: 'Không thể xoá dyc_admin cuối cùng. Hãy chỉ định dyc_admin khác trước.'
        });
      }
    }
    
    // Remove membership
    await removeMembership(db, userId, unitId);
    
    // Legacy fallback: Set users.role to 'member' if no longer has TCKT membership
    // This ensures old code that reads users.role doesn't break (INV-AUTH-001)
    if (unit.code === TCKT_CODE) {
      const remainingMemberships = await listMemberships(db, userId);
      const hasTckt = remainingMemberships.some(m => m.code === TCKT_CODE);
      
      if (!hasTckt) {
        // No longer has TCKT membership - fallback to 'member'
        await setTcktRoleColumn(db, userId, 'member');
      }
    }
    
    // Audit log
    await recordAudit(db, {
      actorId: req.session.user.id,
      actorUnitId: req.unit?.id,
      action: 'membership.remove',
      targetType: 'user',
      targetId: userId,
      ownerUnitId: unitId,
      meta: { role: currentMembership.role, unit_code: unit.code }
    });
    
    res.json({ ok: true });
  }));

  return router;
}

module.exports = { createUnitRoutes, canManageUnit };
