'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createUser } = require('./helpers/fixtures');

async function makeDevopsUser(pool, overrides = {}) {
  const user = await createUser(pool, { role: 'admin', ...overrides });
  await pool.execute('UPDATE users SET is_devops=1 WHERE id=?', [user.id]);
  return user;
}

test('settings-email routes: permissions, settings CRUD, templates CRUD, rules lifecycle, deliveries', async () => {
  process.env.SETTINGS_ENCRYPTION_KEY = 'test-key-for-unit-tests-only';
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const devopsUser = await makeDevopsUser(pool);
    const plainAdmin = await createUser(pool, { role: 'admin' });
    const member = await createUser(pool, { role: 'member' });

    // A plain admin (not devops) cannot read settings
    await client.login(plainAdmin.email, plainAdmin.password);
    let res = await client.request('GET', '/api/admin/email/settings');
    assert.equal(res.status, 403);

    // devops can read/update settings
    await client.login(devopsUser.email, devopsUser.password);
    res = await client.request('PUT', '/api/admin/email/settings', { body: { settings: { smtp_host: 'smtp.office365.com', smtp_port: '587', smtp_secure: 'false', smtp_user: 'x@hust.edu.vn', smtp_pass: 'secret', from_name: 'Hub', from_email: 'x@hust.edu.vn', enabled: 'true', max_recipients_per_send: '50' } } });
    assert.equal(res.status, 200);
    res = await client.request('GET', '/api/admin/email/settings');
    assert.equal(res.status, 200);
    assert.equal(res.json.settings.smtp_host, 'smtp.office365.com');
    assert.equal(res.json.settings.smtp_pass, null);
    assert.equal(res.json.settings.smtp_pass_set, true);

    // event catalog
    res = await client.request('GET', '/api/admin/email/events');
    assert.equal(res.status, 200);
    assert.ok(res.json.events.some(e => e.key === 'system.test_event'));

    // templates CRUD
    res = await client.request('POST', '/api/admin/email/templates', { body: { template_key: 'demo', name: 'Demo', subject: 'Xin chào {{user.name}}', body_html: '<p>{{message}}</p>' } });
    assert.equal(res.status, 201);
    const templateId = res.json.template.id;

    // rules: create always starts inactive
    res = await client.request('POST', '/api/admin/email/rules', { body: { name: 'Rule 1', event_key: 'system.test_event', template_id: templateId, conditions: null, recipients: [{ type: 'payload_path', value: 'user.email' }] } });
    assert.equal(res.status, 201);
    assert.equal(res.json.rule.is_active, 0);
    const ruleId = res.json.rule.id;

    // simulate
    res = await client.request('POST', `/api/admin/email/rules/${ruleId}/simulate`, { body: {} });
    assert.equal(res.status, 200);
    assert.equal(res.json.matched, true);
    assert.deepEqual(res.json.recipients, ['test@hust.edu.vn']);

    // activate requires the freshly-simulated recipient count
    res = await client.request('PATCH', `/api/admin/email/rules/${ruleId}/activate`, { body: { confirmed_recipient_count: 999 } });
    assert.equal(res.status, 409);
    res = await client.request('PATCH', `/api/admin/email/rules/${ruleId}/activate`, { body: { confirmed_recipient_count: 1 } });
    assert.equal(res.status, 200);
    assert.equal(res.json.rule.is_active, 1);

    // deliveries: a plain admin (not devops) CAN read the log
    await client.login(plainAdmin.email, plainAdmin.password);
    res = await client.request('GET', '/api/admin/email/deliveries');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.json.deliveries));

    // a regular member cannot read deliveries
    await client.login(member.email, member.password);
    res = await client.request('GET', '/api/admin/email/deliveries');
    assert.equal(res.status, 403);
  } finally {
    await close();
    await teardown();
    delete process.env.SETTINGS_ENCRYPTION_KEY;
  }
});
