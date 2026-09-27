'use strict';
const { listMemberships, hasDycMembership } = require('../units/memberships');
const { TCKT_CODE } = require('../units/catalog');

const READ_METHODS = new Set(['GET', 'HEAD']);

// Role "kiểu cũ" (5 role TCKT) cho route Điều hành trong core/src/routes/*.
// DYC đọc như admin (D4), ghi thì chỉ bằng role TCKT của chính mình.
function legacyRole(memberships, method) {
  if (READ_METHODS.has(method) && hasDycMembership(memberships)) return 'admin';
  return (memberships || []).find(m => m.code === TCKT_CODE)?.role ?? null;
}

const unitView = m => m && { id: m.unit_id, code: m.code, name: m.name, kind: m.kind };

function createUnitContext(db) {
  return async function loadUnitContext(req, _res, next) {
    try {
      req.memberships = [];
      req.unit = null;
      req.unitRole = null;
      req.actor = null;
      const user = req.session?.user;
      if (!user) return next();
      req.memberships = await listMemberships(db, user.id);
      let current = req.memberships.find(m => m.unit_id === Number(req.session.current_unit_id));
      if (!current && req.memberships.length) {
        current = req.memberships[0];
        req.session.current_unit_id = current.unit_id;
      }
      req.unit = unitView(current) || null;
      req.unitRole = current?.role ?? null;
      req.actor = { ...user, role: legacyRole(req.memberships, req.method) };
      next();
    } catch (error) {
      next(error);
    }
  };
}

function sessionView(req) {
  const user = req.session?.user;
  if (!user) return { user: null, units: { current: null, memberships: [] } };
  return {
    user: { ...user, role: legacyRole(req.memberships, 'GET') ?? user.role, is_devops: hasDycMembership(req.memberships) ? 1 : 0 },
    units: { current: req.unit, memberships: req.memberships }
  };
}

module.exports = { createUnitContext, legacyRole, sessionView };
