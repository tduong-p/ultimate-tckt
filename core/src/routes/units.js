'use strict';
const express = require('express');
const { UNIT_ROLES, TCKT_CODE, isUnitAdmin } = require('../units/catalog');
const { getUnit, upsertMembership, removeMembership, setTcktRoleColumn, hasDycMembership } = require('../units/memberships');
const { recordAudit } = require('../services/audit');

function canManageUnit(memberships, unit) {
  const dyc = memberships.find(m => m.kind === 'platform_owner');
  if (dyc && (unit.kind !== 'platform_owner' || dyc.role === 'dyc_admin')) return true;
  const own = memberships.find(m => m.unit_id === unit.id);
  return Boolean(own && isUnitAdmin(own.kind, own.role));
}

function createUnitRoutes(context) {
  const { db, auth, asyncRoute } = context;
  const router = express.Router();

  const loadUnit = async (req, res) => {
    const unit = await getUnit(db, Number(req.params.id));
    if (!unit) { res.status(404).json({ error: 'Đơn vị không tồn tại.' }); return null; }
    return unit;
  };
  const actorUnitId = (req, unit) => (req.memberships.find(m => m.unit_id === unit.id) || req.memberships.find(m => m.kind === 'platform_owner'))?.unit_id ?? null;
  const isLastDycAdmin = async unitId => {
    const [[{ c }]] = await db.execute("SELECT COUNT(*) c FROM unit_memberships WHERE unit_id=? AND role='dyc_admin'", [unitId]);
    return c <= 1;
  };

  router.get('/api/units', auth, asyncRoute(async (req, res) => {
    const isDyc = hasDycMembership(req.memberships);
    const mine = req.memberships.map(m => m.unit_id);
    const [rows] = await db.query(
      `SELECT u.id, u.code, u.name, u.kind, u.is_active, COUNT(m.user_id) member_count
       FROM org_units u LEFT JOIN unit_memberships m ON m.unit_id=u.id
       ${isDyc ? '' : 'WHERE u.id IN (?)'} GROUP BY u.id ORDER BY u.id`,
      isDyc ? [] : [mine]
    );
    res.json(rows.map(r => ({ ...r, roles: UNIT_ROLES[r.kind] })));
  }));

  router.get('/api/units/:id/members', auth, asyncRoute(async (req, res) => {
    const unit = await loadUnit(req, res); if (!unit) return;
    if (!hasDycMembership(req.memberships) && !req.memberships.some(m => m.unit_id === unit.id)) return res.status(403).json({ error: 'Bạn không thuộc đơn vị này.' });
    const [rows] = await db.execute(
      'SELECT m.user_id, u.name, u.email, m.role FROM unit_memberships m JOIN users u ON u.id=m.user_id WHERE m.unit_id=? ORDER BY u.name',
      [unit.id]
    );
    res.json(rows);
  }));

  router.put('/api/units/:id/members/:userId', auth, asyncRoute(async (req, res) => {
    const unit = await loadUnit(req, res); if (!unit) return;
    if (!canManageUnit(req.memberships, unit)) return res.status(403).json({ error: 'Bạn không quản lý đơn vị này.' });
    const userId = Number(req.params.userId);
    const [[user]] = await db.execute('SELECT id FROM users WHERE id=?', [userId]);
    if (!user) return res.status(404).json({ error: 'Không tìm thấy tài khoản.' });
    const role = String(req.body.role || '');
    const [[previous]] = await db.execute('SELECT role FROM unit_memberships WHERE user_id=? AND unit_id=?', [userId, unit.id]);
    if (previous?.role === 'dyc_admin' && role !== 'dyc_admin' && await isLastDycAdmin(unit.id)) {
      return res.status(409).json({ error: 'Không thể gỡ dyc_admin cuối cùng.' });
    }
    try { await upsertMembership(db, userId, unit.id, role); } catch (e) { if (e.status === 400) return res.status(400).json({ error: e.message }); throw e; }
    if (unit.code === TCKT_CODE) await setTcktRoleColumn(db, userId, role);
    await recordAudit(db, { actorId: req.session.user.id, actorUnitId: actorUnitId(req, unit), action: 'membership.upsert', targetType: 'user', targetId: userId, ownerUnitId: unit.id, meta: { role, previous_role: previous?.role ?? null } });
    res.json({ ok: true });
  }));

  router.delete('/api/units/:id/members/:userId', auth, asyncRoute(async (req, res) => {
    const unit = await loadUnit(req, res); if (!unit) return;
    if (!canManageUnit(req.memberships, unit)) return res.status(403).json({ error: 'Bạn không quản lý đơn vị này.' });
    const userId = Number(req.params.userId);
    const [[current]] = await db.execute('SELECT role FROM unit_memberships WHERE user_id=? AND unit_id=?', [userId, unit.id]);
    if (!current) return res.status(404).json({ error: 'Tài khoản không thuộc đơn vị này.' });
    if (current.role === 'dyc_admin' && await isLastDycAdmin(unit.id)) {
      return res.status(409).json({ error: 'Không thể gỡ dyc_admin cuối cùng.' });
    }
    await removeMembership(db, userId, unit.id);
    if (unit.code === TCKT_CODE) await setTcktRoleColumn(db, userId, 'member');
    await recordAudit(db, { actorId: req.session.user.id, actorUnitId: actorUnitId(req, unit), action: 'membership.remove', targetType: 'user', targetId: userId, ownerUnitId: unit.id, meta: { previous_role: current.role } });
    res.json({ ok: true });
  }));

  return router;
}

module.exports = { createUnitRoutes, canManageUnit };
