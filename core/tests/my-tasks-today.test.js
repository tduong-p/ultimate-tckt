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
    const member = await createUser(pool, { role: 'member', team_id: teamId });
    const activityId = await createActivity(pool, { team_id: teamId, creator_id: leader.id, status: 'approved' });
    
    // Tính toán ngày dạng YYYY-MM-DD theo giờ local để tránh lệch múi giờ trên CI (UTC)
    const now = new Date();
    const formatDate = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const todayStr = formatDate(now);
    
    // Lùi về 3 ngày để đảm bảo chắc chắn là overdue và không bị lệch múi giờ
    const overdueDate = new Date();
    overdueDate.setDate(now.getDate() - 3);
    const overdueStr = formatDate(overdueDate);

    const dueToday = await createTask(pool, { activity_id: activityId, team_id: teamId, primary_assignee_id: member.id, assigned_by: leader.id });
    await pool.execute('UPDATE tasks SET deadline=? WHERE id=?', [todayStr, dueToday]);
    
    const overdue = await createTask(pool, { activity_id: activityId, team_id: teamId, primary_assignee_id: member.id, assigned_by: leader.id });
    await pool.execute('UPDATE tasks SET deadline=? WHERE id=?', [overdueStr, overdue]);
    
    const inReview = await createTask(pool, { activity_id: activityId, team_id: teamId, primary_assignee_id: member.id, assigned_by: leader.id });
    await pool.execute("UPDATE tasks SET status='review' WHERE id=?", [inReview]);

    await client.login(member.email, member.password);
    const memberView = await client.request('GET', '/api/my-tasks-today');
    assert.equal(memberView.status, 200);
    assert.equal(memberView.json.dueToday.length, 1);
    assert.equal(memberView.json.overdue.length, 1);
    assert.equal(memberView.json.pendingMyReview.length, 0);

    await client.login(leader.email, leader.password);
    const leaderView = await client.request('GET', '/api/my-tasks-today');
    assert.equal(leaderView.json.pendingMyReview.length, 1);
    assert.equal(leaderView.json.pendingMyReview[0].id, inReview);
  } finally { await close(); await teardown(); }
});
