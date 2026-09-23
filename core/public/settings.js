async function settingsSmtpPage() {
  const data = await api('/api/admin/email/settings');
  const s = data.settings;
  $('#content').innerHTML = `
    <section class="page-header"><h1>SMTP &amp; Sending</h1><p>Cấu hình máy chủ gửi email dùng chung cho toàn bộ module Email.</p></section>
    <form id="smtp-form" class="card form-grid">
      <label>Host<input name="smtp_host" value="${esc(s.smtp_host || '')}" required></label>
      <label>Port<input name="smtp_port" type="number" value="${esc(s.smtp_port || '587')}" required></label>
      <label><input type="checkbox" name="smtp_secure" ${s.smtp_secure === 'true' ? 'checked' : ''}> Dùng TLS/SSL (secure)</label>
      <label>User<input name="smtp_user" value="${esc(s.smtp_user || '')}" required></label>
      <label>Mật khẩu ${s.smtp_pass_set ? '<small>(đã lưu — để trống nếu không đổi)</small>' : ''}<input name="smtp_pass" type="password" placeholder="${s.smtp_pass_set ? '••••••••' : ''}"></label>
      <label>Tên người gửi<input name="from_name" value="${esc(s.from_name || '')}"></label>
      <label>Email người gửi<input name="from_email" type="email" value="${esc(s.from_email || '')}" required></label>
      <label><input type="checkbox" name="enabled" ${s.enabled === 'true' ? 'checked' : ''}> Bật gửi email (công tắc tổng)</label>
      <label>Số người nhận tối đa / lần gửi<input name="max_recipients_per_send" type="number" value="${esc(s.max_recipients_per_send || '50')}"></label>
      <div class="form-actions">
        <button type="submit">Lưu cấu hình</button>
        <button type="button" id="smtp-test-send">Gửi thử tới tôi</button>
      </div>
      <p id="smtp-form-message"></p>
    </form>`;
  $('#smtp-form').onsubmit = async e => {
    e.preventDefault();
    const form = new FormData(e.target);
    const settings = {
      smtp_host: form.get('smtp_host'), smtp_port: form.get('smtp_port'), smtp_secure: form.get('smtp_secure') ? 'true' : 'false',
      smtp_user: form.get('smtp_user'), from_name: form.get('from_name'), from_email: form.get('from_email'),
      enabled: form.get('enabled') ? 'true' : 'false', max_recipients_per_send: form.get('max_recipients_per_send')
    };
    if (form.get('smtp_pass')) settings.smtp_pass = form.get('smtp_pass');
    try { await api('/api/admin/email/settings', { method: 'PUT', body: JSON.stringify({ settings }) }); $('#smtp-form-message').textContent = 'Đã lưu.'; }
    catch (error) { $('#smtp-form-message').textContent = `Lỗi: ${error.message}`; }
  };
  $('#smtp-test-send').onclick = async () => {
    $('#smtp-form-message').textContent = 'Đang gửi...';
    try { const result = await api('/api/admin/email/settings/test-send', { method: 'POST' }); $('#smtp-form-message').textContent = `Đã gửi (message id: ${esc(result.message_id || '')}).`; }
    catch (error) { $('#smtp-form-message').textContent = `Lỗi: ${error.message}`; }
  };
}

async function settingsTemplatesPage() {
  const data = await api('/api/admin/email/templates');
  const templates = data.templates;
  $('#content').innerHTML = `
    <section class="page-header"><h1>Email Templates</h1><p>Soạn nội dung email dùng biến dạng <code>{{duong.dan}}</code>.</p></section>
    <div class="card">
      <h2>Tạo template mới</h2>
      <form id="template-form" class="form-grid">
        <label>Key (định danh, không trùng)<input name="template_key" required></label>
        <label>Tên hiển thị<input name="name" required></label>
        <label>Subject<input name="subject" required></label>
        <label>Body (HTML)<textarea name="body_html" rows="6" required></textarea></label>
        <div class="form-actions"><button type="submit">Tạo template</button></div>
        <p id="template-form-message"></p>
      </form>
    </div>
    <div class="card">
      <h2>Danh sách template</h2>
      <table class="data-table"><thead><tr><th>Key</th><th>Tên</th><th>Subject</th><th>Trạng thái</th></tr></thead>
        <tbody>${templates.map(t => `<tr><td>${esc(t.template_key)}</td><td>${esc(t.name)}</td><td>${esc(t.subject)}</td><td>${t.is_active ? 'Hoạt động' : 'Tắt'}</td></tr>`).join('') || '<tr><td colspan="4">Chưa có template nào.</td></tr>'}</tbody>
      </table>
    </div>`;
  $('#template-form').onsubmit = async e => {
    e.preventDefault();
    const form = new FormData(e.target);
    try {
      await api('/api/admin/email/templates', { method: 'POST', body: JSON.stringify({ template_key: form.get('template_key'), name: form.get('name'), subject: form.get('subject'), body_html: form.get('body_html') }) });
      await settingsTemplatesPage();
    } catch (error) { $('#template-form-message').textContent = `Lỗi: ${error.message}`; }
  };
}

async function settingsDeliveriesPage() {
  const data = await api('/api/admin/email/deliveries');
  $('#content').innerHTML = `
    <section class="page-header"><h1>Delivery Log</h1><p>Lịch sử gửi email từ module Email (tổng: ${data.total}).</p></section>
    <div class="card">
      <table class="data-table"><thead><tr><th>Thời gian</th><th>Sự kiện</th><th>Người nhận</th><th>Subject</th><th>Trạng thái</th><th>Lỗi</th></tr></thead>
        <tbody>${data.deliveries.map(d => `<tr><td>${esc(d.created_at)}</td><td>${esc(d.event_key)}</td><td>${esc(d.recipient_email)}</td><td>${esc(d.subject_rendered || '')}</td><td>${esc(d.status)}</td><td>${esc(d.error_message || '')}</td></tr>`).join('') || '<tr><td colspan="6">Chưa có bản ghi nào.</td></tr>'}</tbody>
      </table>
    </div>`;
}

let rulesPageState = { events: [], templates: [] };

function conditionRowHtml(index, field = '', op = 'equals', value = '') {
  const fields = rulesPageState.currentEventFields || [];
  return `<div class="condition-row" data-index="${index}">
    <select class="cond-field">${fields.map(f => `<option value="${esc(f.path)}" ${f.path === field ? 'selected' : ''}>${esc(f.label)}</option>`).join('')}</select>
    <select class="cond-op">${['equals', 'not_equals', 'in', 'not_in', 'contains', 'gt', 'gte', 'lt', 'lte', 'is_empty', 'is_not_empty'].map(o => `<option value="${o}" ${o === op ? 'selected' : ''}>${o}</option>`).join('')}</select>
    <input class="cond-value" value="${esc(Array.isArray(value) ? value.join(',') : value)}" placeholder="value (dùng dấu phẩy cho in/not_in)">
    <button type="button" class="cond-remove">Xóa</button>
  </div>`;
}

function recipientRowHtml(index, type = 'static_email', value = '') {
  const emailFields = (rulesPageState.currentEventFields || []).filter(f => f.type === 'email');
  const teamFields = (rulesPageState.currentEventFields || []).filter(f => ['team_id', 'team_ids'].includes(f.type));
  return `<div class="recipient-row" data-index="${index}">
    <select class="rec-type">
      <option value="static_email" ${type === 'static_email' ? 'selected' : ''}>Email cụ thể</option>
      <option value="role" ${type === 'role' ? 'selected' : ''}>Role</option>
      <option value="payload_path" ${type === 'payload_path' ? 'selected' : ''}>Field từ sự kiện</option>
      <option value="team_members" ${type === 'team_members' ? 'selected' : ''}>Thành viên của Tổ (theo sự kiện)</option>
    </select>
    <span class="rec-value-wrap">${type === 'payload_path'
      ? `<select class="rec-value">${emailFields.map(f => `<option value="${esc(f.path)}" ${f.path === value ? 'selected' : ''}>${esc(f.label)}</option>`).join('')}</select>`
      : type === 'role'
        ? `<select class="rec-value">${['admin', 'vice_admin', 'leader', 'vice_leader', 'member'].map(r => `<option value="${r}" ${r === value ? 'selected' : ''}>${r}</option>`).join('')}</select>`
        : type === 'team_members'
          ? `<select class="rec-value">${teamFields.map(f => `<option value="${esc(f.path)}" ${f.path === value ? 'selected' : ''}>${esc(f.label)}</option>`).join('')}</select>`
          : `<input class="rec-value" value="${esc(value)}" placeholder="email@hust.edu.vn">`}</span>
    <button type="button" class="rec-remove">Xóa</button>
  </div>`;
}

function readConditionsFromForm() {
  const rows = $$('.condition-row');
  if (!rows.length) return null;
  const leaves = rows.map(row => {
    const field = row.querySelector('.cond-field').value;
    const op = row.querySelector('.cond-op').value;
    const raw = row.querySelector('.cond-value').value;
    const value = ['in', 'not_in'].includes(op) ? raw.split(',').map(s => s.trim()).filter(Boolean) : raw;
    return ['is_empty', 'is_not_empty'].includes(op) ? { field, op } : { field, op, value };
  });
  return leaves.length === 1 ? leaves[0] : { all: leaves };
}

function readRecipientsFromForm() {
  return $$('.recipient-row').map(row => ({ type: row.querySelector('.rec-type').value, value: row.querySelector('.rec-value').value }));
}

async function settingsRulesPage() {
  const [{ events }, { templates }, { rules }] = await Promise.all([
    api('/api/admin/email/events'), api('/api/admin/email/templates'), api('/api/admin/email/rules')
  ]);
  rulesPageState = { events, templates };
  rulesPageState.currentEventFields = events[0]?.fields || [];
  $('#content').innerHTML = `
    <section class="page-header"><h1>Email Rules</h1><p>Ma trận điều kiện: sự kiện → điều kiện → template → người nhận.</p></section>
    <div class="card">
      <h2>Tạo rule mới</h2>
      <form id="rule-form" class="form-grid">
        <label>Tên rule<input name="name" required></label>
        <label>Sự kiện<select name="event_key" id="rule-event-select">${events.map(e => `<option value="${esc(e.key)}">${esc(e.key)}</option>`).join('')}</select></label>
        <label>Template<select name="template_id">${templates.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select></label>
        <fieldset><legend>Điều kiện (bỏ trống = luôn khớp)</legend><div id="condition-rows"></div><button type="button" id="add-condition">+ Điều kiện</button></fieldset>
        <fieldset><legend>Người nhận</legend><div id="recipient-rows"></div><button type="button" id="add-recipient">+ Người nhận</button></fieldset>
        <div class="form-actions"><button type="submit">Tạo rule (mặc định tắt)</button></div>
        <p id="rule-form-message"></p>
      </form>
    </div>
    <div class="card">
      <h2>Danh sách rule</h2>
      <table class="data-table"><thead><tr><th>Tên</th><th>Sự kiện</th><th>Trạng thái</th><th>Hành động</th></tr></thead>
        <tbody>${rules.map(r => `<tr data-rule-id="${r.id}"><td>${esc(r.name)}</td><td>${esc(r.event_key)}</td><td>${r.is_active ? 'Đang bật' : 'Đang tắt'}</td>
          <td><button type="button" class="rule-simulate">Simulate</button>${r.is_active ? '<button type="button" class="rule-deactivate">Tắt</button>' : '<button type="button" class="rule-activate">Bật (sau simulate)</button>'}</td></tr>`).join('') || '<tr><td colspan="4">Chưa có rule nào.</td></tr>'}</tbody>
      </table>
      <p id="rule-list-message"></p>
    </div>`;

  let conditionCount = 0, recipientCount = 0;
  const addCondition = () => { $('#condition-rows').insertAdjacentHTML('beforeend', conditionRowHtml(conditionCount++)); };
  const addRecipient = () => { $('#recipient-rows').insertAdjacentHTML('beforeend', recipientRowHtml(recipientCount++)); };
  $('#add-condition').onclick = addCondition;
  $('#add-recipient').onclick = addRecipient;
  addRecipient();

  $('#rule-event-select').onchange = e => {
    rulesPageState.currentEventFields = events.find(ev => ev.key === e.target.value)?.fields || [];
    $('#condition-rows').innerHTML = ''; conditionCount = 0;
    $('#recipient-rows').innerHTML = ''; recipientCount = 0; addRecipient();
  };

  $('#content').addEventListener('click', e => {
    if (e.target.classList.contains('cond-remove')) e.target.closest('.condition-row').remove();
    if (e.target.classList.contains('rec-remove')) e.target.closest('.recipient-row').remove();
  });

  $('#content').addEventListener('change', e => {
    if (!e.target.classList.contains('rec-type')) return;
    const row = e.target.closest('.recipient-row');
    row.outerHTML = recipientRowHtml(row.dataset.index, e.target.value);
  });

  $('#rule-form').onsubmit = async e => {
    e.preventDefault();
    const form = new FormData(e.target);
    try {
      await api('/api/admin/email/rules', { method: 'POST', body: JSON.stringify({ name: form.get('name'), event_key: form.get('event_key'), template_id: Number(form.get('template_id')), conditions: readConditionsFromForm(), recipients: readRecipientsFromForm() }) });
      await settingsRulesPage();
    } catch (error) { $('#rule-form-message').textContent = `Lỗi: ${error.message}`; }
  };

  $$('.rule-simulate').forEach(button => button.onclick = async () => {
    const ruleId = button.closest('tr').dataset.ruleId;
    try {
      const result = await api(`/api/admin/email/rules/${ruleId}/simulate`, { method: 'POST', body: JSON.stringify({}) });
      $('#rule-list-message').textContent = `Rule ${ruleId}: khớp=${result.matched}, người nhận=${result.recipients.join(', ') || '(không có)'}, subject="${result.subject}"`;
      button.dataset.lastRecipientCount = result.recipients.length;
    } catch (error) { $('#rule-list-message').textContent = `Lỗi: ${error.message}`; }
  });

  $$('.rule-activate').forEach(button => button.onclick = async () => {
    const row = button.closest('tr');
    const ruleId = row.dataset.ruleId;
    const simulateButton = row.querySelector('.rule-simulate');
    if (simulateButton.dataset.lastRecipientCount === undefined) { $('#rule-list-message').textContent = 'Hãy bấm Simulate trước khi Bật rule.'; return; }
    try {
      await api(`/api/admin/email/rules/${ruleId}/activate`, { method: 'PATCH', body: JSON.stringify({ confirmed_recipient_count: Number(simulateButton.dataset.lastRecipientCount) }) });
      await settingsRulesPage();
    } catch (error) { $('#rule-list-message').textContent = `Lỗi: ${error.message}`; }
  });

  $$('.rule-deactivate').forEach(button => button.onclick = async () => {
    const ruleId = button.closest('tr').dataset.ruleId;
    await api(`/api/admin/email/rules/${ruleId}/deactivate`, { method: 'PATCH', body: JSON.stringify({}) });
    await settingsRulesPage();
  });
}

const CRON_PRESETS = [
  { label: 'Mỗi 15 phút', value: '*/15 * * * *' },
  { label: 'Mỗi giờ', value: '0 * * * *' },
  { label: 'Hằng ngày lúc 08:00', value: '0 8 * * *' },
  { label: 'Hằng ngày lúc 20:00', value: '0 20 * * *' },
  { label: 'Hằng tuần, Thứ 2 lúc 08:00', value: '0 8 * * 1' }
];

async function settingsCronPage() {
  const [{ handlers }, { jobs }] = await Promise.all([api('/api/admin/cron/handlers'), api('/api/admin/cron/jobs')]);
  $('#content').innerHTML = `
    <section class="page-header"><h1>Cron Jobs</h1><p>Lịch chạy nền tổng quát, không giới hạn cho riêng email.</p></section>
    <div class="card">
      <h2>Tạo job mới</h2>
      <form id="cron-form" class="form-grid">
        <label>Key (định danh)<input name="job_key" required></label>
        <label>Tên<input name="name" required></label>
        <label>Handler<select name="handler_key">${handlers.map(h => `<option value="${esc(h)}">${esc(h)}</option>`).join('')}</select></label>
        <label>Lịch chạy<select id="cron-preset">${CRON_PRESETS.map(p => `<option value="${p.value}">${p.label}</option>`).join('')}<option value="custom">Tùy chỉnh (nhập cron expression)</option></select></label>
        <label id="cron-custom-wrap" class="hidden">Cron expression<input name="schedule_custom" placeholder="*/5 * * * *"></label>
        <div class="form-actions"><button type="submit">Tạo job (mặc định tắt)</button></div>
        <p id="cron-form-message"></p>
      </form>
    </div>
    <div class="card">
      <h2>Danh sách job</h2>
      <table class="data-table"><thead><tr><th>Tên</th><th>Handler</th><th>Lịch</th><th>Trạng thái</th><th>Lần chạy cuối</th><th>Hành động</th></tr></thead>
        <tbody>${jobs.map(j => `<tr data-job-id="${j.id}"><td>${esc(j.name)}</td><td>${esc(j.handler_key)}</td><td>${esc(j.schedule)}</td><td>${j.is_active ? 'Đang bật' : 'Đang tắt'}</td><td>${esc(j.last_status || '')} ${esc(j.last_run_at || '')}</td>
          <td><button type="button" class="cron-run-now">Chạy ngay</button>${j.is_active ? '<button type="button" class="cron-deactivate">Tạm dừng</button>' : '<button type="button" class="cron-activate">Bật</button>'}</td></tr>`).join('') || '<tr><td colspan="6">Chưa có job nào.</td></tr>'}</tbody>
      </table>
      <p id="cron-list-message"></p>
    </div>`;

  $('#cron-preset').onchange = e => { $('#cron-custom-wrap').classList.toggle('hidden', e.target.value !== 'custom'); };

  $('#cron-form').onsubmit = async e => {
    e.preventDefault();
    const form = new FormData(e.target);
    const preset = $('#cron-preset').value;
    const schedule = preset === 'custom' ? form.get('schedule_custom') : preset;
    try {
      await api('/api/admin/cron/jobs', { method: 'POST', body: JSON.stringify({ job_key: form.get('job_key'), name: form.get('name'), handler_key: form.get('handler_key'), schedule }) });
      await settingsCronPage();
    } catch (error) { $('#cron-form-message').textContent = `Lỗi: ${error.message}`; }
  };

  $$('.cron-run-now').forEach(button => button.onclick = async () => {
    const jobId = button.closest('tr').dataset.jobId;
    try { const result = await api(`/api/admin/cron/jobs/${jobId}/run-now`, { method: 'POST', body: JSON.stringify({}) }); $('#cron-list-message').textContent = `Job ${jobId}: ${result.status}${result.error ? ' — ' + result.error : ''}`; await settingsCronPage(); }
    catch (error) { $('#cron-list-message').textContent = `Lỗi: ${error.message}`; }
  });

  $$('.cron-activate').forEach(button => button.onclick = async () => { await api(`/api/admin/cron/jobs/${button.closest('tr').dataset.jobId}/activate`, { method: 'PATCH', body: JSON.stringify({}) }); await settingsCronPage(); });
  $$('.cron-deactivate').forEach(button => button.onclick = async () => { await api(`/api/admin/cron/jobs/${button.closest('tr').dataset.jobId}/deactivate`, { method: 'PATCH', body: JSON.stringify({}) }); await settingsCronPage(); });
}
