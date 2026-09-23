const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { createTeam, createUser, createActivity, createTask } = require('./helpers/fixtures');
const logger = require('../src/logger');
const push = require('../src/push');
const { runDeadlineNotifications } = require('../src/services/deadline-notifications');

test('overdue and unacknowledged tasks each produce one notification, idempotently', async () => {
  const { pool, teardown } = await createTestDatabase();
  try {
    const teamId = await createTeam(pool);
    const leader = await createUser(pool, { role: 'leader', team_id: teamId, is_lead: true });
    const member = await createUser(pool, { role: 'member', team_id: teamId });
    const activityId = await createActivity(pool, { team_id: teamId, creator_id: leader.id, status: 'approved' });
    const taskId = await createTask(pool, { activity_id: activityId, team_id: teamId, primary_assignee_id: member.id, assigned_by: leader.id });
    await pool.execute('UPDATE tasks SET deadline=DATE_SUB(CURDATE(), INTERVAL 2 DAY) WHERE id=?', [taskId]);
    await pool.execute('UPDATE task_assignees SET assigned_at=DATE_SUB(NOW(), INTERVAL 30 HOUR) WHERE task_id=?', [taskId]);

    const first = await runDeadlineNotifications({ db: pool, push, logger });
    const [[overdueCount]] = await pool.query("SELECT COUNT(*) c FROM notifications WHERE kind='task_overdue'", []);
    const [[unackCount]] = await pool.query("SELECT COUNT(*) c FROM notifications WHERE kind='task_unacknowledged'", []);
    assert.equal(Number(overdueCount.c), 1);
    assert.equal(Number(unackCount.c), 1);

    const second = await runDeadlineNotifications({ db: pool, push, logger });
    const [[overdueCountAfter]] = await pool.query("SELECT COUNT(*) c FROM notifications WHERE kind='task_overdue'", []);
    assert.equal(Number(overdueCountAfter.c), 1, 'should not duplicate on a second run the same day');
    assert.ok(first.created >= 2);
    assert.equal(second.created, 0);
  } finally { await teardown(); }
});
