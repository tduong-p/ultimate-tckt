const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createTeam, createUser, createActivity, createTask } = require('./helpers/fixtures');

test('my-tasks-today separates due-today, overdue, and (for leads) pending review', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const teamId = await createTeam(pool);
    // Role admin d?m b?o isExecutive(user) === true d? th?a m�n (? = 1) trong SQL query
    const leader = await createUser(pool, { role: 'admin', team_id: teamId, is_lead: true });
    const member = await createUser(pool, { role: 'member', team_id: teamId });
    
    const activityId = await createActivity(pool, { team_id: teamId, creator_id: leader.id, status: 'approved' });
    try {
      await pool.execute('UPDATE activities SET event_lead_id=? WHERE id=?', [leader.id, activityId]);
    } catch (_) {}

    try {
      await pool.execute('INSERT INTO user_teams(user_id, team_id, is_lead) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE is_lead=1', [leader.id, teamId]);
    } catch (_) {}

    const now = new Date();
    const formatDate = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const todayStr = formatDate(now);
    const overdueDate = new Date();
    overdueDate.setDate(now.getDate() - 3);
    const overdueStr = formatDate(overdueDate);

    const dueToday = await createTask(pool, { activity_id: activityId, team_id: teamId, primary_assignee_id: member.id, assigned_by: leader.id });
    await pool.execute('UPDATE tasks SET deadline=? WHERE id=?', [todayStr, dueToday]);
    try { await pool.execute('INSERT IGNORE INTO task_assignees(task_id, user_id) VALUES (?, ?)', [dueToday, member.id]); } catch (_) {}
    
    const overdue = await createTask(pool, { activity_id: activityId, team_id: teamId, primary_assignee_id: member.id, assigned_by: leader.id });
    await pool.execute('UPDATE tasks SET deadline=? WHERE id=?', [overdueStr, overdue]);
    try { await pool.execute('INSERT IGNORE INTO task_assignees(task_id, user_id) VALUES (?, ?)', [overdue, member.id]); } catch (_) {}

    const inReview = await createTask(pool, { activity_id: activityId, team_id: teamId, primary_assignee_id: member.id, assigned_by: leader.id });
    await pool.execute("UPDATE tasks SET status='review', submitted_for_review_at=NOW() WHERE id=?", [inReview]);
    try { await pool.execute('UPDATE tasks SET team_id=? WHERE id=?', [teamId, inReview]); } catch (_) {}

    await client.login(member.email, member.password);
    const memberView = await client.request('GET', '/api/my-tasks-today');
    assert.equal(memberView.status, 200);
    assert.equal(memberView.json.dueToday.length, 1);
    assert.equal(memberView.json.overdue.length, 1);
    assert.equal(memberView.json.pendingMyReview.length, 0);

    await client.login(leader.email, leader.password);
    const leaderView = await client.request('GET', '/api/my-tasks-today');
    assert.equal(leaderView.status, 200);
    assert.equal(leaderView.json.pendingMyReview.length, 1);
    assert.equal(leaderView.json.pendingMyReview[0].id, inReview);
  } finally { await close(); await teardown(); }
});
