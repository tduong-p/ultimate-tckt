const { dateInVietnam, addDaysVietnam } = require('../date-vn');
const {
  isSendingHour,
  deadlineWindow,
  isUnacknowledgedDue,
  sourceKeys,
  emailStatusFor
} = require('./reminder-rules');

const DEFAULT_INTERVAL_MS = 15 * 60 * 1000;

const EXCLUDED_STATUSES = "'review', 'done', 'cancelled'";

async function findOverdueTasks(db, now = new Date()) {
  const vietnamDate = dateInVietnam(now);

  const [rows] = await db.execute(
    `
    SELECT
      t.id AS task_id,
      t.title AS task_title,
      t.deadline,
      DATE_FORMAT(t.deadline, '%Y-%m-%d') AS deadline_day,
      t.activity_id,
      a.title AS activity_title,
      u.id AS user_id,
      u.name AS user_name,
      u.email AS user_email
    FROM tasks t
    JOIN activities a ON a.id = t.activity_id
    JOIN task_assignees ta ON ta.task_id = t.id
    JOIN users u
      ON u.id = ta.user_id
      AND u.is_active = 1
    WHERE t.status NOT IN (${EXCLUDED_STATUSES})
      AND t.deadline < ?
    `,
    [vietnamDate]
  );

  return rows;
}

// Task có hạn hôm nay hoặc ngày mai theo giờ VN (so sánh ngày lịch).
async function findUpcomingDeadlines(db, now = new Date()) {
  const today = dateInVietnam(now);
  const tomorrow = addDaysVietnam(now, 1);

  const [rows] = await db.execute(
    `
    SELECT
      t.id AS task_id,
      t.title AS task_title,
      t.deadline,
      DATE_FORMAT(t.deadline, '%Y-%m-%d') AS deadline_day,
      t.activity_id,
      a.title AS activity_title,
      u.id AS user_id,
      u.name AS user_name,
      u.email AS user_email
    FROM tasks t
    JOIN activities a ON a.id = t.activity_id
    JOIN task_assignees ta ON ta.task_id = t.id
    JOIN users u
      ON u.id = ta.user_id
      AND u.is_active = 1
    WHERE t.status NOT IN (${EXCLUDED_STATUSES})
      AND t.deadline IN (?, ?)
    `,
    [today, tomorrow]
  );

  return rows;
}

// Việc giao >= 24 giờ chưa xác nhận. Lọc tuổi < 168 giờ làm ở Node (isUnacknowledgedDue).
async function findUnacknowledgedAssignments(db, now = new Date()) {
  const [rows] = await db.execute(
    `
    SELECT
      t.id AS task_id,
      t.title AS task_title,
      t.activity_id,
      a.title AS activity_title,
      ta.user_id AS member_id,
      ta.assigned_at AS assigned_at,
      member.name AS member_name,
      t.assigned_by AS lead_id,
      \`lead\`.email AS lead_email,
      \`lead\`.name AS lead_name
    FROM tasks t
    JOIN activities a
      ON a.id = t.activity_id
    JOIN task_assignees ta
      ON ta.task_id = t.id
    JOIN users member
      ON member.id = ta.user_id
      AND member.is_active = 1
    JOIN users \`lead\`
      ON \`lead\`.id = t.assigned_by
      AND \`lead\`.is_active = 1
    WHERE ta.acknowledged_at IS NULL
      AND t.status NOT IN (${EXCLUDED_STATUSES})
      AND t.assigned_by IS NOT NULL
      AND t.assigned_by <> ta.user_id
      AND ta.assigned_at <= ?
    `,
    [new Date(now.getTime() - 24 * 3600000)]
  );

  return rows.filter(row => isUnacknowledgedDue(row.assigned_at, now));
}

async function insertNotificationOnce(
  db,
  { userId, activityId, taskId, kind, title, body, url, sourceKey, now = new Date() }
) {
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [result] = await db.execute(
    `
    INSERT IGNORE INTO notifications
      (user_id, activity_id, task_id, kind, title, body, url, source_key, expires_at, email_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `,
    [userId, activityId, taskId, kind, title, body, url, sourceKey, expiresAt]
  );

  return result.affectedRows > 0;
}

// Tạo thông báo trong app (một lần theo source_key) rồi gửi email nếu dòng còn `pending`.
// Gửi tuần tự bằng await; kết quả ghi vào notifications.email_status.
async function deliver({ db, notifier, now }, row, event) {
  const inserted = await insertNotificationOnce(db, { ...row, now });

  const [[current]] = await db.execute(
    'SELECT email_status FROM notifications WHERE user_id = ? AND source_key = ?',
    [row.userId, row.sourceKey]
  );

  if (current && current.email_status === 'pending') {
    const result = await notifier.notify(event);
    await db.execute(
      'UPDATE notifications SET email_status = ? WHERE user_id = ? AND source_key = ?',
      [emailStatusFor(result), row.userId, row.sourceKey]
    );
  }

  return inserted;
}

function formatDayMonth(day) {
  const [, month, date] = day.split('-');
  return `${date}/${month}`;
}

async function runDeadlineNotifications({
  db,
  notifier,
  logger,
  now = new Date()
}) {
  const today = dateInVietnam(now);

  // Delete expired notifications using the same reference time
  await db.execute(
    `DELETE FROM notifications WHERE expires_at <= ?`,
    [now]
  );

  if (!isSendingHour(now)) {
    return { date: today, created: 0, skipped: 'outside-hours' };
  }

  const ctx = { db, notifier, now };
  let created = 0;

  const upcoming = await findUpcomingDeadlines(db, now);

  for (const item of upcoming) {
    const window = deadlineWindow(item.deadline_day, now);
    if (!window) continue;

    const url = `/#activity/${item.activity_id}`;
    const sourceKey = sourceKeys.deadline(window.code, item.task_id, item.user_id, item.deadline_day);
    const body = window.code === '1d'
      ? `"${item.task_title}" trong "${item.activity_title}" sẽ đến hạn vào ngày mai (${formatDayMonth(item.deadline_day)}).`
      : `"${item.task_title}" trong "${item.activity_title}" đến hạn hôm nay.`;

    const inserted = await deliver(ctx, {
      userId: item.user_id,
      activityId: item.activity_id,
      taskId: item.task_id,
      kind: 'task_deadline_soon',
      title: 'Sắp đến hạn',
      body,
      url,
      sourceKey
    }, {
      event: 'task.deadline_soon',
      recipient: { id: item.user_id, name: item.user_name, email: item.user_email },
      data: {
        window: window.label,
        task: { id: item.task_id, title: item.task_title, path: url, deadline: item.deadline_day },
        activity: { title: item.activity_title }
      },
      sourceKey
    });

    if (inserted) created += 1;
  }

  const overdue = await findOverdueTasks(db, now);

  for (const item of overdue) {
    const url = `/#activity/${item.activity_id}`;
    const sourceKey = sourceKeys.overdue(item.task_id, item.user_id, today);

    const inserted = await deliver(ctx, {
      userId: item.user_id,
      activityId: item.activity_id,
      taskId: item.task_id,
      kind: 'task_overdue',
      title: 'Công việc trễ hạn',
      body: `"${item.task_title}" trong "${item.activity_title}" đã quá hạn.`,
      url,
      sourceKey
    }, {
      event: 'task.overdue',
      recipient: { id: item.user_id, name: item.user_name, email: item.user_email },
      data: {
        task: { id: item.task_id, title: item.task_title, path: url, deadline: item.deadline_day },
        activity: { title: item.activity_title }
      },
      sourceKey
    });

    if (inserted) created += 1;
  }

  const unacknowledged = await findUnacknowledgedAssignments(db, now);

  for (const item of unacknowledged) {
    const url = `/#activity/${item.activity_id}`;
    const sourceKey = sourceKeys.unacknowledged(item.task_id, item.member_id, item.assigned_at);

    const inserted = await deliver(ctx, {
      userId: item.lead_id,
      activityId: item.activity_id,
      taskId: item.task_id,
      kind: 'task_unacknowledged',
      title: 'Thành viên chưa xác nhận nhận việc',
      body: `${item.member_name} chưa xác nhận nhận việc "${item.task_title}" sau 24 giờ.`,
      url,
      sourceKey
    }, {
      event: 'task.unacknowledged',
      recipient: { id: item.lead_id, name: item.lead_name, email: item.lead_email },
      data: {
        memberName: item.member_name,
        task: { id: item.task_id, title: item.task_title, path: url },
        activity: { title: item.activity_title }
      },
      sourceKey
    });

    if (inserted) created += 1;
  }

  if (created) {
    logger.info(
      `Created ${created} scheduled notifications for ${today}.`
    );
  }

  return {
    date: today,
    created
  };
}

function startDeadlineNotificationScheduler(
  dependencies,
  intervalMs = DEFAULT_INTERVAL_MS
) {
  let running = false;

  const execute = async () => {
    if (running) return;
    running = true;

    try {
      await runDeadlineNotifications(dependencies);
    } catch (error) {
      dependencies.logger.error(
        'Scheduled notification job failed.',
        error
      );
    } finally {
      running = false;
    }
  };

  setImmediate(execute);
  const timer = setInterval(execute, intervalMs);
  timer.unref?.();

  return () => clearInterval(timer);
}

module.exports = {
  dateInVietnam,
  runDeadlineNotifications,
  startDeadlineNotificationScheduler,
  findUpcomingDeadlines,
  findOverdueTasks,
  findUnacknowledgedAssignments
};