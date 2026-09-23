'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createTeam, createUser, createActivity } = require('./helpers/fixtures');

test('vice_admin has executive powers to approve activities and bypass self-review', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const teamId = await createTeam(pool);
    const viceAdmin = await createUser(pool, { role: 'vice_admin', team_id: teamId });
    const leader = await createUser(pool, { role: 'leader', team_id: teamId, is_lead: true });
    
    // Leader proposes activity
    await client.login(leader.email, leader.password);
    const actRes = await client.request('POST', '/api/activities', {
      body: {
        title: 'Hoạt động do Leader tạo',
        description: 'Mô tả hoạt động',
        type: 'event',
        team_id: teamId,
        team_ids: [teamId],
        deadline: '2026-12-31'
      }
    });
    assert.equal(actRes.status, 201);
    const activityId = actRes.json.id;

    // vice_admin approves activity
    await client.login(viceAdmin.email, viceAdmin.password);
    const approveRes = await client.request('POST', `/api/activities/${activityId}/approve`, {});
    assert.equal(approveRes.status, 200);

    // vice_admin assigns task to vice_admin themselves (self-assigned)
    const taskRes = await client.request('POST', `/api/activities/${activityId}/tasks`, {
      body: {
        title: 'Task của Phó Ban',
        team_id: teamId,
        deadline: '2026-12-31',
        primary_assignee_id: viceAdmin.id
      }
    });
    assert.equal(taskRes.status, 201);
    const taskId = taskRes.json.id;

    // vice_admin submits task for review
    const submitRes = await client.request('POST', `/api/tasks/${taskId}/submit-review`, {
      body: { link_url: 'https://drive.google.com/test' }
    });
    assert.equal(submitRes.status, 201);

    // vice_admin BYPASSES Anti-Self-Review and approves their own task!
    const reviewRes = await client.request('POST', `/api/tasks/${taskId}/review`, {
      body: { decision: 'approve' }
    });
    assert.equal(reviewRes.status, 200);

    const [[taskRow]] = await pool.query('SELECT status FROM tasks WHERE id=?', [taskId]);
    assert.equal(taskRow.status, 'done');
  } finally {
    await close();
    await teardown();
  }
});

test('team leader can bypass anti-self-review for tasks in their own team', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const teamId = await createTeam(pool);
    const adminUser = await createUser(pool, { role: 'admin' });
    const leader = await createUser(pool, { role: 'leader', team_id: teamId, is_lead: true });
    const activityId = await createActivity(pool, { team_id: teamId, creator_id: adminUser.id, status: 'approved' });

    // leader assigns task to self
    await client.login(leader.email, leader.password);
    const taskRes = await client.request('POST', `/api/activities/${activityId}/tasks`, {
      body: {
        title: 'Task của Tổ trưởng',
        team_id: teamId,
        deadline: '2026-12-31',
        primary_assignee_id: leader.id
      }
    });
    assert.equal(taskRes.status, 201);
    const taskId = taskRes.json.id;

    // leader submits review
    const submitRes = await client.request('POST', `/api/tasks/${taskId}/submit-review`, {
      body: { link_url: 'https://drive.google.com/leader-test' }
    });
    assert.equal(submitRes.status, 201);

    // leader BYPASSES anti-self-review
    const reviewRes = await client.request('POST', `/api/tasks/${taskId}/review`, {
      body: { decision: 'approve' }
    });
    assert.equal(reviewRes.status, 200);

    const [[taskRow]] = await pool.query('SELECT status FROM tasks WHERE id=?', [taskId]);
    assert.equal(taskRow.status, 'done');
  } finally {
    await close();
    await teardown();
  }
});

test('regular member CANNOT bypass anti-self-review (strictly forbidden)', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const teamId = await createTeam(pool);
    const leader = await createUser(pool, { role: 'leader', team_id: teamId, is_lead: true });
    const member = await createUser(pool, { role: 'member', team_id: teamId });
    const activityId = await createActivity(pool, { team_id: teamId, creator_id: leader.id, status: 'approved' });

    // leader assigns task to member
    await client.login(leader.email, leader.password);
    const taskRes = await client.request('POST', `/api/activities/${activityId}/tasks`, {
      body: {
        title: 'Task của Member',
        team_id: teamId,
        deadline: '2026-12-31',
        primary_assignee_id: member.id
      }
    });
    assert.equal(taskRes.status, 201);
    const taskId = taskRes.json.id;

    // member submits review
    await client.login(member.email, member.password);
    const submitRes = await client.request('POST', `/api/tasks/${taskId}/submit-review`, {
      body: { link_url: 'https://drive.google.com/member-test' }
    });
    assert.equal(submitRes.status, 201);

    // member attempts to self-review -> MUST BE REJECTED 403!
    const reviewRes = await client.request('POST', `/api/tasks/${taskId}/review`, {
      body: { decision: 'approve' }
    });
    assert.equal(reviewRes.status, 403);
  } finally {
    await close();
    await teardown();
  }
});

test('vice_leader can propose activities and bypass anti-self-review in their own team, but cannot approve activities', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const teamId = await createTeam(pool);
    const viceLeader = await createUser(pool, { role: 'vice_leader', team_id: teamId });

    // 1. vice_leader can propose activity
    await client.login(viceLeader.email, viceLeader.password);
    const actRes = await client.request('POST', '/api/activities', {
      body: {
        title: 'Hoạt động do Tổ phó tạo',
        description: 'Kế hoạch chuyên môn',
        type: 'event',
        team_id: teamId,
        team_ids: [teamId],
        deadline: '2026-12-31'
      }
    });
    assert.equal(actRes.status, 201);
    const activityId = actRes.json.id;

    // 2. vice_leader CANNOT approve activity (only executive can approve)
    const approveRes = await client.request('POST', `/api/activities/${activityId}/approve`, {});
    assert.equal(approveRes.status, 403);

    // Let admin approve activity so tasks can be created
    const adminUser = await createUser(pool, { role: 'admin' });
    await client.login(adminUser.email, adminUser.password);
    const adminApproveRes = await client.request('POST', `/api/activities/${activityId}/approve`, {});
    assert.equal(adminApproveRes.status, 200);

    // 3. vice_leader assigns task to self
    await client.login(viceLeader.email, viceLeader.password);
    const taskRes = await client.request('POST', `/api/activities/${activityId}/tasks`, {
      body: {
        title: 'Task do Tổ phó tự làm',
        team_id: teamId,
        deadline: '2026-12-31',
        primary_assignee_id: viceLeader.id
      }
    });
    assert.equal(taskRes.status, 201);
    const taskId = taskRes.json.id;

    // 4. vice_leader submits review
    const submitRes = await client.request('POST', `/api/tasks/${taskId}/submit-review`, {
      body: { link_url: 'https://drive.google.com/vice-leader-test' }
    });
    assert.equal(submitRes.status, 201);

    // 5. vice_leader BYPASSES anti-self-review for task in own team!
    const reviewRes = await client.request('POST', `/api/tasks/${taskId}/review`, {
      body: { decision: 'approve' }
    });
    assert.equal(reviewRes.status, 200);

    const [[taskRow]] = await pool.query('SELECT status FROM tasks WHERE id=?', [taskId]);
    assert.equal(taskRow.status, 'done');
  } finally {
    await close();
    await teardown();
  }
});

