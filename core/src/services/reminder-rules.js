'use strict';
// Luật thuần (không DB) cho thông báo nhắc hạn. Xem docs/specs/2026-10-05-core-noti-49-design.md §3.
const { dateInVietnam, hourInVietnam, addDaysVietnam } = require('../date-vn');

const HOUR_MS = 3600000;

function isSendingHour(now) {
  const hour = hourInVietnam(now);
  return hour >= 7 && hour <= 21;
}

function deadlineWindow(deadlineDay, now) {
  if (deadlineDay === addDaysVietnam(now, 1)) return { code: '1d', label: '1 ngày' };
  if (deadlineDay === dateInVietnam(now)) return { code: 'today', label: 'hôm nay' };
  return null;
}

function isUnacknowledgedDue(assignedAt, now) {
  const age = now.getTime() - new Date(assignedAt).getTime();
  return age >= 24 * HOUR_MS && age < 168 * HOUR_MS;
}

const sourceKeys = {
  deadline: (code, taskId, userId, deadlineDay) => `task-deadline-${code}:${taskId}:${userId}:${deadlineDay}`,
  overdue: (taskId, userId, todayVn) => `task-overdue:${taskId}:${userId}:${todayVn}`,
  unacknowledged: (taskId, memberId, assignedAt) =>
    `task-unacknowledged:${taskId}:${memberId}:${Math.floor(new Date(assignedAt).getTime() / 1000)}`
};

// Kết quả notify() -> giá trị notifications.email_status.
function emailStatusFor(result) {
  if (result && result.delivered) return 'success';
  if (result && result.retryable) return 'pending';
  if (result && result.reason === 'no-sender') return null;
  return 'failed';
}

module.exports = { isSendingHour, deadlineWindow, isUnacknowledgedDue, sourceKeys, emailStatusFor };
