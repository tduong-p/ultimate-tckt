const nodemailer = require('nodemailer');
const logger = require('./logger');
const push = require('./push');

const gmailUser = String(process.env.GMAIL_USER || '').trim();
const gmailAppPassword = String(process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');
const appBaseUrl = String(process.env.APP_BASE_URL || '').replace(/\/$/, '');
const enabled = Boolean(gmailUser && gmailAppPassword);
const notificationEmailEnabled = process.env.EMAIL_NOTIFICATIONS_ENABLED !== 'false';
const transporter = enabled ? nodemailer.createTransport({
  service: 'gmail',
  auth: { user: gmailUser, pass: gmailAppPassword }
}) : null;

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);
const formatDate = value => value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'long', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value)) : 'Không xác định';
const priorityLabel = value => ({ low: 'Thấp', medium: 'Trung bình', high: 'Cao', urgent: 'Khẩn cấp' })[value] || value || 'Trung bình';
const activityUrl = activityId => appBaseUrl ? `${appBaseUrl}/#activity/${activityId}` : '';

async function send({ to, subject, heading, paragraphs, facts = [], url, buttonLabel = 'Mở hoạt động' }) {
  if (!enabled) throw Object.assign(new Error('Gmail chưa được cấu hình trên máy chủ.'), { code: 'EMAIL_DISABLED' });
  if (!to) throw Object.assign(new Error('Email người nhận bị thiếu.'), { code: 'EMAIL_RECIPIENT_MISSING' });
  const safeParagraphs = paragraphs.map(text => `<p style="margin:0 0 14px">${escapeHtml(text)}</p>`).join('');
  const safeFacts = facts.length ? `<table style="width:100%;border-collapse:collapse;margin:18px 0">${facts.map(([label, value]) => `<tr><td style="padding:7px;border-bottom:1px solid #e5e7eb;color:#64748b">${escapeHtml(label)}</td><td style="padding:7px;border-bottom:1px solid #e5e7eb;font-weight:600">${escapeHtml(value)}</td></tr>`).join('')}</table>` : '';
  const button = url ? `<p style="margin:22px 0 4px"><a href="${escapeHtml(url)}" style="background:#1e3a8a;color:#fff;padding:11px 18px;border-radius:7px;text-decoration:none;display:inline-block">${escapeHtml(buttonLabel)}</a></p>` : '';
  return transporter.sendMail({
    from: { name: process.env.MAIL_FROM_NAME || 'TCKT Activity Hub', address: gmailUser },
    to,
    subject,
    text: [heading, ...paragraphs, ...facts.map(([label, value]) => `${label}: ${value}`), url].filter(Boolean).join('\n\n'),
    html: `<div lang="vi" style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#1f2937"><h2 style="color:#1e3a8a">${escapeHtml(heading)}</h2>${safeParagraphs}${safeFacts}${button}<p style="margin-top:28px;color:#64748b;font-size:12px">Đây là email thông báo tự động từ TCKT Activity Hub.</p></div>`
  });
}

const deliveryDetails = info => ({ messageId: info.messageId, accepted: info.accepted, rejected: info.rejected, response: info.response });
const failureDetails = error => ({ name: error.name, message: error.message, code: error.code, command: error.command, responseCode: error.responseCode, response: error.response });

function reportDelivery(description, callback, status) {
  if (!callback) return;
  Promise.resolve(callback(status)).catch(error => logger.error(`Unable to record email notification status: ${description}.`, error));
}

function queueEmail(description, message, onDelivery) {
  if (!notificationEmailEnabled || !enabled) {
    reportDelivery(description, onDelivery, 'failed');
    return;
  }
  setImmediate(() => send(message)
    .then(info => {
      if (info) logger.info(`Email notification sent: ${description}.`, deliveryDetails(info));
      reportDelivery(description, onDelivery, 'success');
    })
    .catch(error => {
      logger.error(`Email notification failed: ${description}.`, failureDetails(error));
      reportDelivery(description, onDelivery, 'failed');
    }));
}

function notifyTaskAssigned(user, task, assignedBy) {
  queueEmail(`task ${task.id} to user ${user.id}`, {
    to: user.email,
    subject: `[TCKT - Activity Hub] Công việc mới: ${task.title}`,
    heading: 'Bạn được giao một công việc mới',
    paragraphs: [`Xin chào ${user.name},`, `${assignedBy || 'Quản trị viên'} vừa giao cho bạn một công việc trong hoạt động “${task.activity_title}”.`],
    facts: [['Người giao việc', assignedBy || 'Quản trị viên'], ['Công việc', task.title], ['Hạn hoàn thành', formatDate(task.deadline)], ['Mức ưu tiên', priorityLabel(task.priority)], ['Sản phẩm cần bàn giao', task.deliverable || 'Không xác định']],
    url: activityUrl(task.activity_id)
  });
  push.queuePush(`task ${task.id} to user ${user.id}`, {
    userId: user.id,
    title: 'Công việc mới',
    message: `${assignedBy || 'Quản trị viên'} đã giao cho bạn: ${task.title}`,
    url: activityUrl(task.activity_id)
  });
}

function notifyActivityRegistration(user, activity, responsibility, addedBy) {
  const responsibilityLabel = !responsibility || responsibility === 'Activity participant' ? 'Người tham gia hoạt động' : responsibility;
  queueEmail(`activity ${activity.id} to user ${user.id}`, {
    to: user.email,
    subject: `[TCKT - Activity Hub] Bạn được thêm vào hoạt động: ${activity.title}`,
    heading: 'Bạn đã được thêm vào một hoạt động',
    paragraphs: [`Xin chào ${user.name},`, `${addedBy || 'Quản trị viên'} vừa thêm bạn vào hoạt động “${activity.title}”.`],
    facts: [['Người thêm', addedBy || 'Quản trị viên'], ['Hạn hoạt động', formatDate(activity.deadline)], ['Vai trò/Nhiệm vụ', responsibilityLabel]],
    url: activityUrl(activity.id)
  });
  push.queuePush(`activity ${activity.id} to user ${user.id}`, {
    userId: user.id,
    title: 'Hoạt động mới',
    message: `${addedBy || 'Quản trị viên'} đã thêm bạn vào: ${activity.title}`,
    url: activityUrl(activity.id)
  });
}

function notifyActivityProposed(admin, activity, proposedBy) {
  queueEmail(`activity proposal ${activity.id} to admin ${admin.id}`, {
    to: admin.email,
    subject: `[TCKT - Activity Hub] Hoạt động mới chờ duyệt: ${activity.title}`,
    heading: 'Có một đề xuất hoạt động mới',
    paragraphs: [`Xin chào ${admin.name},`, `${proposedBy || 'Một người dùng'} vừa tạo đề xuất hoạt động “${activity.title}”.`],
    facts: [['Người đề xuất', proposedBy || 'Không xác định'], ['Loại hoạt động', activity.type === 'event' ? 'Sự kiện' : 'Công việc được giao'], ['Ngày bắt đầu', formatDate(activity.start_date)], ['Hạn hoạt động', formatDate(activity.deadline)], ['Mức ưu tiên', priorityLabel(activity.priority)]],
    url: activityUrl(activity.id),
    buttonLabel: 'Xem và duyệt hoạt động'
  });
  push.queuePush(`activity proposal ${activity.id} to admin ${admin.id}`, {
    userId: admin.id,
    title: 'Hoạt động chờ duyệt',
    message: `${proposedBy || 'Một người dùng'} đã đề xuất: ${activity.title}`,
    url: activityUrl(activity.id)
  });
}

function notifyTaskResponse(owner, task, respondedBy, response, delivery = {}) {
  const responseType = ({ comment: 'Bình luận', progress: 'Cập nhật tiến độ', issue: 'Vấn đề', evidence: 'Minh chứng' })[response.kind] || 'Phản hồi';
  const responseBody = String(response.body || '').trim();
  queueEmail(`task response on ${task.id} to user ${owner.id}`, {
    to: owner.email,
    subject: `[TCKT - Activity Hub] Phản hồi mới cho công việc: ${task.title}`,
    heading: 'Công việc của bạn có phản hồi mới',
    paragraphs: [`Xin chào ${owner.name},`, `${respondedBy || 'Một người dùng'} vừa phản hồi công việc “${task.title}” trong hoạt động “${task.activity_title}”.`],
    facts: [['Người phản hồi', respondedBy || 'Không xác định'], ['Loại phản hồi', responseType], ['Nội dung', responseBody.length > 500 ? `${responseBody.slice(0, 497)}...` : responseBody]],
    url: activityUrl(task.activity_id),
    buttonLabel: 'Xem phản hồi'
  }, delivery.email);
  push.queuePush(`task response on ${task.id} to user ${owner.id}`, {
    userId: owner.id,
    title: 'Phản hồi công việc mới',
    message: `${respondedBy || 'Một người dùng'} đã phản hồi: ${task.title}`,
    url: activityUrl(task.activity_id)
  }, delivery.push);
}

function notifyActivityDecision(user, activity, action, feedback, decidedBy) {
  const labels = { approve: 'đã được phê duyệt', reject: 'đã bị từ chối', request_changes: 'cần được chỉnh sửa' };
  const heading = { approve: 'Đề án đã được phê duyệt', reject: 'Đề án đã bị từ chối', request_changes: 'Đề án cần chỉnh sửa' }[action];
  queueEmail(`activity ${activity.id} decision (${action}) to user ${user.id}`, {
    to: user.email,
    subject: `[TCKT Activity Hub] Đề án "${activity.title}" ${labels[action]}`,
    heading,
    paragraphs: [`Xin chào ${user.name},`, `${decidedBy || 'Ban Chủ nhiệm'} vừa cập nhật đề án "${activity.title}": ${labels[action]}.`, ...(feedback ? [`Ghi chú: ${feedback}`] : [])],
    facts: [['Người xử lý', decidedBy || 'Ban Chủ nhiệm']],
    url: activityUrl(activity.id),
    buttonLabel: 'Xem đề án'
  });
  push.queuePush(`activity ${activity.id} decision (${action}) to user ${user.id}`, {
    userId: user.id,
    title: heading,
    message: `${decidedBy || 'Ban Chủ nhiệm'}: ${labels[action]}${feedback ? ` — ${feedback}` : ''}`,
    url: activityUrl(activity.id)
  });
}

function notifyTaskSubmittedForReview(reviewer, task, submittedBy) {
  queueEmail(`task ${task.id} submitted for review to user ${reviewer.id}`, {
    to: reviewer.email,
    subject: `[TCKT Activity Hub] Cần nghiệm thu: ${task.title}`,
    heading: 'Có sản phẩm chờ nghiệm thu',
    paragraphs: [`Xin chào ${reviewer.name},`, `${submittedBy} vừa nộp sản phẩm cho công việc "${task.title}". Vui lòng kiểm tra và nghiệm thu.`],
    url: activityUrl(task.activity_id),
    buttonLabel: 'Xem và nghiệm thu'
  });
  push.queuePush(`task ${task.id} submitted for review to user ${reviewer.id}`, { userId: reviewer.id, title: 'Cần nghiệm thu', message: `${submittedBy} vừa nộp: ${task.title}`, url: activityUrl(task.activity_id) });
}

function notifyTaskReviewed(user, task, decision, feedback, reviewedBy) {
  const heading = decision === 'approve'
    ? 'Công việc của bạn đã được duyệt đạt'
    : decision === 'cancel'
    ? 'Công việc của bạn đã bị bác bỏ'
    : 'Công việc của bạn cần làm lại';
  const actionText = decision === 'approve'
    ? 'duyệt đạt'
    : decision === 'cancel'
    ? 'bác bỏ'
    : 'yêu cầu làm lại';
  queueEmail(`task ${task.id} reviewed (${decision}) to user ${user.id}`, {
    to: user.email,
    subject: `[TCKT Activity Hub] ${heading}: ${task.title}`,
    heading,
    paragraphs: [`Xin chào ${user.name},`, `${reviewedBy} đã ${actionText} công việc "${task.title}".`, ...(feedback ? [`Nhận xét: ${feedback}`] : [])],
    url: activityUrl(task.activity_id)
  });
  push.queuePush(`task ${task.id} reviewed (${decision}) to user ${user.id}`, { userId: user.id, title: heading, message: feedback || task.title, url: activityUrl(task.activity_id) });
}

function notifyTaskDeadlineSoon(user, task, windowLabel) {
  queueEmail(`deadline ${windowLabel} task ${task.id} to user ${user.id}`, {
    to: user.email,
    subject: `[TCKT Activity Hub] Sắp đến hạn: ${task.title}`,
    heading: 'Công việc sắp đến hạn hoàn thành',
    paragraphs: [
      `Xin chào ${user.name},`,
      `Công việc "${task.title}" trong hoạt động "${task.activity_title}" sẽ đến hạn trong ${windowLabel === '4h' ? '4 giờ' : '24 giờ'} tới.`
    ],
    facts: [['Hạn hoàn thành', formatDate(task.deadline)]],
    url: activityUrl(task.activity_id),
    buttonLabel: 'Xem công việc'
  });
}

function notifyTaskOverdue(user, task) {
  queueEmail(`overdue task ${task.id} to user ${user.id}`, {
    to: user.email,
    subject: `[TCKT Activity Hub] Quá hạn: ${task.title}`,
    heading: 'Công việc đã quá hạn',
    paragraphs: [
      `Xin chào ${user.name},`,
      `Công việc "${task.title}" trong hoạt động "${task.activity_title}" đã quá hạn vào ngày ${formatDate(task.deadline)}. Vui lòng cập nhật tiến độ hoặc nộp sản phẩm.`
    ],
    facts: [['Hạn hoàn thành', formatDate(task.deadline)]],
    url: activityUrl(task.activity_id),
    buttonLabel: 'Xem công việc'
  });
}

function notifyTaskUnacknowledged(lead, task, memberName) {
  queueEmail(`task unacknowledged ${task.id} to lead ${lead.id}`, {
    to: lead.email,
    subject: `[TCKT Activity Hub] Thành viên chưa xác nhận việc: ${task.title}`,
    heading: 'Thành viên chưa xác nhận nhận việc',
    paragraphs: [
      `Xin chào ${lead.name},`,
      `Thành viên ${memberName} được giao công việc "${task.title}" nhưng chưa xác nhận nhận việc sau 24 giờ.`
    ],
    url: activityUrl(task.activity_id),
    buttonLabel: 'Xem công việc'
  });
}

async function sendTestEmail(to, requestedBy) {
  const description = `admin test to ${to}`;
  try {
    const info = await send({
      to,
      subject: '[TCKT - Activity Hub] Kiểm tra thông báo email',
      heading: 'Email thông báo đang hoạt động',
      paragraphs: ['Xin chào,', `${requestedBy || 'Quản trị viên'} vừa thực hiện kiểm tra gửi email từ TCKT Activity Hub.`, 'Nếu bạn nhận được email này, cấu hình Gmail của máy chủ đang hoạt động bình thường.'],
      facts: [['Người thực hiện kiểm tra', requestedBy || 'Quản trị viên'], ['Thời gian kiểm tra', new Intl.DateTimeFormat('vi-VN', { dateStyle: 'full', timeStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())]],
      url: appBaseUrl || '',
      buttonLabel: 'Mở TCKT Activity Hub'
    });
    logger.info(`Email notification sent: ${description}.`, deliveryDetails(info));
    return deliveryDetails(info);
  } catch (error) {
    logger.error(`Email notification failed: ${description}.`, failureDetails(error));
    throw error;
  }
}

module.exports = {
  enabled,
  notifyTaskAssigned,
  notifyActivityRegistration,
  notifyActivityProposed,
  notifyTaskResponse,
  notifyActivityDecision,
  notifyTaskSubmittedForReview,
  notifyTaskReviewed,
  notifyTaskDeadlineSoon,
  notifyTaskOverdue,
  notifyTaskUnacknowledged,
  sendTestEmail
};
