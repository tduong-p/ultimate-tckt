const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { createTeam, createUser, createActivity, createTask } = require('./helpers/fixtures');
const logger = require('../src/logger');
const { runDeadlineNotifications } = require('../src/services/deadline-notifications');
const { addDaysVietnam } = require('../src/date-vn');

const HOUR = 3600000;
// 09:00 giờ VN ngày 2030-06-15 (nằm trong khung gửi 07:00-21:59).
const NOW = new Date('2030-06-15T02:00:00Z');

// Notifier giả: ghi lại event, trả kết quả lần lượt từ `results` (hết thì dùng `fallback`).
function fakeNotifier(results = [], fallback = { delivered: true }) {
  const sent = [];
  const queue = [...results];
  return {
    sent,
    notify: async event => {
      sent.push(event);
      return queue.length ? queue.shift() : fallback;
    }
  };
}

async function setup(pool) {
  // db.sql có sẵn một nhiệm vụ mẫu (hạn quá khứ so với NOW cố định) sẽ bị tính là trễ hạn.
  await pool.execute('DELETE FROM task_assignees');
  await pool.execute('DELETE FROM tasks');
  const teamId = await createTeam(pool);
  const leader = await createUser(pool, { role: 'leader', team_id: teamId, is_lead: true });
  const activityId = await createActivity(pool, { team_id: teamId, creator_id: leader.id, status: 'approved' });
  return { teamId, leader, activityId };
}

async function addTask(pool, ctx, { assignee, deadline, status = 'todo', assignedBy, assignedAt = null }) {
  const taskId = await createTask(pool, {
    activity_id: ctx.activityId,
    team_id: ctx.teamId,
    primary_assignee_id: assignee.id,
    assigned_by: assignedBy === undefined ? ctx.leader.id : assignedBy,
    status
  });
  await pool.execute('UPDATE tasks SET deadline=? WHERE id=?', [deadline, taskId]);
  // Mặc định assigned_at là NOW() thật (cách xa NOW cố định > 7 ngày) nên không dính nhắc chưa xác nhận.
  if (assignedAt) await pool.execute('UPDATE task_assignees SET assigned_at=? WHERE task_id=?', [assignedAt, taskId]);
  return taskId;
}

async function statusRows(pool) {
  const [rows] = await pool.query('SELECT user_id, source_key, email_status FROM notifications ORDER BY id', []);
  return rows;
}

test('outside sending hours nothing is created or sent', async () => {
  const notifier = fakeNotifier();
  const { pool, teardown } = await createTestDatabase();
  try {
    const ctx = await setup(pool);
    const member = await createUser(pool, { role: 'member', team_id: ctx.teamId });
    const now = new Date('2030-06-15T15:00:00Z'); // 22:00 VN
    await addTask(pool, ctx, { assignee: member, deadline: addDaysVietnam(now, 1) });

    const result = await runDeadlineNotifications({ db: pool, notifier, logger, now });

    assert.equal(result.skipped, 'outside-hours');
    assert.equal(result.created, 0);
    assert.equal((await statusRows(pool)).length, 0);
    assert.equal(notifier.sent.length, 0);
  } finally { await teardown(); }
});

test('deadline tomorrow sends one "1 ngày" reminder; today sends one "hôm nay"; reruns do not resend', async () => {
  const notifier = fakeNotifier();
  const { pool, teardown } = await createTestDatabase();
  try {
    const ctx = await setup(pool);
    const tomorrowUser = await createUser(pool, { role: 'member', team_id: ctx.teamId });
    const todayUser = await createUser(pool, { role: 'member', team_id: ctx.teamId });
    const tomorrow = addDaysVietnam(NOW, 1);
    const today = addDaysVietnam(NOW, 0);
    const taskTomorrow = await addTask(pool, ctx, { assignee: tomorrowUser, deadline: tomorrow });
    const taskToday = await addTask(pool, ctx, { assignee: todayUser, deadline: today });

    const first = await runDeadlineNotifications({ db: pool, notifier, logger, now: NOW });
    const second = await runDeadlineNotifications({ db: pool, notifier, logger, now: NOW });

    assert.equal(first.created, 2);
    assert.equal(second.created, 0);
    assert.equal(notifier.sent.length, 2, 'the second run must not resend');

    const byUser = new Map(notifier.sent.map(e => [e.recipient.id, e]));
    const a = byUser.get(tomorrowUser.id);
    assert.equal(a.event, 'task.deadline_soon');
    assert.equal(a.data.window, '1 ngày');
    assert.equal(a.sourceKey, `task-deadline-1d:${taskTomorrow}:${tomorrowUser.id}:${tomorrow}`);
    const b = byUser.get(todayUser.id);
    assert.equal(b.data.window, 'hôm nay');
    assert.equal(b.sourceKey, `task-deadline-today:${taskToday}:${todayUser.id}:${today}`);

    const rows = await statusRows(pool);
    assert.equal(rows.length, 2);
    assert.ok(rows.every(r => r.email_status === 'success'));
  } finally { await teardown(); }
});

test('moving the deadline sends a reminder for the new date only', async () => {
  const notifier = fakeNotifier();
  const { pool, teardown } = await createTestDatabase();
  try {
    const ctx = await setup(pool);
    const member = await createUser(pool, { role: 'member', team_id: ctx.teamId });
    const oldDay = addDaysVietnam(NOW, 1);
    const taskId = await addTask(pool, ctx, { assignee: member, deadline: oldDay });

    await runDeadlineNotifications({ db: pool, notifier, logger, now: NOW });
    assert.equal(notifier.sent.length, 1);

    const nextNow = new Date(NOW.getTime() + 24 * HOUR);
    const newDay = addDaysVietnam(nextNow, 1);
    await pool.execute('UPDATE tasks SET deadline=? WHERE id=?', [newDay, taskId]);
    await runDeadlineNotifications({ db: pool, notifier, logger, now: nextNow });

    assert.equal(notifier.sent.length, 2);
    assert.equal(notifier.sent[1].sourceKey, `task-deadline-1d:${taskId}:${member.id}:${newDay}`);
    assert.notEqual(notifier.sent[1].sourceKey, notifier.sent[0].sourceKey);
  } finally { await teardown(); }
});

test('tasks in review, done or cancelled are never reminded', async () => {
  const notifier = fakeNotifier();
  const { pool, teardown } = await createTestDatabase();
  try {
    const ctx = await setup(pool);
    const member = await createUser(pool, { role: 'member', team_id: ctx.teamId });
    const tomorrow = addDaysVietnam(NOW, 1);
    for (const status of ['review', 'done', 'cancelled']) {
      await addTask(pool, ctx, { assignee: member, deadline: tomorrow, status });
    }
    await addTask(pool, ctx, { assignee: member, deadline: addDaysVietnam(NOW, -2), status: 'review' });

    const result = await runDeadlineNotifications({ db: pool, notifier, logger, now: NOW });

    assert.equal(result.created, 0);
    assert.equal(notifier.sent.length, 0);
  } finally { await teardown(); }
});

test('unacknowledged: inactive lead or member, self-assigned, older than 7 days are skipped', async () => {
  const notifier = fakeNotifier();
  const { pool, teardown } = await createTestDatabase();
  try {
    const ctx = await setup(pool);
    const farDeadline = addDaysVietnam(NOW, 30);
    const at = hours => new Date(NOW.getTime() - hours * HOUR);

    // 1. trưởng nhóm đã khoá
    const inactiveLead = await createUser(pool, { role: 'leader', team_id: ctx.teamId, is_lead: true });
    const m1 = await createUser(pool, { role: 'member', team_id: ctx.teamId });
    await addTask(pool, ctx, { assignee: m1, deadline: farDeadline, assignedBy: inactiveLead.id, assignedAt: at(30) });
    await pool.execute('UPDATE users SET is_active=0 WHERE id=?', [inactiveLead.id]);

    // 2. thành viên đã khoá
    const m2 = await createUser(pool, { role: 'member', team_id: ctx.teamId });
    await addTask(pool, ctx, { assignee: m2, deadline: farDeadline, assignedAt: at(30) });
    await pool.execute('UPDATE users SET is_active=0 WHERE id=?', [m2.id]);

    // 3. tự giao cho chính mình
    const m3 = await createUser(pool, { role: 'member', team_id: ctx.teamId });
    await addTask(pool, ctx, { assignee: m3, deadline: farDeadline, assignedBy: m3.id, assignedAt: at(30) });

    // 4. giao quá 7 ngày
    const m4 = await createUser(pool, { role: 'member', team_id: ctx.teamId });
    await addTask(pool, ctx, { assignee: m4, deadline: farDeadline, assignedAt: at(24 * 7 + 1) });

    const skipped = await runDeadlineNotifications({ db: pool, notifier, logger, now: NOW });
    assert.equal(skipped.created, 0);
    assert.equal(notifier.sent.length, 0);

    // 5. hợp lệ: giao 30 giờ trước
    const m5 = await createUser(pool, { role: 'member', team_id: ctx.teamId });
    const validTask = await addTask(pool, ctx, { assignee: m5, deadline: farDeadline, assignedAt: at(30) });
    const [[assignment]] = await pool.query('SELECT assigned_at FROM task_assignees WHERE task_id=? AND user_id=?', [validTask, m5.id]);
    const epoch = Math.floor(new Date(assignment.assigned_at).getTime() / 1000);

    await runDeadlineNotifications({ db: pool, notifier, logger, now: NOW });

    assert.equal(notifier.sent.length, 1);
    assert.equal(notifier.sent[0].event, 'task.unacknowledged');
    assert.equal(notifier.sent[0].recipient.id, ctx.leader.id);
    assert.equal(notifier.sent[0].sourceKey, `task-unacknowledged:${validTask}:${m5.id}:${epoch}`);
  } finally { await teardown(); }
});

test('a transient Noti failure keeps the row pending and the next run sends it', async () => {
  const notifier = fakeNotifier([{ delivered: false, reason: 'sender-error', retryable: true }, { delivered: true }]);
  const { pool, teardown } = await createTestDatabase();
  try {
    const ctx = await setup(pool);
    const member = await createUser(pool, { role: 'member', team_id: ctx.teamId });
    await addTask(pool, ctx, { assignee: member, deadline: addDaysVietnam(NOW, 1) });

    await runDeadlineNotifications({ db: pool, notifier, logger, now: NOW });
    assert.equal(notifier.sent.length, 1);
    assert.equal((await statusRows(pool))[0].email_status, 'pending');

    await runDeadlineNotifications({ db: pool, notifier, logger, now: NOW });
    assert.equal(notifier.sent.length, 2, 'the pending row is retried exactly once');
    assert.equal((await statusRows(pool))[0].email_status, 'success');

    await runDeadlineNotifications({ db: pool, notifier, logger, now: NOW });
    assert.equal(notifier.sent.length, 2, 'a successful row is never sent again');
  } finally { await teardown(); }
});

test('after the first retryable failure the run stops sending and leaves the rest pending', async () => {
  const notifier = fakeNotifier([{ delivered: false, reason: 'sender-error', retryable: true }]);
  const { pool, teardown } = await createTestDatabase();
  try {
    const ctx = await setup(pool);
    const a = await createUser(pool, { role: 'member', team_id: ctx.teamId });
    const b = await createUser(pool, { role: 'member', team_id: ctx.teamId });
    await addTask(pool, ctx, { assignee: a, deadline: addDaysVietnam(NOW, 1) });
    await addTask(pool, ctx, { assignee: b, deadline: addDaysVietnam(NOW, 1) });

    await runDeadlineNotifications({ db: pool, notifier, logger, now: NOW });

    assert.equal(notifier.sent.length, 1, 'notify is called once, then the run stops');
    const rows = await statusRows(pool);
    assert.equal(rows.length, 2);
    assert.deepEqual(rows.map(r => r.email_status), ['pending', 'pending']);
  } finally { await teardown(); }
});

test('permanent skips and no-sender are never retried', async () => {
  const notifier = fakeNotifier([
    { delivered: false, reason: 'self' },
    { delivered: false, reason: 'no-sender' }
  ]);
  const { pool, teardown } = await createTestDatabase();
  try {
    const ctx = await setup(pool);
    const u1 = await createUser(pool, { role: 'member', team_id: ctx.teamId });
    const u2 = await createUser(pool, { role: 'member', team_id: ctx.teamId });
    const tomorrow = addDaysVietnam(NOW, 1);
    await addTask(pool, ctx, { assignee: u1, deadline: tomorrow });
    await addTask(pool, ctx, { assignee: u2, deadline: tomorrow });

    await runDeadlineNotifications({ db: pool, notifier, logger, now: NOW });
    assert.equal(notifier.sent.length, 2);

    const rows = await statusRows(pool);
    const statusOf = event => rows.find(r => r.user_id === event.recipient.id).email_status;
    assert.equal(statusOf(notifier.sent[0]), 'failed');
    assert.equal(statusOf(notifier.sent[1]), null);

    await runDeadlineNotifications({ db: pool, notifier, logger, now: NOW });
    assert.equal(notifier.sent.length, 2, 'neither failed nor no-sender rows are retried');
  } finally { await teardown(); }
});
