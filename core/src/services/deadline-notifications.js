const DEFAULT_INTERVAL_MS = 15 * 60 * 1000;
const appBaseUrl = String(process.env.APP_BASE_URL || '').replace(/\/$/, '');
const activityUrl = activityId => appBaseUrl ? `${appBaseUrl}/#activity/${activityId}` : '';

function dateInVietnam(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

async function findUpcomingDeadlines(db, now = new Date()) {
  const [rows] = await db.execute(
    `SELECT t.id task_id,t.title task_title,t.deadline,t.activity_id,a.title activity_title,u.id user_id,u.name user_name,u.email user_email
     FROM tasks t JOIN activities a ON a.id=t.activity_id JOIN task_assignees ta ON ta.task_id=t.id JOIN users u ON u.id=ta.user_id AND u.is_active=1
     WHERE t.status NOT IN ('done','cancelled') AND (TIMESTAMPDIFF(HOUR,?,t.deadline) IN (24,4) OR DATEDIFF(t.deadline,?) = 1)`,
    [now, now]
  );
  return rows;
}

async function findOverdueTasks(db, now = new Date()) {
  const [rows] = await db.execute(
    `SELECT t.id task_id,t.title task_title,t.deadline,t.activity_id,a.title activity_title,u.id user_id,u.name user_name,u.email user_email
     FROM tasks t JOIN activities a ON a.id=t.activity_id JOIN task_assignees ta ON ta.task_id=t.id JOIN users u ON u.id=ta.user_id AND u.is_active=1
     WHERE t.status NOT IN ('done','cancelled') AND t.deadline<?`,
    [now]
  );
  return rows;
}

async function findUnacknowledgedAssignments(db, now = new Date()) {
  const [rows] = await db.execute(
    `SELECT t.id task_id,t.title task_title,t.activity_id,ta.user_id member_id,member.name member_name,t.assigned_by lead_id,\`lead\`.email lead_email,\`lead\`.name lead_name
     FROM tasks t JOIN task_assignees ta ON ta.task_id=t.id JOIN users member ON member.id=ta.user_id
     LEFT JOIN users \`lead\` ON \`lead\`.id=t.assigned_by
     WHERE ta.acknowledged_at IS NULL AND t.status NOT IN ('done','cancelled') AND TIMESTAMPDIFF(HOUR,ta.assigned_at,?)>=24 AND t.assigned_by IS NOT NULL`,
    [now]
  );
  return rows;
}

async function insertNotificationOnce(db, { userId, activityId, taskId, kind, title, body, url, sourceKey }) {
  const [result] = await db.execute(
    `INSERT IGNORE INTO notifications(user_id,activity_id,task_id,kind,title,body,url,source_key,expires_at) VALUES(?,?,?,?,?,?,?,?,DATE_ADD(NOW(),INTERVAL 7 DAY))`,
    [userId, activityId, taskId, kind, title, body, url, sourceKey]
  );
  return result.affectedRows > 0;
}

async function runDeadlineNotifications({ db, push, emailEvents, logger, now = new Date() }) {
  const today = dateInVietnam(now);
  await db.execute('DELETE FROM notifications WHERE expires_at<=NOW()');
  let created = 0;

  const upcoming = await findUpcomingDeadlines(db, now);
  for (const item of upcoming) {
    const hoursLeft = Math.round((new Date(item.deadline) - now) / 3600000);
    const window = hoursLeft <= 4 ? '4h' : '24h';
    const title = 'Sắp đến hạn';
    const body = `"${item.task_title}" trong "${item.activity_title}" sẽ đến hạn trong ${window === '4h' ? '4 giờ' : '24 giờ'} tới.`;
    const url = `/#activity/${item.activity_id}`;
    const inserted = await insertNotificationOnce(db, { userId: item.user_id, activityId: item.activity_id, taskId: item.task_id, kind: 'task_deadline_soon', title, body, url, sourceKey: `task-deadline-${window}:${item.task_id}:${item.user_id}:${today}` });
    if (inserted) {
      created += 1;
      if (push?.queuePush) push.queuePush(`deadline ${window} task ${item.task_id} to user ${item.user_id}`, { userId: item.user_id, title, message: body, url });
      if (emailEvents?.emit) emailEvents.emit(db, 'task.deadline_soon', { user: { id: item.user_id, name: item.user_name, email: item.user_email }, task: { id: item.task_id, title: item.task_title, activity_title: item.activity_title, deadline: item.deadline }, window_text: window === '4h' ? '4 giờ' : '24 giờ', url: activityUrl(item.activity_id) }, { logger });
    }
  }

  const overdue = await findOverdueTasks(db, now);
  for (const item of overdue) {
    const title = 'Công việc trễ hạn';
    const body = `"${item.task_title}" trong "${item.activity_title}" đã quá hạn.`;
    const url = `/#activity/${item.activity_id}`;
    const inserted = await insertNotificationOnce(db, { userId: item.user_id, activityId: item.activity_id, taskId: item.task_id, kind: 'task_overdue', title, body, url, sourceKey: `task-overdue:${item.task_id}:${item.user_id}:${today}` });
    if (inserted) {
      created += 1;
      if (push?.queuePush) push.queuePush(`overdue task ${item.task_id} to user ${item.user_id}`, { userId: item.user_id, title, message: body, url });
      if (emailEvents?.emit) emailEvents.emit(db, 'task.overdue', { user: { id: item.user_id, name: item.user_name, email: item.user_email }, task: { id: item.task_id, title: item.task_title, activity_title: item.activity_title, deadline: item.deadline }, url: activityUrl(item.activity_id) }, { logger });
    }
  }

  const unacknowledged = await findUnacknowledgedAssignments(db, now);
  for (const item of unacknowledged) {
    if (!item.lead_id) continue;
    const title = 'Thành viên chưa xác nhận nhận việc';
    const body = `${item.member_name} chưa xác nhận nhận việc "${item.task_title}" sau 24 giờ.`;
    const url = `/#activity/${item.activity_id}`;
    const inserted = await insertNotificationOnce(db, { userId: item.lead_id, activityId: item.activity_id, taskId: item.task_id, kind: 'task_unacknowledged', title, body, url, sourceKey: `task-unacknowledged:${item.task_id}:${item.member_id}` });
    if (inserted) {
      created += 1;
      if (emailEvents?.emit) emailEvents.emit(db, 'task.unacknowledged', { lead: { id: item.lead_id, name: item.lead_name, email: item.lead_email }, task: { id: item.task_id, title: item.task_title }, member_name: item.member_name, url: activityUrl(item.activity_id) }, { logger });
    }
  }

  if (created) logger.info(`Created ${created} scheduled notifications for ${today}.`);
  return { date: today, created };
}

function startDeadlineNotificationScheduler(dependencies, intervalMs = DEFAULT_INTERVAL_MS) {
  let running = false;
  const execute = async () => {
    if (running) return;
    running = true;
    try { await runDeadlineNotifications(dependencies); }
    catch (error) { dependencies.logger.error('Scheduled notification job failed.', error); }
    finally { running = false; }
  };
  setImmediate(execute);
  const timer = setInterval(execute, intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
}

module.exports = { dateInVietnam, runDeadlineNotifications, startDeadlineNotificationScheduler, findUpcomingDeadlines, findOverdueTasks, findUnacknowledgedAssignments };
