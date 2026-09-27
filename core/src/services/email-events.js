'use strict';
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { getSmtpConfig } = require('./email-settings');
const { evaluateConditions, getByPath } = require('./email-condition-evaluator');

const registry = new Map();
const ROLE_VALUES = ['admin', 'vice_admin', 'leader', 'vice_leader', 'member'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function registerEmailEvent(key, { fields = [], samplePayload = {} } = {}) {
  registry.set(key, { key, fields, samplePayload });
}

function getEventCatalog() {
  return [...registry.values()];
}

function getEvent(key) {
  return registry.get(key) || null;
}

registerEmailEvent('system.test_event', {
  fields: [
    { path: 'user.name', label: 'Tên người dùng', type: 'string' },
    { path: 'user.email', label: 'Email người dùng', type: 'email' },
    { path: 'message', label: 'Nội dung', type: 'string' }
  ],
  samplePayload: { user: { name: 'Nguyễn Văn A', email: 'test@hust.edu.vn' }, message: 'Đây là sự kiện demo để kiểm tra module Email.' }
});

registerEmailEvent('activity.approved', {
  fields: [
    { path: 'activity.id', label: 'ID hoạt động', type: 'number' },
    { path: 'activity.title', label: 'Tên hoạt động', type: 'string' },
    { path: 'activity.type', label: 'Loại hoạt động (event/assigned)', type: 'string' },
    { path: 'activity.priority', label: 'Mức ưu tiên', type: 'string' },
    { path: 'activity.deadline', label: 'Hạn chót', type: 'string' },
    { path: 'activity.primary_team_name', label: 'Tổ chủ trì', type: 'string' },
    { path: 'approved_by', label: 'Người duyệt', type: 'string' },
    { path: 'team_ids', label: 'Các Tổ được giao (ID)', type: 'team_ids' }
  ],
  samplePayload: {
    activity: { id: 1, title: 'Chiến dịch mùa hè xanh', type: 'event', priority: 'high', deadline: '2026-10-01', primary_team_name: 'Tổ Truyền thông' },
    approved_by: 'Trưởng Ban',
    team_ids: [1]
  }
});

registerEmailEvent('activity.rejected', {
  fields: [
    { path: 'activity.id', label: 'ID hoạt động', type: 'number' },
    { path: 'activity.title', label: 'Tên hoạt động', type: 'string' },
    { path: 'creator.name', label: 'Tên người đề xuất', type: 'string' },
    { path: 'creator.email', label: 'Email người đề xuất', type: 'email' },
    { path: 'feedback_note', label: 'Ghi chú (đã định dạng sẵn)', type: 'string' },
    { path: 'decided_by', label: 'Người xử lý', type: 'string' },
    { path: 'url', label: 'Đường dẫn hoạt động', type: 'string' }
  ],
  samplePayload: {
    activity: { id: 1, title: 'Chiến dịch mùa hè xanh' },
    creator: { name: 'Nguyễn Văn A', email: 'creator@hust.edu.vn' },
    feedback_note: 'Ghi chú: Không đủ nguồn lực thực hiện.',
    decided_by: 'Trưởng Ban',
    url: ''
  }
});

registerEmailEvent('activity.changes_requested', {
  fields: [
    { path: 'activity.id', label: 'ID hoạt động', type: 'number' },
    { path: 'activity.title', label: 'Tên hoạt động', type: 'string' },
    { path: 'creator.name', label: 'Tên người đề xuất', type: 'string' },
    { path: 'creator.email', label: 'Email người đề xuất', type: 'email' },
    { path: 'feedback_note', label: 'Ghi chú (đã định dạng sẵn)', type: 'string' },
    { path: 'decided_by', label: 'Người xử lý', type: 'string' },
    { path: 'url', label: 'Đường dẫn hoạt động', type: 'string' }
  ],
  samplePayload: {
    activity: { id: 1, title: 'Chiến dịch mùa hè xanh' },
    creator: { name: 'Nguyễn Văn A', email: 'creator@hust.edu.vn' },
    feedback_note: 'Ghi chú: Vui lòng bổ sung kế hoạch chi tiết.',
    decided_by: 'Trưởng Ban',
    url: ''
  }
});

registerEmailEvent('activity.proposed', {
  fields: [
    { path: 'activity.id', label: 'ID hoạt động', type: 'number' },
    { path: 'activity.title', label: 'Tên hoạt động', type: 'string' },
    { path: 'activity.type', label: 'Loại hoạt động (event/assigned)', type: 'string' },
    { path: 'activity.start_date', label: 'Ngày bắt đầu', type: 'string' },
    { path: 'activity.deadline', label: 'Hạn hoạt động', type: 'string' },
    { path: 'activity.priority', label: 'Mức ưu tiên', type: 'string' },
    { path: 'proposed_by', label: 'Người đề xuất', type: 'string' },
    { path: 'url', label: 'Đường dẫn hoạt động', type: 'string' }
  ],
  samplePayload: {
    activity: { id: 1, title: 'Chiến dịch mùa hè xanh', type: 'event', start_date: '2026-09-01', deadline: '2026-10-01', priority: 'high' },
    proposed_by: 'Nguyễn Văn A',
    url: ''
  }
});

registerEmailEvent('activity.participant_added', {
  fields: [
    { path: 'user.id', label: 'ID người nhận', type: 'number' },
    { path: 'user.name', label: 'Tên người nhận', type: 'string' },
    { path: 'user.email', label: 'Email người nhận', type: 'email' },
    { path: 'activity.id', label: 'ID hoạt động', type: 'number' },
    { path: 'activity.title', label: 'Tên hoạt động', type: 'string' },
    { path: 'activity.deadline', label: 'Hạn hoạt động', type: 'string' },
    { path: 'responsibility', label: 'Vai trò/Nhiệm vụ', type: 'string' },
    { path: 'added_by', label: 'Người thêm', type: 'string' },
    { path: 'url', label: 'Đường dẫn hoạt động', type: 'string' }
  ],
  samplePayload: {
    user: { id: 2, name: 'Trần Thị B', email: 'member@hust.edu.vn' },
    activity: { id: 1, title: 'Chiến dịch mùa hè xanh', deadline: '2026-10-01' },
    responsibility: 'Người tham gia hoạt động',
    added_by: 'Nguyễn Văn A',
    url: ''
  }
});

registerEmailEvent('task.assigned', {
  fields: [
    { path: 'user.id', label: 'ID người được giao', type: 'number' },
    { path: 'user.name', label: 'Tên người được giao', type: 'string' },
    { path: 'user.email', label: 'Email người được giao', type: 'email' },
    { path: 'task.id', label: 'ID công việc', type: 'number' },
    { path: 'task.title', label: 'Tên công việc', type: 'string' },
    { path: 'task.activity_title', label: 'Tên hoạt động', type: 'string' },
    { path: 'task.deadline', label: 'Hạn hoàn thành', type: 'string' },
    { path: 'task.priority', label: 'Mức ưu tiên', type: 'string' },
    { path: 'task.deliverable', label: 'Sản phẩm cần bàn giao', type: 'string' },
    { path: 'assigned_by', label: 'Người giao việc', type: 'string' },
    { path: 'url', label: 'Đường dẫn hoạt động', type: 'string' }
  ],
  samplePayload: {
    user: { id: 2, name: 'Trần Thị B', email: 'member@hust.edu.vn' },
    task: { id: 1, title: 'Chuẩn bị hậu cần', activity_title: 'Chiến dịch mùa hè xanh', deadline: '2026-10-01', priority: 'medium', deliverable: 'Danh sách vật tư' },
    assigned_by: 'Nguyễn Văn A',
    url: ''
  }
});

registerEmailEvent('task.response_posted', {
  fields: [
    { path: 'owner.id', label: 'ID người phụ trách', type: 'number' },
    { path: 'owner.name', label: 'Tên người phụ trách', type: 'string' },
    { path: 'owner.email', label: 'Email người phụ trách', type: 'email' },
    { path: 'task.id', label: 'ID công việc', type: 'number' },
    { path: 'task.title', label: 'Tên công việc', type: 'string' },
    { path: 'task.activity_title', label: 'Tên hoạt động', type: 'string' },
    { path: 'responded_by', label: 'Người phản hồi', type: 'string' },
    { path: 'response_kind_label', label: 'Loại phản hồi (đã dịch)', type: 'string' },
    { path: 'response_body', label: 'Nội dung phản hồi', type: 'string' },
    { path: 'url', label: 'Đường dẫn hoạt động', type: 'string' }
  ],
  samplePayload: {
    owner: { id: 1, name: 'Nguyễn Văn A', email: 'owner@hust.edu.vn' },
    task: { id: 1, title: 'Chuẩn bị hậu cần', activity_title: 'Chiến dịch mùa hè xanh' },
    responded_by: 'Trần Thị B',
    response_kind_label: 'Cập nhật tiến độ',
    response_body: 'Đã hoàn thành 50%.',
    url: ''
  }
});

registerEmailEvent('task.submitted_for_review', {
  fields: [
    { path: 'reviewer.id', label: 'ID người nghiệm thu', type: 'number' },
    { path: 'reviewer.name', label: 'Tên người nghiệm thu', type: 'string' },
    { path: 'reviewer.email', label: 'Email người nghiệm thu', type: 'email' },
    { path: 'task.id', label: 'ID công việc', type: 'number' },
    { path: 'task.title', label: 'Tên công việc', type: 'string' },
    { path: 'task.activity_title', label: 'Tên hoạt động', type: 'string' },
    { path: 'submitted_by', label: 'Người nộp', type: 'string' },
    { path: 'url', label: 'Đường dẫn hoạt động', type: 'string' }
  ],
  samplePayload: {
    reviewer: { id: 1, name: 'Nguyễn Văn A', email: 'reviewer@hust.edu.vn' },
    task: { id: 1, title: 'Chuẩn bị hậu cần', activity_title: 'Chiến dịch mùa hè xanh' },
    submitted_by: 'Trần Thị B',
    url: ''
  }
});

registerEmailEvent('task.reviewed', {
  fields: [
    { path: 'user.id', label: 'ID người được duyệt', type: 'number' },
    { path: 'user.name', label: 'Tên người được duyệt', type: 'string' },
    { path: 'user.email', label: 'Email người được duyệt', type: 'email' },
    { path: 'task.id', label: 'ID công việc', type: 'number' },
    { path: 'task.title', label: 'Tên công việc', type: 'string' },
    { path: 'heading', label: 'Tiêu đề (đã dựng sẵn theo quyết định)', type: 'string' },
    { path: 'action_text', label: 'Hành động (đã dịch)', type: 'string' },
    { path: 'feedback_note', label: 'Nhận xét (đã định dạng sẵn)', type: 'string' },
    { path: 'reviewed_by', label: 'Người nghiệm thu', type: 'string' },
    { path: 'url', label: 'Đường dẫn hoạt động', type: 'string' }
  ],
  samplePayload: {
    user: { id: 2, name: 'Trần Thị B', email: 'member@hust.edu.vn' },
    task: { id: 1, title: 'Chuẩn bị hậu cần' },
    heading: 'Công việc của bạn đã được duyệt đạt',
    action_text: 'duyệt đạt',
    feedback_note: '',
    reviewed_by: 'Nguyễn Văn A',
    url: ''
  }
});

registerEmailEvent('task.deadline_soon', {
  fields: [
    { path: 'user.id', label: 'ID người phụ trách', type: 'number' },
    { path: 'user.name', label: 'Tên người phụ trách', type: 'string' },
    { path: 'user.email', label: 'Email người phụ trách', type: 'email' },
    { path: 'task.id', label: 'ID công việc', type: 'number' },
    { path: 'task.title', label: 'Tên công việc', type: 'string' },
    { path: 'task.activity_title', label: 'Tên hoạt động', type: 'string' },
    { path: 'task.deadline', label: 'Hạn hoàn thành', type: 'string' },
    { path: 'window_text', label: 'Khoảng thời gian còn lại (đã dịch)', type: 'string' },
    { path: 'url', label: 'Đường dẫn hoạt động', type: 'string' }
  ],
  samplePayload: {
    user: { id: 2, name: 'Trần Thị B', email: 'member@hust.edu.vn' },
    task: { id: 1, title: 'Chuẩn bị hậu cần', activity_title: 'Chiến dịch mùa hè xanh', deadline: '2026-10-01' },
    window_text: '24 giờ',
    url: ''
  }
});

registerEmailEvent('task.overdue', {
  fields: [
    { path: 'user.id', label: 'ID người phụ trách', type: 'number' },
    { path: 'user.name', label: 'Tên người phụ trách', type: 'string' },
    { path: 'user.email', label: 'Email người phụ trách', type: 'email' },
    { path: 'task.id', label: 'ID công việc', type: 'number' },
    { path: 'task.title', label: 'Tên công việc', type: 'string' },
    { path: 'task.activity_title', label: 'Tên hoạt động', type: 'string' },
    { path: 'task.deadline', label: 'Hạn hoàn thành', type: 'string' },
    { path: 'url', label: 'Đường dẫn hoạt động', type: 'string' }
  ],
  samplePayload: {
    user: { id: 2, name: 'Trần Thị B', email: 'member@hust.edu.vn' },
    task: { id: 1, title: 'Chuẩn bị hậu cần', activity_title: 'Chiến dịch mùa hè xanh', deadline: '2026-09-20' },
    url: ''
  }
});

registerEmailEvent('task.unacknowledged', {
  fields: [
    { path: 'lead.id', label: 'ID tổ trưởng/phó', type: 'number' },
    { path: 'lead.name', label: 'Tên tổ trưởng/phó', type: 'string' },
    { path: 'lead.email', label: 'Email tổ trưởng/phó', type: 'email' },
    { path: 'task.id', label: 'ID công việc', type: 'number' },
    { path: 'task.title', label: 'Tên công việc', type: 'string' },
    { path: 'member_name', label: 'Tên thành viên chưa xác nhận', type: 'string' },
    { path: 'url', label: 'Đường dẫn hoạt động', type: 'string' }
  ],
  samplePayload: {
    lead: { id: 1, name: 'Nguyễn Văn A', email: 'lead@hust.edu.vn' },
    task: { id: 1, title: 'Chuẩn bị hậu cần' },
    member_name: 'Trần Thị B',
    url: ''
  }
});

function renderTemplate(str, payload) {
  return String(str || '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, path) => {
    const value = getByPath(payload, path);
    return value === undefined || value === null ? '' : String(value);
  });
}

function parseJsonColumn(value) {
  if (value === null || value === undefined) return value;
  return typeof value === 'string' ? JSON.parse(value) : value;
}

function validateRecipients(recipients, fieldsByPath) {
  if (!Array.isArray(recipients) || recipients.length === 0) throw new Error('Cần ít nhất 1 người nhận.');
  if (recipients.length > 20) throw new Error('Tối đa 20 mục người nhận cho mỗi rule.');
  for (const entry of recipients) {
    if (!entry || !['static_email', 'role', 'payload_path', 'team_members'].includes(entry.type)) throw new Error(`Loại người nhận (type) không hợp lệ: ${entry?.type}`);
    if (typeof entry.value !== 'string' || !entry.value) throw new Error('Người nhận cần có value.');
    if (entry.type === 'static_email' && !EMAIL_REGEX.test(entry.value)) throw new Error(`Địa chỉ email không hợp lệ: ${entry.value}`);
    if (entry.type === 'role' && !ROLE_VALUES.includes(entry.value)) throw new Error(`Role không hợp lệ: ${entry.value}`);
    if (entry.type === 'payload_path' && fieldsByPath) {
      const field = fieldsByPath.get(entry.value);
      if (!field || field.type !== 'email') throw new Error(`payload_path người nhận phải trỏ tới field kiểu email đã đăng ký: ${entry.value}`);
    }
    if (entry.type === 'team_members' && fieldsByPath) {
      const field = fieldsByPath.get(entry.value);
      if (!field || !['team_id', 'team_ids'].includes(field.type)) throw new Error(`team_members người nhận phải trỏ tới field kiểu team_id/team_ids đã đăng ký: ${entry.value}`);
    }
  }
}

async function resolveRecipients(db, recipients, payload) {
  const emails = new Set();
  for (const entry of recipients || []) {
    if (entry.type === 'static_email') {
      emails.add(entry.value.toLowerCase());
    } else if (entry.type === 'role') {
      const [rows] = await db.execute('SELECT email FROM users WHERE role=? AND is_active=1', [entry.value]);
      rows.forEach(row => emails.add(String(row.email).toLowerCase()));
    } else if (entry.type === 'payload_path') {
      const value = getByPath(payload, entry.value);
      const values = Array.isArray(value) ? value : [value];
      values.filter(v => typeof v === 'string' && v).forEach(v => emails.add(v.toLowerCase()));
    } else if (entry.type === 'team_members') {
      const value = getByPath(payload, entry.value);
      const teamIds = (Array.isArray(value) ? value : [value]).map(Number).filter(n => Number.isInteger(n) && n > 0);
      if (teamIds.length) {
        const marks = teamIds.map(() => '?').join(',');
        const [rows] = await db.query(`SELECT DISTINCT u.email FROM users u JOIN user_teams ut ON ut.user_id=u.id WHERE u.is_active=1 AND ut.team_id IN (${marks})`, teamIds);
        rows.forEach(row => emails.add(String(row.email).toLowerCase()));
      }
    }
  }
  return [...emails];
}

async function simulateRule(db, rule, payload) {
  const conditions = parseJsonColumn(rule.conditions);
  const matched = evaluateConditions(conditions, payload);
  if (!matched) return { matched: false, recipients: [], subject: '', body: '' };
  const recipients = await resolveRecipients(db, parseJsonColumn(rule.recipients), payload);
  const [rows] = await db.execute('SELECT * FROM email_templates WHERE id=?', [rule.template_id]);
  const template = rows[0];
  if (!template) return { matched: true, recipients, subject: '', body: '' };
  return { matched: true, recipients, subject: renderTemplate(template.subject, payload), body: renderTemplate(template.body_html, payload) };
}

function buildTransporter(smtp) {
  return nodemailer.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.secure, auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined });
}

async function sendRaw(db, { to, subject, html, text }) {
  const smtp = await getSmtpConfig(db);
  if (!smtp.host) throw Object.assign(new Error('SMTP chưa được cấu hình.'), { code: 'SMTP_NOT_CONFIGURED' });
  const transporter = buildTransporter(smtp);
  return transporter.sendMail({ from: { name: smtp.fromName, address: smtp.fromEmail }, to, subject, html, text: text || html?.replace(/<[^>]+>/g, '') });
}

function dedupeKeyFor(eventKey, ruleId, email, payload) {
  const seed = payload && payload.dedupe_seed ? String(payload.dedupe_seed) : JSON.stringify(payload || {});
  return crypto.createHash('sha1').update(`${eventKey}:${ruleId}:${email}:${seed}`).digest('hex');
}

async function recordDelivery(db, { ruleId, eventKey, templateId, recipientEmail, subjectRendered, status, errorMessage, payload, sentAt }) {
  const dedupeKey = dedupeKeyFor(eventKey, ruleId, recipientEmail, payload);
  const [result] = await db.execute(
    'INSERT IGNORE INTO email_deliveries(rule_id,event_key,template_id,recipient_email,subject_rendered,status,error_message,dedupe_key,event_payload_snapshot,sent_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [ruleId, eventKey, templateId || null, recipientEmail, subjectRendered || null, status, errorMessage || null, dedupeKey, JSON.stringify(payload || {}), sentAt || null]
  );
  return result.affectedRows > 0;
}

async function dispatch(db, eventKey, payload, { logger } = {}) {
  const smtp = await getSmtpConfig(db);
  if (!smtp.enabled) return { sent: 0, skipped: 'disabled' };
  const [rules] = await db.execute('SELECT * FROM email_rules WHERE event_key=? AND is_active=1 ORDER BY priority DESC', [eventKey]);
  let sent = 0;
  for (const rule of rules) {
    const conditions = parseJsonColumn(rule.conditions);
    if (!evaluateConditions(conditions, payload)) continue;
    const recipients = await resolveRecipients(db, parseJsonColumn(rule.recipients), payload);
    if (recipients.length === 0) continue;
    if (recipients.length > smtp.maxRecipientsPerSend) {
      await recordDelivery(db, { ruleId: rule.id, eventKey, templateId: rule.template_id, recipientEmail: recipients[0], status: 'failed', errorMessage: `Recipient cap exceeded (${recipients.length} > ${smtp.maxRecipientsPerSend})`, payload });
      logger?.error?.(`Email rule ${rule.id} exceeded recipient cap; skipped.`);
      continue;
    }
    const [templateRows] = await db.execute('SELECT * FROM email_templates WHERE id=? AND is_active=1', [rule.template_id]);
    const template = templateRows[0];
    if (!template) {
      await recordDelivery(db, { ruleId: rule.id, eventKey, templateId: rule.template_id, recipientEmail: recipients[0], status: 'failed', errorMessage: 'Template not found or inactive', payload });
      continue;
    }
    const subject = renderTemplate(template.subject, payload);
    const body = renderTemplate(template.body_html, payload);
    for (const recipientEmail of recipients) {
      const isNew = await recordDelivery(db, { ruleId: rule.id, eventKey, templateId: template.id, recipientEmail, subjectRendered: subject, status: 'pending', payload });
      if (!isNew) continue; // already sent for this exact occurrence
      try {
        await sendRaw(db, { to: recipientEmail, subject, html: body });
        await db.execute('UPDATE email_deliveries SET status=?, sent_at=NOW() WHERE dedupe_key=?', ['success', dedupeKeyFor(eventKey, rule.id, recipientEmail, payload)]);
        sent += 1;
      } catch (error) {
        await db.execute('UPDATE email_deliveries SET status=?, error_message=? WHERE dedupe_key=?', ['failed', error.message, dedupeKeyFor(eventKey, rule.id, recipientEmail, payload)]);
        logger?.error?.(`Email dispatch failed for rule ${rule.id} -> ${recipientEmail}.`, error);
      }
    }
  }
  return { sent, skipped: null };
}

function emit(db, eventKey, payload, { logger } = {}) {
  setImmediate(() => dispatch(db, eventKey, payload, { logger }).catch(error => logger?.error?.(`emailEvents.emit failed for ${eventKey}.`, error)));
}

module.exports = {
  registerEmailEvent, getEventCatalog, getEvent, renderTemplate, resolveRecipients, validateRecipients, simulateRule, dispatch, emit, sendRaw
};
