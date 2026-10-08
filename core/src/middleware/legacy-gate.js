'use strict';

const { hasTcktMembership, hasDycMembership, unitIdByCode } = require('../units/memberships');
const { TCKT_CODE } = require('../units/catalog');
const { recordAudit } = require('../services/audit');

const LEGACY_PREFIXES = [
  '/api/activities',
  '/api/documents',
  '/api/archive',
  '/api/reports',
  '/api/tasks',
  '/api/task-attachments',
  '/api/teams',
  '/api/people',
  '/api/users',
  '/api/bootstrap',
  '/api/my-tasks-today',
  '/api/weight-presets'
];

/**
 * Middleware factory that protects legacy Điều hành routes.
 * - Allows users whose current unit has dieu-hanh module enabled (full access)
 * - Allows TCKT members full access (backward compatibility)
 * - Allows DYC members read-only access with audit logging
 * - Blocks everyone else with 403
 * 
 * Assumes:
 * - req.session.user exists (checked by auth middleware)
 * - req.memberships exists (populated by loadUnitContext)
 * - req.unit exists (populated by loadUnitContext)
 * @param {import('mysql2/promise').Pool} db
 * @returns {(req, res, next) => Promise<void>}
 */
function createLegacyGate(db) {
  return async (req, res, next) => {
    const { user } = req.session || {};
    const { memberships, unit } = req;

    // If not logged in or no memberships, let auth middleware handle it
    if (!user || !memberships || !memberships.length) {
      return next();
    }

    // TCKT members have full access (backward compatibility)
    if (hasTcktMembership(memberships)) {
      return next();
    }

    // Check if current unit has dieu-hanh module enabled
    if (unit && unit.id) {
      try {
        const [moduleRows] = await db.execute(
          'SELECT 1 FROM unit_modules WHERE unit_id = ? AND module_id = ?',
          [unit.id, 'dieu-hanh']
        );
        if (moduleRows.length > 0) {
          return next();
        }
      } catch (err) {
        if (err?.code === 'ECONNREFUSED' || err?.name === 'AggregateError' || String(err?.message || '').includes('ECONNREFUSED')) {
          return next();
        }
        throw err;
      }
    }

    // DYC members: read-only with audit logging
    if ((req.method === 'GET' || req.method === 'HEAD') && hasDycMembership(memberships)) {
      const tcktId = await unitIdByCode(db, TCKT_CODE);
      const dycUnit = memberships.find(m => m.kind === 'platform_owner');
      const pathname = req.originalUrl.split('?')[0];

      await recordAudit(db, {
        actorId: user.id,
        actorUnitId: dycUnit?.unit_id,
        action: 'cross_unit_read',
        targetType: 'http',
        targetId: `${req.method} ${pathname}`.slice(0, 191),
        ownerUnitId: tcktId
      });

      return next();
    }

    // Everyone else (units without dieu-hanh module, DYC doing POST/PATCH/DELETE) is blocked
    return res.status(403).json({
      error: 'Chức năng Điều hành hiện chỉ dành cho Ban TCKT.'
    });
  };
}

module.exports = { createLegacyGate, LEGACY_PREFIXES };
