'use strict';
const { hasDycMembership, unitIdByCode } = require('../units/memberships');
const { TCKT_CODE } = require('../units/catalog');
const { recordAudit } = require('../services/audit');

// Route Điều hành "kiểu cũ" — dữ liệu của TCKT. /api/admin/weight-presets KHÔNG ở đây:
// nó là setting do settingGuard quản (Task 7).
const LEGACY_PREFIXES = [
  '/api/activities', '/api/documents', '/api/archive', '/api/reports', '/api/tasks',
  '/api/task-attachments', '/api/teams', '/api/people', '/api/users',
  '/api/bootstrap', '/api/my-tasks-today', '/api/weight-presets'
];

function createLegacyGate(db) {
  let tcktId = null;
  return async function legacyGate(req, res, next) {
    try {
      const memberships = req.memberships || [];
      if (!req.session?.user || !memberships.length) return next();
      if (memberships.some(m => m.code === TCKT_CODE)) return next();
      if ((req.method === 'GET' || req.method === 'HEAD') && hasDycMembership(memberships)) {
        tcktId ??= await unitIdByCode(db, TCKT_CODE);
        await recordAudit(db, {
          actorId: req.session.user.id,
          actorUnitId: memberships.find(m => m.kind === 'platform_owner').unit_id,
          action: 'cross_unit_read',
          targetType: 'http',
          targetId: `${req.method} ${req.originalUrl.split('?')[0]}`,
          ownerUnitId: tcktId
        });
        return next();
      }
      res.status(403).json({ error: 'Chức năng Điều hành hiện chỉ dành cho Ban TCKT.' });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { LEGACY_PREFIXES, createLegacyGate };
