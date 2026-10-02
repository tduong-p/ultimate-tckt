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
    const leader = await createUser(pool, { role: 'leader', team_id: teamId, is_lead: true });
    
    // Ghi nh?n lead ? c? user_teams
    try {
      await pool.execute('INSERT INTO user_teams(user_id, team_id, is_lead) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE is_lead=1', [leader.id, teamId]);
    } catch (_) {}

    const member = await createUser(pool, { role: 'member', team_id: teamId });
    const activityId = await createActivity(pool, { team_id: teamId, creator_id: leader.id, status: 'approved' });

    // G�n event_lead_id cho activity n?u b?ng activities c� c?t n�y
    try {
      await pool.execute('UPDATE activities SET event_lead_id=?, team_id=? WHERE id=?', [leader.id, teamId, activityId]);
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
    try { await pool.execute('UPDATE tasks SET team_id=? WHERE id=?', [teamId, dueToday]); } catch (_) {}
    
    const overdue = await createTask(pool, { activity_id: activityId, team_id: teamId, primary_assignee_id: member.id, assigned_by: leader.id });
    await pool.execute('UPDATE tasks SET deadline=? WHERE id=?', [overdueStr, overdue]);
    try { await pool.execute('UPDATE tasks SET team_id=? WHERE id=?', [teamId, overdue]); } catch (_) {}

    const inReview = await createTask(pool, { activity_id: activityId, team_id: teamId, primary_assignee_id: member.id, assigned_by: leader.id });
    await pool.execute("UPDATE tasks SET status='review', submitted_for_review_at=NOW(), deadline=? WHERE id=?", [todayStr, inReview]);
    try { await pool.execute('UPDATE tasks SET team_id=? WHERE id=?', [teamId, inReview]); } catch (_) {}

    // G�n primary_assignee v�o task_assignees cho dueToday v� overdue d? th?a m�n INNER JOIN task_assignees
    try {
      await pool.execute('INSERT IGNORE INTO task_assignees(task_id, user_id) VALUES (?, ?)', [dueToday, member.id]);
      await pool.execute('INSERT IGNORE INTO task_assignees(task_id, user_id) VALUES (?, ?)', [overdue, member.id]);
    } catch (_) {}

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
