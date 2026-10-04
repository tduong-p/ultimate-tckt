'use strict';

// Người nhận yêu cầu nghiệm thu: lead/vice-lead đang hoạt động của tổ + event_lead đang hoạt động của hoạt động,
// bỏ chính người thao tác. Không còn ai (ví dụ lead duy nhất tự nộp) → quản trị (admin, vice_admin) đang hoạt động.
async function findReviewRecipients(db, { teamId, activityId, actorId }) {
  const [rows] = await db.query(
    `SELECT u.id,u.name,u.email FROM users u JOIN user_teams ut ON ut.user_id=u.id
       WHERE ut.team_id=? AND (ut.is_lead=1 OR ut.is_vice_lead=1) AND u.is_active=1 AND u.id<>?
     UNION
     SELECT u.id,u.name,u.email FROM activities a JOIN users u ON u.id=a.event_lead_id
       WHERE a.id=? AND u.is_active=1 AND u.id<>?`,
    [teamId, actorId, activityId, actorId]
  );
  const byId = new Map();
  for (const row of rows) if (!byId.has(Number(row.id))) byId.set(Number(row.id), row);
  if (byId.size) return [...byId.values()];
  const [admins] = await db.query(
    "SELECT id,name,email FROM users WHERE role IN ('admin','vice_admin') AND is_active=1 AND id<>?",
    [actorId]
  );
  return admins;
}

module.exports = { findReviewRecipients };
