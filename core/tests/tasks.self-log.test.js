'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createTeam, createUser, createActivity } = require('./helpers/fixtures');

test('member can self-log work with weight and evidence into an active activity', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const teamId = await createTeam(pool);
    const leader = await createUser(pool, { role: 'leader', team_id: teamId, is_lead: true });
    const member = await createUser(pool, { role: 'member', team_id: teamId });
    const activityId = await createActivity(pool, { team_id: teamId, creator_id: leader.id, status: 'approved' });

    // Member self-logs task
    await client.login(member.email, member.password);
    const logRes = await client.request('POST', `/api/activities/${activityId}/log-task`, {
      body: {
        title: 'Trực kỹ thuật ca sáng',
        description: 'Hỗ trợ kiểm tra máy móc thiết bị',
        team_id: teamId,
        weight: 2,
        link_url: 'https://drive.google.com/test-evidence',
        notes: 'Đã hoàn thành ca trực đầy đủ'
      }
    });
    assert.equal(logRes.status, 201);
    const taskId = logRes.json.id;
    assert.ok(taskId);

    // Verify task in DB
    const [[task]] = await pool.query('SELECT * FROM tasks WHERE id=?', [taskId]);
    assert.equal(task.title, 'Trực kỹ thuật ca sáng');
    assert.equal(task.status, 'review');
    assert.equal(task.is_self_logged, 1);
    assert.equal(task.weight, 2);
    assert.ok(task.submitted_for_review_at);

    // Verify assignee in DB (self-assigned and auto-acknowledged)
    const [assignees] = await pool.query('SELECT * FROM task_assignees WHERE task_id=?', [taskId]);
    assert.equal(assignees.length, 1);
    assert.equal(assignees[0].user_id, member.id);
    assert.equal(assignees[0].is_primary, 1);
    assert.ok(assignees[0].acknowledged_at);

    // Verify deliverable attachment in DB
    const [attachments] = await pool.query('SELECT * FROM task_attachments WHERE task_id=?', [taskId]);
    assert.equal(attachments.length, 1);
    assert.equal(attachments[0].kind, 'deliverable');
    assert.equal(attachments[0].link_url, 'https://drive.google.com/test-evidence');

    // Member CANNOT self-review
    const selfReviewRes = await client.request('POST', `/api/tasks/${taskId}/review`, {
      body: { decision: 'approve' }
    });
    assert.equal(selfReviewRes.status, 403);

    // Leader approves the self-logged task -> moves to done
    await client.login(leader.email, leader.password);
    const approveRes = await client.request('POST', `/api/tasks/${taskId}/review`, {
      body: { decision: 'approve' }
    });
    assert.equal(approveRes.status, 200);

    const [[doneTask]] = await pool.query('SELECT status, completed_at FROM tasks WHERE id=?', [taskId]);
    assert.equal(doneTask.status, 'done');
    assert.ok(doneTask.completed_at);
  } finally {
    await close();
    await teardown();
  }
});

test('self-log validation rules: outsider rejected, invalid weight rejected, self-log without evidence accepted', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const teamA = await createTeam(pool, { name: 'Tổ A' });
    const teamB = await createTeam(pool, { name: 'Tổ B' });
    const admin = await createUser(pool, { role: 'admin' });
    const memberA = await createUser(pool, { role: 'member', team_id: teamA });
    const memberB = await createUser(pool, { role: 'member', team_id: teamB });
    const activityId = await createActivity(pool, { team_id: teamA, creator_id: admin.id, status: 'approved' });

    // 1. Member B (not in Team A) attempts to self-log into Team A -> 403
    await client.login(memberB.email, memberB.password);
    const outsiderRes = await client.request('POST', `/api/activities/${activityId}/log-task`, {
      body: {
        title: 'Task trái phép',
        team_id: teamA,
        link_url: 'https://valid.link'
      }
    });
    assert.equal(outsiderRes.status, 403);

    // 2. Member A submits invalid weight (-1 or 15) -> 400
    await client.login(memberA.email, memberA.password);
    const invalidWeightRes = await client.request('POST', `/api/activities/${activityId}/log-task`, {
      body: {
        title: 'Task điểm sai',
        team_id: teamA,
        weight: 15,
        link_url: 'https://valid.link'
      }
    });
    assert.equal(invalidWeightRes.status, 400);

    // 3. Member A submits without evidence (no link and no file) -> now succeeds with 201
    const noEvidenceRes = await client.request('POST', `/api/activities/${activityId}/log-task`, {
      body: {
        title: 'Task không minh chứng',
        team_id: teamA,
        weight: 2
      }
    });
    assert.equal(noEvidenceRes.status, 201);
    assert.ok(noEvidenceRes.json.id);

    const [noEvidenceAttachments] = await pool.query('SELECT * FROM task_attachments WHERE task_id=?', [noEvidenceRes.json.id]);
    assert.equal(noEvidenceAttachments.length, 0);

    // 4. Proposed (not yet approved) activity cannot accept self-logged tasks -> 409 or 400
    const unapprovedActId = await createActivity(pool, { team_id: teamA, creator_id: admin.id, status: 'proposed' });
    const unapprovedRes = await client.request('POST', `/api/activities/${unapprovedActId}/log-task`, {
      body: {
        title: 'Task hoạt động chưa duyệt',
        team_id: teamA,
        link_url: 'https://valid.link'
      }
    });
    assert.ok([400, 409].includes(unapprovedRes.status));
  } finally {
    await close();
    await teardown();
  }
});

test('self-log boundary weights: accepts weight=0 and weight=10', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const teamId = await createTeam(pool);
    const admin = await createUser(pool, { role: 'admin' });
    const member = await createUser(pool, { role: 'member', team_id: teamId });
    const activityId = await createActivity(pool, { team_id: teamId, creator_id: admin.id, status: 'approved' });

    await client.login(member.email, member.password);

    // Test weight = 0 (Support / Attendance - valid preset)
    const res0 = await client.request('POST', `/api/activities/${activityId}/log-task`, {
      body: {
        title: 'Tham gia hỗ trợ nhẹ',
        team_id: teamId,
        weight: 0,
        link_url: 'https://valid.link/0'
      }
    });
    assert.equal(res0.status, 201);
    const [[task0]] = await pool.query('SELECT weight FROM tasks WHERE id=?', [res0.json.id]);
    assert.equal(task0.weight, 0);

    // Test weight = 10 (Maximum boundary)
    const res10 = await client.request('POST', `/api/activities/${activityId}/log-task`, {
      body: {
        title: 'Nhiệm vụ đặc biệt quy mô tối đa',
        team_id: teamId,
        weight: 10,
        link_url: 'https://valid.link/10'
      }
    });
    assert.equal(res10.status, 201);
    const [[task10]] = await pool.query('SELECT weight FROM tasks WHERE id=?', [res10.json.id]);
    assert.equal(task10.weight, 10);
  } finally {
    await close();
    await teardown();
  }
});

test('reviewer can reject/cancel self-logged task with decision=cancel and feedback', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const teamId = await createTeam(pool);
    const leader = await createUser(pool, { role: 'leader', team_id: teamId, is_lead: true });
    const member = await createUser(pool, { role: 'member', team_id: teamId });
    const activityId = await createActivity(pool, { team_id: teamId, creator_id: leader.id, status: 'approved' });

    // Member self-logs task
    await client.login(member.email, member.password);
    const logRes = await client.request('POST', `/api/activities/${activityId}/log-task`, {
      body: {
        title: 'Task cần bác bỏ',
        team_id: teamId,
        weight: 1
      }
    });
    assert.equal(logRes.status, 201);
    const taskId = logRes.json.id;

    // Leader attempts to cancel without feedback -> 400
    await client.login(leader.email, leader.password);
    const noFeedbackRes = await client.request('POST', `/api/tasks/${taskId}/review`, {
      body: { decision: 'cancel' }
    });
    assert.equal(noFeedbackRes.status, 400);

    // Leader cancels with feedback -> 200
    const cancelRes = await client.request('POST', `/api/tasks/${taskId}/review`, {
      body: { decision: 'cancel', feedback: 'Minh chứng không trùng khớp ca trực' }
    });
    assert.equal(cancelRes.status, 200);

    const [[task]] = await pool.query('SELECT status, reviewed_by, review_feedback FROM tasks WHERE id=?', [taskId]);
    assert.equal(task.status, 'cancelled');
    assert.equal(task.reviewed_by, leader.id);
    assert.equal(task.review_feedback, 'Minh chứng không trùng khớp ca trực');
  } finally {
    await close();
    await teardown();
  }
});

test('member can cancel/withdraw their own self-logged task before completion', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const teamId = await createTeam(pool);
    const leader = await createUser(pool, { role: 'leader', team_id: teamId, is_lead: true });
    const memberA = await createUser(pool, { role: 'member', team_id: teamId });
    const memberB = await createUser(pool, { role: 'member', team_id: teamId });
    const activityId = await createActivity(pool, { team_id: teamId, creator_id: leader.id, status: 'approved' });

    // Member A self-logs task
    await client.login(memberA.email, memberA.password);
    const logRes = await client.request('POST', `/api/activities/${activityId}/log-task`, {
      body: {
        title: 'Task tự ghi nhận nhầm',
        team_id: teamId,
        weight: 2
      }
    });
    assert.equal(logRes.status, 201);
    const taskId = logRes.json.id;

    // Member B tries to cancel Member A's task -> 403
    await client.login(memberB.email, memberB.password);
    const outsiderCancel = await client.request('POST', `/api/tasks/${taskId}/cancel`);
    assert.equal(outsiderCancel.status, 403);

    // Member A cancels own task -> 200
    await client.login(memberA.email, memberA.password);
    const ownCancel = await client.request('POST', `/api/tasks/${taskId}/cancel`);
    assert.equal(ownCancel.status, 200);

    const [[task]] = await pool.query('SELECT status FROM tasks WHERE id=?', [taskId]);
    assert.equal(task.status, 'cancelled');

    // Cannot cancel already cancelled task -> 409
    const repeatCancel = await client.request('POST', `/api/tasks/${taskId}/cancel`);
    assert.equal(repeatCancel.status, 409);

    // Test cannot cancel done task
    const logRes2 = await client.request('POST', `/api/activities/${activityId}/log-task`, {
      body: { title: 'Task đã xong', team_id: teamId }
    });
    const taskId2 = logRes2.json.id;
    await client.login(leader.email, leader.password);
    await client.request('POST', `/api/tasks/${taskId2}/review`, { body: { decision: 'approve' } });

    await client.login(memberA.email, memberA.password);
    const cancelDoneRes = await client.request('POST', `/api/tasks/${taskId2}/cancel`);
    assert.equal(cancelDoneRes.status, 409);
  } finally {
    await close();
    await teardown();
  }
});

