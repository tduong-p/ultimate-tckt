const { dateInVietnam } = require('../date-vn');

const FIELD_LABEL = {
  title: 'Tiêu đề', description: 'Mô tả', primary_assignee_id: 'Người phụ trách', co_assignee_ids: 'Người phối hợp',
  team_id: 'Tổ', deadline: 'Hạn', start_date: 'Ngày bắt đầu', priority: 'Ưu tiên', deliverable: 'Sản phẩm bàn giao'
};
const LIGHT = ['title', 'description'];
const SCALAR = ['title', 'description', 'primary_assignee_id', 'team_id', 'deadline', 'start_date', 'priority', 'deliverable'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const DATE_FIELDS = ['deadline', 'start_date'];
const ID_FIELDS = ['primary_assignee_id', 'team_id'];
const MAX_LENGTH = { title: 180, deliverable: 255 };
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const reply = (status, body, extra = {}) => ({ status, body, ...extra });

// Trường người gọi được sửa. Quản lý tổ (hoặc điều hành) sửa tất cả; người được giao chỉ sửa nhóm nhẹ.
async function taskEditableFields(context, actor, task) {
  if (await context.canManageTeam(actor, task.team_id)) return Object.keys(FIELD_LABEL);
  return task.assigned_to_me ? LIGHT : [];
}

function normalizeDate(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value === 'string' && DATE_RE.test(value.trim())) return value.trim();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : dateInVietnam(parsed);
}

function normalize(field, value) {
  if (value === undefined) return undefined;
  if (field === 'co_assignee_ids') {
    return [...new Set((Array.isArray(value) ? value : []).map(Number))].sort((a, b) => a - b);
  }
  if (DATE_FIELDS.includes(field)) return normalizeDate(value);
  if (ID_FIELDS.includes(field)) return value === null || value === '' ? null : Number(value);
  if (value === '' || value === null) return null;
  return typeof value === 'string' ? value.trim() || null : value;
}

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

function validDate(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

// Kiểm tra dạng dữ liệu (không đụng DB). Trả thông báo lỗi hoặc null.
function shapeError(next, rawChanges) {
  if (next.title !== undefined && !next.title) return 'Tiêu đề không được để trống.';
  if (next.priority !== undefined && !PRIORITIES.includes(next.priority)) return 'Mức ưu tiên không hợp lệ.';
  if (next.deadline !== undefined && !next.deadline) return 'Hạn không được để trống.';
  for (const field of DATE_FIELDS) {
    if (next[field] && !validDate(next[field])) return `${FIELD_LABEL[field]} không hợp lệ.`;
  }
  for (const [field, max] of Object.entries(MAX_LENGTH)) {
    if (typeof next[field] === 'string' && next[field].length > max) return `${FIELD_LABEL[field]} tối đa ${max} ký tự.`;
  }
  for (const field of ID_FIELDS) {
    if (next[field] !== undefined && next[field] !== null && !Number.isInteger(next[field])) return `${FIELD_LABEL[field]} không hợp lệ.`;
  }
  if (next.team_id === null) return 'Tổ không được để trống.';
  if ('co_assignee_ids' in rawChanges) {
    if (!Array.isArray(rawChanges.co_assignee_ids) || next.co_assignee_ids.some((id) => !Number.isInteger(id) || id <= 0)) return 'Người phối hợp không hợp lệ.';
  }
  return null;
}

async function applyTaskBatch(context, { actor, taskId, changes, base }) {
  const { db } = context;
  if (!changes || typeof changes !== 'object' || Array.isArray(changes)) return reply(400, { error: 'Thiếu nội dung thay đổi.' });
  const baseValues = base && typeof base === 'object' && !Array.isArray(base) ? base : {};
  const keys = Object.keys(changes);
  if (!keys.length) return reply(200, { changed: [] });
  const unknown = keys.filter((k) => !FIELD_LABEL[k]);
  if (unknown.length) return reply(400, { error: 'Trường không hợp lệ.', fields: unknown });
  const next = {};
  for (const k of keys) next[k] = normalize(k, changes[k]);
  const invalid = shapeError(next, changes);
  if (invalid) return reply(400, { error: invalid });

  const conn = await db.getConnection();
  let committed = false;
  try {
    await conn.beginTransaction();
    // Khoá hàng để kiểm tra xung đột và ghi là một bước nguyên tử.
    const [rows] = await conn.execute(
      "SELECT t.*,DATE_FORMAT(t.deadline,'%Y-%m-%d') deadline,DATE_FORMAT(t.start_date,'%Y-%m-%d') start_date,EXISTS(SELECT 1 FROM task_assignees ta WHERE ta.task_id=t.id AND ta.user_id=?) assigned_to_me FROM tasks t WHERE t.id=? FOR UPDATE",
      [actor.id, taskId]
    );
    const task = rows[0];
    if (!task) return reply(404, { error: 'Không tìm thấy công việc.' });

    const editable = await taskEditableFields(context, actor, task);
    const forbidden = keys.filter((k) => !editable.includes(k));
    if (!forbidden.length && next.team_id !== undefined && next.team_id !== task.team_id && !(await context.canManageTeam(actor, next.team_id))) forbidden.push('team_id');
    if (forbidden.length) return reply(403, { error: 'Bạn không có quyền sửa các trường này.', forbidden });

    const [coRows] = await conn.execute('SELECT user_id FROM task_assignees WHERE task_id=? AND is_primary=0 ORDER BY user_id', [taskId]);
    const current = { ...task, co_assignee_ids: coRows.map((r) => r.user_id) };
    const changed = keys.filter((k) => !same(normalize(k, current[k]), next[k]));
    const conflicts = changed.filter((k) => k in baseValues && !same(normalize(k, baseValues[k]), normalize(k, current[k])));
    if (conflicts.length) return reply(409, { error: 'Dữ liệu đã được người khác thay đổi.', conflicts });
    if (!changed.length) return reply(200, { changed: [] });

    if (changed.includes('team_id')) {
      const [teams] = await conn.execute('SELECT id FROM teams WHERE id=?', [next.team_id]);
      if (!teams.length) return reply(400, { error: 'Tổ không tồn tại.' });
    }
    const primary = next.primary_assignee_id !== undefined ? next.primary_assignee_id : task.primary_assignee_id;
    const co = (next.co_assignee_ids !== undefined ? next.co_assignee_ids : current.co_assignee_ids).filter((id) => id !== primary);
    const after = [primary, ...co].filter(Boolean);
    const assigneesChanged = changed.includes('primary_assignee_id') || changed.includes('co_assignee_ids');
    if (assigneesChanged && after.length) {
      const [users] = await conn.query('SELECT id FROM users WHERE is_active=1 AND id IN (?)', [after]);
      const missing = after.filter((id) => !users.some((u) => u.id === id) && ![task.primary_assignee_id, ...current.co_assignee_ids].includes(id));
      if (missing.length) return reply(400, { error: 'Người được giao không tồn tại hoặc đã ngừng hoạt động.' });
    }

    const scalar = changed.filter((k) => SCALAR.includes(k));
    if (scalar.length) await conn.execute(`UPDATE tasks SET ${scalar.map((k) => `${k}=?`).join(',')} WHERE id=?`, [...scalar.map((k) => next[k]), taskId]);
    const addedAssignees = [];
    if (assigneesChanged) {
      const before = new Set([task.primary_assignee_id, ...current.co_assignee_ids].filter(Boolean));
      if (after.length) await conn.query('DELETE FROM task_assignees WHERE task_id=? AND user_id NOT IN (?)', [taskId, after]);
      else await conn.execute('DELETE FROM task_assignees WHERE task_id=?', [taskId]);
      for (const id of after) {
        await conn.execute('INSERT INTO task_assignees(task_id,user_id,is_primary) VALUES(?,?,?) ON DUPLICATE KEY UPDATE is_primary=VALUES(is_primary)', [taskId, id, id === primary ? 1 : 0]);
        if (!before.has(id)) addedAssignees.push(id);
      }
    }
    await conn.commit();
    committed = true;
    return reply(200, { changed }, { notify: { task, changed, addedAssignees } });
  } finally {
    if (!committed) await conn.rollback().catch(() => {});
    conn.release();
  }
}

module.exports = { applyTaskBatch, taskEditableFields, FIELD_LABEL };
