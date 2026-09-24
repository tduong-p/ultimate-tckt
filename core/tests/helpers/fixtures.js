'use strict';
const bcrypt = require('bcryptjs');

async function createTeam(pool, overrides = {}) {
  const [result] = await pool.execute(
    'INSERT INTO teams(name,description,color) VALUES (?,?,?)',
    [overrides.name || `Ban thử nghiệm ${Date.now()}`, overrides.description || null, overrides.color || '#1E3A8A']
  );
  return result.insertId;
}

async function createUser(pool, overrides = {}) {
  const email = overrides.email || `user${Date.now()}${Math.random().toString(36).slice(2)}@example.com`;
  const passwordHash = await bcrypt.hash(overrides.password || 'MatKhauTest2026!', 10);
  const [result] = await pool.execute(
    'INSERT INTO users(name,email,password_hash,role,auth_provider,is_active) VALUES (?,?,?,?,?,1)',
    [
      overrides.name || `Người dùng ${Date.now()}`,
      email,
      passwordHash,
      overrides.role || 'member',
      overrides.auth_provider || 'local'
    ]
  );
  if (overrides.team_id) {
    const isLead = overrides.is_lead !== undefined ? (overrides.is_lead ? 1 : 0) : (overrides.role === 'leader' ? 1 : 0);
    const isViceLead = overrides.is_vice_lead !== undefined ? (overrides.is_vice_lead ? 1 : 0) : (overrides.role === 'vice_leader' ? 1 : 0);
    await pool.execute(
      'INSERT INTO user_teams(user_id,team_id,is_lead,is_vice_lead) VALUES (?,?,?,?)',
      [result.insertId, overrides.team_id, isLead, isViceLead]
    );
  }
  const units = overrides.units ?? [['TCKT', overrides.role || 'member']];
  for (const [code, role] of units) await addMembership(pool, result.insertId, code, role);
  return { id: result.insertId, email, password: overrides.password || 'MatKhauTest2026!' };
}

async function createActivity(pool, overrides = {}) {
  const [result] = await pool.execute(
    `INSERT INTO activities(title,description,type,status,team_id,creator_id,event_lead_id,deadline)
     VALUES (?,?,?,?,?,?,?,DATE_ADD(CURDATE(), INTERVAL 14 DAY))`,
    [
      overrides.title || 'Hoạt động thử nghiệm',
      overrides.description || 'Mô tả thử nghiệm',
      overrides.type || 'event',
      overrides.status || 'proposed',
      overrides.team_id,
      overrides.creator_id,
      overrides.event_lead_id || null
    ]
  );
  await pool.execute(
    "INSERT INTO activity_teams(activity_id,team_id,role) VALUES (?,?,'primary')",
    [result.insertId, overrides.team_id]
  );
  return result.insertId;
}

async function createTask(pool, overrides = {}) {
  const [result] = await pool.execute(
    `INSERT INTO tasks(activity_id,title,team_id,primary_assignee_id,assigned_by,status,deadline)
     VALUES (?,?,?,?,?,?,DATE_ADD(CURDATE(), INTERVAL 7 DAY))`,
    [overrides.activity_id, overrides.title || 'Nhiệm vụ thử nghiệm', overrides.team_id, overrides.primary_assignee_id || null, overrides.assigned_by || null, overrides.status || 'todo']
  );
  if (overrides.primary_assignee_id) {
    await pool.execute(
      'INSERT INTO task_assignees(task_id,user_id,is_primary) VALUES (?,?,1)',
      [result.insertId, overrides.primary_assignee_id]
    );
  }
  return result.insertId;
}

async function unitIdByCode(pool, code) {
  const [rows] = await pool.execute('SELECT id FROM org_units WHERE code=?', [code]);
  if (!rows.length) throw new Error(`Unknown unit ${code}`);
  return rows[0].id;
}

async function addMembership(pool, userId, code, role) {
  await pool.execute(
    'INSERT INTO unit_memberships(user_id,unit_id,role) VALUES (?,?,?) ON DUPLICATE KEY UPDATE role=VALUES(role)',
    [userId, await unitIdByCode(pool, code), role]
  );
}

module.exports = { createTeam, createUser, createActivity, createTask, unitIdByCode, addMembership };
