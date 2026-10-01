'use strict';

const { TCKT_CODE, DYC_CODE, isValidRole } = require('./catalog');

/**
 * @typedef {Object} Membership
 * @property {number} unit_id
 * @property {string} code      — mã đơn vị ("TCKT", "BTV", ...)
 * @property {string} name      — tên đơn vị
 * @property {string} kind      — loại đơn vị (platform_owner, department, ...)
 * @property {string} role      — vai trò trong đơn vị
 */

/**
 * Look up org_units.id by code. Returns null if not found.
 * @param {import('mysql2/promise').Pool} db
 * @param {string} code
 * @returns {Promise<number|null>}
 */
async function unitIdByCode(db, code) {
  const [rows] = await db.execute('SELECT id FROM org_units WHERE code = ?', [code]);
  return rows.length ? rows[0].id : null;
}

/**
 * Get a single unit by id. Returns null if not found.
 * @param {import('mysql2/promise').Pool} db
 * @param {number} unitId
 * @returns {Promise<{id:number, code:string, name:string, kind:string, is_active:number}|null>}
 */
async function getUnit(db, unitId) {
  const [rows] = await db.execute('SELECT id, code, name, kind, is_active FROM org_units WHERE id = ?', [unitId]);
  return rows.length ? rows[0] : null;
}

/**
 * List all active memberships for a user, ordered by insertion order (m.id).
 * Only returns units where is_active = 1.
 * @param {import('mysql2/promise').Pool} db
 * @param {number} userId
 * @returns {Promise<Membership[]>}
 */
async function listMemberships(db, userId) {
  const [rows] = await db.execute(
    `SELECT m.unit_id, u.code, u.name, u.kind, m.role
     FROM unit_memberships m
     JOIN org_units u ON u.id = m.unit_id AND u.is_active = 1
     WHERE m.user_id = ?
     ORDER BY m.id`,
    [userId]
  );
  return rows;
}

/**
 * Insert or update a membership. Throws with status=400 if role is invalid for the unit's kind.
 * @param {import('mysql2/promise').Pool} db
 * @param {number} userId
 * @param {number} unitId
 * @param {string} role
 * @returns {Promise<void>}
 */
async function upsertMembership(db, userId, unitId, role) {
  const unit = await getUnit(db, unitId);
  if (!unit) {
    const err = new Error(`Unit ${unitId} not found`);
    err.status = 404;
    throw err;
  }
  if (!isValidRole(unit.kind, role)) {
    const err = new Error(`Role "${role}" is not valid for unit kind "${unit.kind}"`);
    err.status = 400;
    throw err;
  }
  await db.execute(
    'INSERT INTO unit_memberships(user_id, unit_id, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role = VALUES(role)',
    [userId, unitId, role]
  );
}

/**
 * Remove a membership. Returns true if a row was deleted, false otherwise.
 * @param {import('mysql2/promise').Pool} db
 * @param {number} userId
 * @param {number} unitId
 * @returns {Promise<boolean>}
 */
async function removeMembership(db, userId, unitId) {
  const [result] = await db.execute(
    'DELETE FROM unit_memberships WHERE user_id = ? AND unit_id = ?',
    [userId, unitId]
  );
  return result.affectedRows > 0;
}

/**
 * Read users.role, then upsert a TCKT membership with that role.
 * @param {import('mysql2/promise').Pool} db
 * @param {number} userId
 * @returns {Promise<void>}
 */
async function syncTcktMembershipFromRole(db, userId) {
  const [[user]] = await db.execute('SELECT role FROM users WHERE id = ?', [userId]);
  if (!user) return;
  const tcktId = await unitIdByCode(db, TCKT_CODE);
  if (!tcktId) return;
  await upsertMembership(db, userId, tcktId, user.role);
}

/**
 * Write users.role (the reverse direction of sync).
 * @param {import('mysql2/promise').Pool} db
 * @param {number} userId
 * @param {string} role
 * @returns {Promise<void>}
 */
async function setTcktRoleColumn(db, userId, role) {
  await db.execute('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
}

/**
 * Ensure that the given emails all have dyc_admin membership.
 * Creates or upgrades existing memberships. Only affects users that exist in the DB.
 * @param {import('mysql2/promise').Pool} db
 * @param {string[]} emails
 * @returns {Promise<number>} number of users affected
 */
async function ensureDycAdmins(db, emails) {
  const list = [...new Set((emails || []).map(e => String(e).trim().toLowerCase()).filter(Boolean))];
  if (!list.length) return 0;
  const dycId = await unitIdByCode(db, DYC_CODE);
  if (!dycId) return 0;
  const [users] = await db.query('SELECT id FROM users WHERE LOWER(email) IN (?)', [list]);
  for (const user of users) await upsertMembership(db, user.id, dycId, 'dyc_admin');
  return users.length;
}

/**
 * Check if a user has a membership in a platform_owner unit (DYC).
 * Pure function — no DB query.
 * @param {Membership[]} memberships
 * @returns {boolean}
 */
const hasDycMembership = memberships => (memberships || []).some(x => x.kind === 'platform_owner');

/**
 * Check if a user has a membership in TCKT (code = 'TCKT').
 * Pure function — no DB query.
 * @param {Membership[]} memberships
 * @returns {boolean}
 */
const hasTcktMembership = memberships => (memberships || []).some(x => x.code === TCKT_CODE);

module.exports = { unitIdByCode, getUnit, listMemberships, upsertMembership, removeMembership, syncTcktMembershipFromRole, setTcktRoleColumn, ensureDycAdmins, hasDycMembership, hasTcktMembership };
