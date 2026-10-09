'use strict';

/** Map id → giá trị của `column` trong `table` (table/column là hằng trong code, không đến từ người dùng). */
async function labelMap(db, table, column, ids) {
  const unique = [...new Set(ids.filter(id => id !== null && id !== undefined))];
  if (!unique.length) return new Map();
  const [rows] = await db.execute(
    `SELECT id, ${column} AS label FROM ${table} WHERE id IN (${unique.map(() => '?').join(',')})`,
    unique
  );
  return new Map((rows || []).map(r => [r.id, r.label]));
}

/** Gắn tên đơn vị gửi/nhận, người tạo và người phụ trách vào các dòng chỉ đạo. */
async function withDirectiveNames(db, rows) {
  if (!rows.length) return rows;
  const units = await labelMap(db, 'org_units', 'name', rows.flatMap(r => [r.from_unit_id, r.to_unit_id]));
  const users = await labelMap(db, 'users', 'name', rows.flatMap(r => [r.created_by, r.owner_user_id]));
  return rows.map(r => ({
    ...r,
    from_unit_name: units.get(r.from_unit_id) ?? null,
    to_unit_name: units.get(r.to_unit_id) ?? null,
    created_by_name: users.get(r.created_by) ?? null,
    owner_name: users.get(r.owner_user_id) ?? null
  }));
}

/** Gắn tên đơn vị, người nộp/phản hồi và tiêu đề hoạt động nguồn vào các dòng trình. */
async function withSubmissionNames(db, rows) {
  if (!rows.length) return rows;
  const units = await labelMap(db, 'org_units', 'name', rows.flatMap(r => [r.from_unit_id, r.to_unit_id]));
  const users = await labelMap(db, 'users', 'name', rows.flatMap(r => [r.submitted_by, r.responded_by]));
  const activities = await labelMap(db, 'activities', 'title', rows.filter(r => r.source_type === 'activity').map(r => r.source_id));
  return rows.map(r => ({
    ...r,
    from_unit_name: units.get(r.from_unit_id) ?? null,
    to_unit_name: units.get(r.to_unit_id) ?? null,
    submitted_by_name: users.get(r.submitted_by) ?? null,
    responded_by_name: users.get(r.responded_by) ?? null,
    source_title: r.source_type === 'activity' ? (activities.get(r.source_id) ?? null) : null
  }));
}

module.exports = { withDirectiveNames, withSubmissionNames };
