'use strict';
const { TCKT_CODE, DYC_CODE, isValidRole } = require('./catalog');

async function unitIdByCode(db, code) {
  const [rows] = await db.execute('SELECT id FROM org_units WHERE code=?', [code]);
  return rows[0]?.id ?? null;
}

async function getUnit(db, unitId) {
  const [rows] = await db.execute('SELECT id,code,name,kind,is_active FROM org_units WHERE id=?', [unitId]);
  return rows[0] || null;
}

async function listMemberships(db, userId) {
  const [rows] = await db.execute(
    `SELECT m.unit_id, u.code, u.name, u.kind, m.role
     FROM unit_memberships m JOIN org_units u ON u.id=m.unit_id AND u.is_active=1
     WHERE m.user_id=? ORDER BY m.id`,
    [userId]
  );
  return rows.map(r => ({ unit_id: r.unit_id, code: r.code, name: r.name, kind: r.kind, role: r.role }));
}

async function upsertMembership(db, userId, unitId, role) {
  const unit = await getUnit(db, unitId);
  if (!unit || !isValidRole(unit.kind, role)) {
    const error = new Error(`Vai trò "${role}" không hợp lệ cho đơn vị này.`);
    error.status = 400;
    throw error;
  }
  await db.execute(
    'INSERT INTO unit_memberships(user_id,unit_id,role) VALUES (?,?,?) ON DUPLICATE KEY UPDATE role=VALUES(role)',
    [userId, unitId, role]
  );
}

async function removeMembership(db, userId, unitId) {
  const [result] = await db.execute('DELETE FROM unit_memberships WHERE user_id=? AND unit_id=?', [userId, unitId]);
  return result.affectedRows > 0;
}

// users.role là bản sao role TCKT trong GĐ1 (xoá ở GĐ2). Mọi đường ghi users.role gọi hàm này.
async function syncTcktMembershipFromRole(db, userId) {
  const [rows] = await db.execute('SELECT role FROM users WHERE id=?', [userId]);
  if (!rows.length) return;
  await upsertMembership(db, userId, await unitIdByCode(db, TCKT_CODE), rows[0].role);
}

async function setTcktRoleColumn(db, userId, role) {
  await db.execute('UPDATE users SET role=? WHERE id=?', [role, userId]);
}

async function ensureDycAdmins(db, emails) {
  const list = [...new Set((emails || []).map(e => String(e).trim().toLowerCase()).filter(Boolean))];
  if (!list.length) return 0;
  const dycId = await unitIdByCode(db, DYC_CODE);
  const [users] = await db.query('SELECT id FROM users WHERE LOWER(email) IN (?)', [list]);
  for (const user of users) await upsertMembership(db, user.id, dycId, 'dyc_admin');
  return users.length;
}

const hasDycMembership = memberships => (memberships || []).some(x => x.kind === 'platform_owner');

module.exports = { unitIdByCode, getUnit, listMemberships, upsertMembership, removeMembership, syncTcktMembershipFromRole, setTcktRoleColumn, ensureDycAdmins, hasDycMembership };
