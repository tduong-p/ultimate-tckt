'use strict';

// Sender cho core/src/notifier.js: đổi event của Core sang POST /v1/notifications của Noti (docs/dev/email-cron.md).
// Lỗi ở đây chỉ ném ra cho facade ghi log; facade đã đảm bảo không làm lỗi hay treo request.

const LABELS = {
  'activity.decided': { field: ['action'], values: { approve: 'Đã phê duyệt', reject: 'Đã từ chối', request_changes: 'Yêu cầu chỉnh sửa' } },
  'task.reviewed': { field: ['decision'], values: { approve: 'Đã nghiệm thu đạt', reject: 'Yêu cầu làm lại', cancel: 'Đã bác bỏ' } },
  'task.response': { field: ['response', 'kind'], values: { comment: 'Bình luận', progress: 'Cập nhật tiến độ', evidence: 'Minh chứng', issue: 'Vướng mắc', review_note: 'Ghi chú nghiệm thu' } },
};

// Noti từ chối body > 64 KB (413, thân rỗng); bình luận dài bị cắt để thư vẫn đi.
const MAX_RESPONSE_BODY = 4000;

const pad = n => String(n).padStart(2, '0');

// mysql2 trả cột DATE thành nửa đêm theo giờ máy chủ, nên đọc lại bằng giờ máy chủ để không lệch ngày.
function formatDate(date) {
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return date.getHours() || date.getMinutes() ? `${day} ${pad(date.getHours())}:${pad(date.getMinutes())}` : day;
}

function clean(value) {
  if (value instanceof Date) return formatDate(value);
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      if (item === undefined || item === null || item === '') continue;
      out[key] = clean(item);
    }
    return out;
  }
  return value;
}

function applyLabels(eventName, data) {
  const rule = LABELS[eventName];
  if (!rule) return data;
  const parent = rule.field.slice(0, -1).reduce((v, k) => (v && typeof v === 'object' ? v[k] : undefined), data);
  const key = rule.field[rule.field.length - 1];
  if (parent && typeof parent === 'object' && Object.hasOwn(rule.values, parent[key])) parent[key] = rule.values[parent[key]];
  return data;
}

function truncateResponseBody(data) {
  const body = data.response && data.response.body;
  if (typeof body === 'string' && body.length > MAX_RESPONSE_BODY) data.response.body = `${body.slice(0, MAX_RESPONSE_BODY - 1)}…`;
  return data;
}

function toNotiPayload(event) {
  const recipient = { email: event.recipient.email };
  if (event.recipient.name) recipient.name = event.recipient.name;
  return {
    template: event.event,
    recipients: [recipient],
    data: truncateResponseBody(applyLabels(event.event, clean(event.data || {}))),
    dedupe_key: event.sourceKey,
  };
}

function createNotiSender({ url, apiKey, fetchImpl = fetch, timeoutMs = 5000 }) {
  const endpoint = `${String(url).replace(/\/+$/, '')}/v1/notifications`;
  return async function sendToNoti(event) {
    let response;
    try {
      response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(toNotiPayload(event)),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      // Lỗi của fetch có thể chép nguyên header (kèm key) vào message; chỉ giữ tên lỗi.
      throw new Error(`Noti request failed: ${error && error.name}`);
    }
    if (response.status === 200 || response.status === 202) {
      await response.body?.cancel?.();
      return;
    }
    let code = '';
    try { code = (await response.json())?.error || ''; } catch { /* thân rỗng, ví dụ 413 */ }
    // Scheduler gửi lại mỗi 15 phút; cùng khoá nhưng nội dung đã đổi (đổi tên, dời hạn) nghĩa là thư đã gửi rồi.
    if (response.status === 409 && code === 'dedupe_key_conflict') return;
    throw new Error(`Noti responded ${response.status}${code ? ` ${code}` : ''}`);
  };
}

function notiSenderFromEnv(env) {
  const url = String(env.NOTI_URL || '').trim();
  const apiKey = String(env.NOTI_API_KEY || '').trim();
  return url && apiKey ? createNotiSender({ url, apiKey }) : null;
}

module.exports = { toNotiPayload, createNotiSender, notiSenderFromEnv };
