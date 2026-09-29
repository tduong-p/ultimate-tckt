'use strict';

const { listMemberships, hasDycMembership } = require('../units/memberships');
const { TCKT_CODE } = require('../units/catalog');

const READ_METHODS = new Set(['GET', 'HEAD']);

/**
 * Compute legacy role for backward-compatible route guards.
 * Rules (from SPEC-UNIT-004 Task 4 line 776):
 * - GET/HEAD and has DYC membership → 'admin'
 * - Has TCKT membership → TCKT role
 * - Otherwise → null
 *
 * Does NOT depend on current_unit_id.
 *
 * @param {Array<{code:string, kind:string, role:string}>} memberships
 * @param {string} method - HTTP method
 * @returns {string|null}
 */
function legacyRole(memberships, method) {
  if (READ_METHODS.has(method) && hasDycMembership(memberships)) return 'admin';
  return (memberships || []).find(m => m.code === TCKT_CODE)?.role ?? null;
}

/**
 * Create middleware that attaches unit context to every request.
 * Must be placed after session middleware and after express.static.
 *
 * Sets: req.memberships, req.unit, req.unitRole, req.actor
 *
 * @param {import('mysql2/promise').Pool} db
 * @returns {Function} Express middleware
 */
function createUnitContextMiddleware(db) {
  return async function loadUnitContext(req, _res, next) {
    try {
      // Defaults for unauthenticated requests
      req.memberships = [];
      req.unit = null;
      req.unitRole = null;
      req.actor = null;

      const user = req.session && req.session.user;
      if (!user) return next();

      const memberships = await listMemberships(db, user.id);
      req.memberships = memberships;

      if (!memberships.length) {
        // User exists but has no active memberships
        req.actor = { ...user, role: legacyRole(memberships, req.method) };
        return next();
      }

      // Determine current unit: prefer session.current_unit_id if valid
      let current = null;
      if (req.session.current_unit_id) {
        current = memberships.find(m => m.unit_id === req.session.current_unit_id);
      }
      if (!current) {
        // Fallback to first membership; update session
        current = memberships[0];
        req.session.current_unit_id = current.unit_id;
      }

      req.unit = { id: current.unit_id, code: current.code, name: current.name, kind: current.kind };
      req.unitRole = current.role;
      req.actor = { ...user, role: legacyRole(memberships, req.method) };

      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Build session view object for API responses.
 * Computes user.role (legacy TCKT role) and user.is_devops (DYC membership).
 * @param {Object} req - Express request
 * @returns {{ user: Object|null, units: { current: Object|null, memberships: Array } }}
 */
function sessionView(req) {
  const user = req.session?.user;
  if (!user) {
    return { user: null, units: { current: null, memberships: [] } };
  }
  
  return {
    user: { 
      ...user, 
      role: legacyRole(req.memberships, 'GET') ?? user.role,
      is_devops: hasDycMembership(req.memberships) ? 1 : 0 
    },
    units: { 
      current: req.unit, 
      memberships: req.memberships 
    }
  };
}

// Alias for convenience (SPEC uses both names)
const createUnitContext = createUnitContextMiddleware;

module.exports = { createUnitContext, createUnitContextMiddleware, legacyRole, sessionView };
