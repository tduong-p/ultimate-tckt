const { dateInVietnam } = require('../date-vn');

const FIELD_LABEL = {
  title: 'Tiêu đề', description: 'Mô tả', deadline: 'Hạn', start_date: 'Ngày bắt đầu', priority: 'Ưu tiên',
  team_id: 'Tổ điều phối', event_lead_id: 'Người phụ trách sự kiện'
};
const LIGHT = ['title', 'description'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const DATE_FIELDS = ['deadline', 'start_date'];
const ID_FIELDS = ['team_id', 'event_lead_id'];
const REQUIRED = ['title', 'description', 'deadline'];
const MAX_LENGTH = { title: 180 };
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const reply = (status, body, extra = {}) => ({ status, body, ...extra });

// Trường người gọi được sửa: điều hành sửa tất cả; trưởng sự kiện chỉ nhóm nhẹ; người khác không sửa được gì.
async function activityEditableFields(context, actor, activity) {
  if (context.isExecutive(actor)) return Object.keys(FIELD_LABEL);
  if (activity.event_lead_id && activity.event_lead_id === actor.id) return LIGHT;
  return [];
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
function shapeError(next) {
  for (const field of REQUIRED) {
    if (next[field] !== undefined && !next[field]) return `${FIELD_LABEL[field]} không được để trống.`;
  }
  if (next.priority !== undefined && !PRIORITIES.includes(next.priority)) return 'Mức ưu tiên không hợp lệ.';
  for (const field of DATE_FIELDS) {
    if (next[field] && !validDate(next[field])) return `${FIELD_LABEL[field]} không hợp lệ.`;
  }
  for (const [field, max] of Object.entries(MAX_LENGTH)) {
    if (typeof next[field] === 'string' && next[field].length > max) return `${FIELD_LABEL[field]} tối đa ${max} ký tự.`;
  }
  for (const field of ID_FIELDS) {
    if (next[field] !== undefined && next[field] !== null && (!Number.isInteger(next[field]) || next[field] <= 0)) return `${FIELD_LABEL[field]} không hợp lệ.`;
  }
  if (next.team_id === null) return 'Tổ điều phối không được để trống.';
  return null;
}

async function applyActivityBatch(context, { actor, activityId, changes, base }) {
  const { db } = context;
  if (!changes || typeof changes !== 'object' || Array.isArray(changes)) return reply(400, { error: 'Thiếu nội dung thay đổi.' });
  const baseValues = base && typeof base === 'object' && !Array.isArray(base) ? base : {};
  const keys = Object.keys(changes);
  const unknown = keys.filter((k) => !FIELD_LABEL[k]);
  if (unknown.length) return reply(400, { error: 'Trường không hợp lệ.', fields: unknown });
  const next = {};
  for (const k of keys) next[k] = normalize(k, changes[k]);
  const invalid = shapeError(next);
  if (invalid) return reply(400, { error: invalid });

  const conn = await db.getConnection();
  let committed = false;
  try {
    await conn.beginTransaction();
    // Khoá hàng để kiểm tra xung đột và ghi là một bước nguyên tử.
    const [rows] = await conn.execute(
      "SELECT a.*,DATE_FORMAT(a.deadline,'%Y-%m-%d') deadline,DATE_FORMAT(a.start_date,'%Y-%m-%d') start_date FROM activities a WHERE a.id=? FOR UPDATE",
      [activityId]
    );
    const activity = rows[0];
    if (!activity) return reply(404, { error: 'Không tìm thấy hoạt động.' });

    const editable = await activityEditableFields(context, actor, activity);
    const forbidden = keys.filter((k) => !editable.includes(k));
    if (forbidden.length) return reply(403, { error: 'Bạn không có quyền sửa các trường này.', forbidden });

    const changed = keys.filter((k) => !same(normalize(k, activity[k]), next[k]));
    const conflicts = changed.filter((k) => k in baseValues && !same(normalize(k, baseValues[k]), normalize(k, activity[k])));
    if (conflicts.length) return reply(409, { error: 'Dữ liệu đã được người khác thay đổi.', conflicts });
    if (!changed.length) return reply(200, { changed: [] });

    if (changed.includes('team_id')) {
      const [teams] = await conn.execute('SELECT id FROM teams WHERE id=? AND is_active=1', [next.team_id]);
      if (!teams.length) return reply(400, { error: 'Tổ không tồn tại.' });
    }
    if (changed.includes('event_lead_id') && next.event_lead_id !== null) {
      const [users] = await conn.execute('SELECT id FROM users WHERE id=? AND is_active=1', [next.event_lead_id]);
      if (!users.length) return reply(400, { error: 'Người phụ trách không tồn tại hoặc đã ngừng hoạt động.' });
    }

    await conn.execute(`UPDATE activities SET ${changed.map((k) => `${k}=?`).join(',')} WHERE id=?`, [...changed.map((k) => next[k]), activityId]);
    if (changed.includes('team_id')) {
      // Giữ activity_teams khớp với tổ điều phối mới (không gỡ tổ nào).
      await conn.execute("INSERT INTO activity_teams(activity_id,team_id,role,responsibility) VALUES(?,?,'primary','Coordinates the activity') ON DUPLICATE KEY UPDATE role='primary'", [activityId, next.team_id]);
      await conn.execute("UPDATE activity_teams SET role=IF(team_id=?,'primary','supporting') WHERE activity_id=?", [next.team_id, activityId]);
    }
    await conn.commit();
    committed = true;
    return reply(200, { changed }, { notify: { activity, changed, previousEventLeadId: activity.event_lead_id } });
  } finally {
    if (!committed) await conn.rollback().catch(() => {});
    conn.release();
  }
}

module.exports = { applyActivityBatch, activityEditableFields, FIELD_LABEL };
