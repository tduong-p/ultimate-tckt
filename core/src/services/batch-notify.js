'use strict';

// Thông báo gộp sau khi lưu theo lô (PATCH /api/tasks/:id/batch, /api/activities/:id/batch): mỗi lần lưu chỉ một sự kiện
// `task.updated` / `activity.updated` cho mỗi người nhận, liệt kê các trường đã đổi. Gọi sau khi commit; route bọc try/catch.
// Người mới được giao nhận `task.assigned` thay vì `task.updated`. Mỗi người nhận có thêm một dòng trong ứng dụng.

const { FIELD_LABEL: TASK_LABEL } = require('./task-batch');
const { FIELD_LABEL: ACTIVITY_LABEL } = require('./activity-batch');

const IN_APP_DAYS = 7;
const nowSeconds = () => Math.floor(Date.now() / 1000);
const labels = (map, changed) => changed.map((field) => map[field]).filter(Boolean);

async function insertInApp(db, { userId, activityId, taskId, kind, title, body, url, sourceKey }) {
  await db.execute(
    `INSERT IGNORE INTO notifications(user_id,activity_id,task_id,kind,title,body,url,source_key,expires_at) VALUES(?,?,?,?,?,?,?,?,DATE_ADD(NOW(),INTERVAL ${IN_APP_DAYS} DAY))`,
    [userId, activityId, taskId, kind, String(title).slice(0, 180), String(body).slice(0, 500), url, sourceKey]
  );
}

// Mỗi người nhận độc lập: lỗi ở một người (DB, notifier) không chặn người khác.
async function eachRecipient(context, recipients, label, fn) {
  for (const recipient of recipients) {
    try { await fn(recipient); } catch (error) { context.logger.error(`Unable to prepare ${label} for user ${recipient.id}.`, error); }
  }
}

function uniqueById(rows) {
  const byId = new Map();
  for (const row of rows) if (!byId.has(Number(row.id))) byId.set(Number(row.id), row);
  return [...byId.values()];
}

async function notifyTaskUpdated(context, actor, { task, changed, addedAssignees = [] }) {
  const { db, notifier } = context;
  const labelList = labels(TASK_LABEL, changed || []);
  if (!labelList.length) return;
  const [[current]] = await db.execute('SELECT t.id,t.title,t.team_id,t.activity_id,a.event_lead_id,DATE_FORMAT(t.deadline,\'%Y-%m-%d\') deadline,a.title activity_title FROM tasks t JOIN activities a ON a.id=t.activity_id WHERE t.id=?', [task.id]);
  if (!current) return;
  const [users] = await db.query(
    `SELECT u.id,u.name,u.email FROM users u JOIN task_assignees ta ON ta.user_id=u.id WHERE ta.task_id=? AND u.is_active=1
     UNION
     SELECT u.id,u.name,u.email FROM users u JOIN user_teams ut ON ut.user_id=u.id WHERE ut.team_id=? AND (ut.is_lead=1 OR ut.is_vice_lead=1) AND u.is_active=1
     UNION
     SELECT u.id,u.name,u.email FROM users u WHERE u.id=? AND u.is_active=1`,
    [current.id, current.team_id, current.event_lead_id || 0]
  );
  const added = new Set(addedAssignees.map(Number));
  const epoch = nowSeconds();
  const path = `/#activity/${current.activity_id}`;
  const recipients = uniqueById(users).filter((user) => Number(user.id) !== Number(actor.id));
  await eachRecipient(context, recipients, `task ${current.id} update notification`, async (user) => {
    const newlyAssigned = added.has(Number(user.id));
    const event = newlyAssigned ? 'task.assigned' : 'task.updated';
    const sourceKey = newlyAssigned ? `task-assigned:${current.id}:${user.id}:${epoch}` : `task.updated:${current.id}:${epoch}`;
    const data = newlyAssigned
      ? { actor: actor.name, task: { id: current.id, title: current.title, path, deadline: current.deadline }, activity: { title: current.activity_title } }
      : { actorName: actor.name, title: current.title, changed: labelList, task: { id: current.id, title: current.title, path }, activity: { title: current.activity_title } };
    notifier.notify({ event, recipient: user, actorId: actor.id, data, sourceKey });
    await insertInApp(db, {
      userId: user.id, activityId: current.activity_id, taskId: current.id, url: path,
      kind: newlyAssigned ? 'task_assigned' : 'task.updated',
      title: newlyAssigned ? 'Công việc mới' : 'Công việc được cập nhật',
      body: newlyAssigned ? `Bạn được giao: ${current.title}` : `${actor.name} đã cập nhật “${current.title}”: ${labelList.join(', ')}.`,
      sourceKey: newlyAssigned ? sourceKey : `${sourceKey}:${user.id}`
    });
  });
}

async function notifyActivityUpdated(context, actor, { activity, changed, previousEventLeadId = null }) {
  const { db, notifier } = context;
  const labelList = labels(ACTIVITY_LABEL, changed || []);
  if (!labelList.length) return;
  const [[current]] = await db.execute('SELECT id,title,event_lead_id FROM activities WHERE id=?', [activity.id]);
  if (!current) return;
  // Trưởng sự kiện hiện tại và người vừa được thay ra đều cần biết.
  const leadIds = [...new Set([current.event_lead_id, previousEventLeadId].filter(Boolean).map(Number))];
  if (!leadIds.length) return;
  const [users] = await db.query('SELECT id,name,email FROM users WHERE is_active=1 AND id IN (?)', [leadIds]);
  const epoch = nowSeconds();
  const path = `/#activity/${current.id}`;
  const sourceKey = `activity.updated:${current.id}:${epoch}`;
  const recipients = uniqueById(users).filter((user) => Number(user.id) !== Number(actor.id));
  await eachRecipient(context, recipients, `activity ${current.id} update notification`, async (user) => {
    notifier.notify({ event: 'activity.updated', recipient: user, actorId: actor.id, data: { actorName: actor.name, title: current.title, changed: labelList, activity: { id: current.id, title: current.title, path } }, sourceKey });
    await insertInApp(db, {
      userId: user.id, activityId: current.id, taskId: null, url: path, kind: 'activity.updated',
      title: 'Hoạt động được cập nhật', body: `${actor.name} đã cập nhật “${current.title}”: ${labelList.join(', ')}.`,
      sourceKey: `${sourceKey}:${user.id}`
    });
  });
}

module.exports = { notifyTaskUpdated, notifyActivityUpdated };
