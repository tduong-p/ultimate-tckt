'use strict';
// SPEC-PILOT-001 c4 — "hôm nay" tính theo giờ Việt Nam, không theo UTC của server.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { createTeam, createUser, createActivity, createTask } = require('./helpers/fixtures');
const { findOverdueTasks, findUpcomingDeadlines } = require('../src/services/deadline-notifications');

test('c4: dateInVietnam switches day at 17:00 UTC', () => {
  const { dateInVietnam } = require('../src/date-vn');
  assert.equal(dateInVietnam(new Date('2030-06-15T16:59:00Z')), '2030-06-15');
  assert.equal(dateInVietnam(new Date('2030-06-15T17:00:00Z')), '2030-06-16');
});

async function taskWithDeadline(pool, deadline) {
  const teamId = await createTeam(pool);
  const admin = await createUser(pool, { role: 'admin' });
  const member = await createUser(pool, { role: 'member', team_id: teamId });
  const activityId = await createActivity(pool, { team_id: teamId, creator_id: admin.id, status: 'approved' });
  const taskId = await createTask(pool, { activity_id: activityId, team_id: teamId, primary_assignee_id: member.id, assigned_by: admin.id });
  await pool.execute('UPDATE tasks SET deadline=? WHERE id=?', [deadline, taskId]);
  return taskId;
}

test('c4: a task due today (Vietnam date) is not overdue at 09:00 Vietnam time', async () => {
  const { pool, teardown } = await createTestDatabase();
  try {
    const dueToday = await taskWithDeadline(pool, '2030-06-16');
    const dueYesterday = await taskWithDeadline(pool, '2030-06-15');
    const rows = await findOverdueTasks(pool, new Date('2030-06-16T02:00:00Z'));
    const ids = rows.map(r => r.task_id);
    assert.ok(!ids.includes(dueToday), 'due today must not be overdue');
    assert.ok(ids.includes(dueYesterday), 'due yesterday must be overdue');
  } finally { await teardown(); }
});

test('c4: a task due tomorrow (Vietnam date) is upcoming at 03:00 Vietnam time', async () => {
  const { pool, teardown } = await createTestDatabase();
  try {
    const dueTomorrow = await taskWithDeadline(pool, '2030-06-17');
    const rows = await findUpcomingDeadlines(pool, new Date('2030-06-15T20:00:00Z'));
    assert.ok(rows.map(r => r.task_id).includes(dueTomorrow));
  } finally { await teardown(); }
});
