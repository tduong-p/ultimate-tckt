'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { createTeam, createUser } = require('./helpers/fixtures');
const { updateSettings } = require('../src/services/email-settings');
const {
  registerEmailEvent, getEventCatalog, getEvent, renderTemplate, resolveRecipients, validateRecipients, simulateRule, dispatch
} = require('../src/services/email-events');

test('demo event system.test_event is registered by default', () => {
  const evt = getEvent('system.test_event');
  assert.ok(evt);
  assert.ok(evt.samplePayload.user.email);
  const catalog = getEventCatalog();
  assert.ok(catalog.some(e => e.key === 'system.test_event'));
});

test('registerEmailEvent adds a new event to the catalog', () => {
  registerEmailEvent('unit_test.custom_event', { fields: [{ path: 'x', label: 'X', type: 'string' }], samplePayload: { x: 1 } });
  assert.ok(getEvent('unit_test.custom_event'));
});

test('renderTemplate substitutes {{dot.path}} placeholders and leaves unknown ones blank', () => {
  const rendered = renderTemplate('Xin chào {{user.name}}, việc: {{missing.path}}.', { user: { name: 'An' } });
  assert.equal(rendered, 'Xin chào An, việc: .');
});

test('resolveRecipients resolves static_email, role and payload_path, deduped and lowercased', async () => {
  const { pool, teardown } = await createTestDatabase();
  try {
    await pool.execute("INSERT INTO users(name,email,password_hash,role,is_active) VALUES ('Truong ban','Admin@Hust.edu.vn','x','admin',1)");
    const recipients = [
      { type: 'static_email', value: 'Admin@Hust.edu.vn' },
      { type: 'role', value: 'admin' },
      { type: 'payload_path', value: 'user.email' }
    ];
    const emails = await resolveRecipients(pool, recipients, { user: { email: 'other@hust.edu.vn' } });
    assert.deepEqual(emails.sort(), ['admin@example.com', 'admin@hust.edu.vn', 'other@hust.edu.vn']);
  } finally {
    await teardown();
  }
});

test('validateRecipients rejects malformed entries', () => {
  assert.throws(() => validateRecipients([], null), /ít nhất/i);
  assert.throws(() => validateRecipients([{ type: 'bogus', value: 'x' }], null), /type/i);
  assert.throws(() => validateRecipients([{ type: 'static_email', value: 'not-an-email' }], null), /email/i);
  assert.throws(() => validateRecipients([{ type: 'role', value: 'not-a-role' }], null), /role/i);
  assert.doesNotThrow(() => validateRecipients([{ type: 'static_email', value: 'a@b.com' }], null));
});

test('validateRecipients: team_members must reference a registered team_id/team_ids field', () => {
  const fieldsByPath = new Map([
    ['team_ids', { path: 'team_ids', type: 'team_ids' }],
    ['user.email', { path: 'user.email', type: 'email' }]
  ]);
  assert.doesNotThrow(() => validateRecipients([{ type: 'team_members', value: 'team_ids' }], fieldsByPath));
  assert.throws(() => validateRecipients([{ type: 'team_members', value: 'user.email' }], fieldsByPath), /team_members/i);
  assert.throws(() => validateRecipients([{ type: 'team_members', value: 'no.such.field' }], fieldsByPath), /team_members/i);
});

test('resolveRecipients: team_members resolves all active members of the referenced team(s)', async () => {
  const { pool, teardown } = await createTestDatabase();
  try {
    const teamA = await createTeam(pool);
    const teamB = await createTeam(pool);
    await createUser(pool, { team_id: teamA, email: 'a1@hust.edu.vn' });
    await createUser(pool, { team_id: teamA, email: 'a2@hust.edu.vn' });
    await createUser(pool, { team_id: teamB, email: 'b1@hust.edu.vn' });

    const emailsSingleTeam = await resolveRecipients(pool, [{ type: 'team_members', value: 'team_ids' }], { team_ids: [teamA] });
    assert.deepEqual(emailsSingleTeam.sort(), ['a1@hust.edu.vn', 'a2@hust.edu.vn']);

    const emailsMultiTeam = await resolveRecipients(pool, [{ type: 'team_members', value: 'team_ids' }], { team_ids: [teamA, teamB] });
    assert.deepEqual(emailsMultiTeam.sort(), ['a1@hust.edu.vn', 'a2@hust.edu.vn', 'b1@hust.edu.vn']);
  } finally {
    await teardown();
  }
});

test('simulateRule renders the template and resolves recipients without sending or logging', async () => {
  const { pool, teardown } = await createTestDatabase();
  try {
    const [tpl] = await pool.execute("INSERT INTO email_templates(template_key,name,subject,body_html) VALUES ('demo','Demo','Xin chào {{user.name}}','<p>{{message}}</p>')");
    const rule = { conditions: null, recipients: [{ type: 'payload_path', value: 'user.email' }], template_id: tpl.insertId };
    const payload = { user: { name: 'An', email: 'an@hust.edu.vn' }, message: 'Test' };
    const result = await simulateRule(pool, rule, payload);
    assert.equal(result.matched, true);
    assert.deepEqual(result.recipients, ['an@hust.edu.vn']);
    assert.equal(result.subject, 'Xin chào An');
    const [[count]] = await pool.query('SELECT COUNT(*) c FROM email_deliveries');
    assert.equal(count.c, 0);
  } finally {
    await teardown();
  }
});

test('dispatch is a no-op when email is disabled in settings', async () => {
  const { pool, teardown } = await createTestDatabase();
  try {
    const result = await dispatch(pool, 'system.test_event', { user: { name: 'An', email: 'an@hust.edu.vn' }, message: 'hi' }, { logger: { info: () => {}, error: () => {} } });
    assert.equal(result.skipped, 'disabled');
  } finally {
    await teardown();
  }
});

test('dispatch skips a rule whose recipient count exceeds max_recipients_per_send and logs a failed delivery', async () => {
  process.env.SETTINGS_ENCRYPTION_KEY = 'test-key-for-unit-tests-only';
  const { pool, teardown } = await createTestDatabase();
  try {
    await updateSettings(pool, { enabled: 'true', max_recipients_per_send: '1', smtp_host: 'localhost', smtp_port: '25', smtp_user: 'x', smtp_pass: 'x', from_email: 'x@hust.edu.vn' }, 1);
    const [tpl] = await pool.execute("INSERT INTO email_templates(template_key,name,subject,body_html) VALUES ('demo2','Demo','Subj','<p>Body</p>')");
    await pool.execute(
      "INSERT INTO email_rules(name,event_key,template_id,conditions,recipients,is_active) VALUES ('r1','system.test_event',?,NULL,?,1)",
      [tpl.insertId, JSON.stringify([{ type: 'static_email', value: 'a@x.com' }, { type: 'static_email', value: 'b@x.com' }])]
    );
    const result = await dispatch(pool, 'system.test_event', { user: { name: 'An', email: 'an@hust.edu.vn' }, message: 'hi' }, { logger: { info: () => {}, error: () => {} } });
    assert.equal(result.sent, 0);
    const [rows] = await pool.execute("SELECT status, error_message FROM email_deliveries");
    assert.equal(rows.length, 1);
    assert.equal(rows[0].status, 'failed');
    assert.match(rows[0].error_message, /recipient/i);
  } finally {
    await teardown();
    delete process.env.SETTINGS_ENCRYPTION_KEY;
  }
});

test('dispatch resolves team_members recipients for the activity.approved event', async () => {
  process.env.SETTINGS_ENCRYPTION_KEY = 'test-key-for-unit-tests-only';
  const { pool, teardown } = await createTestDatabase();
  try {
    const teamId = await createTeam(pool);
    await createUser(pool, { team_id: teamId, email: 'member1@hust.edu.vn' });
    await createUser(pool, { team_id: teamId, email: 'member2@hust.edu.vn' });

    await updateSettings(pool, { enabled: 'true', max_recipients_per_send: '1', smtp_host: 'localhost', smtp_port: '25', smtp_user: 'x', smtp_pass: 'x', from_email: 'x@hust.edu.vn' }, 1);
    const [tpl] = await pool.execute("INSERT INTO email_templates(template_key,name,subject,body_html) VALUES ('activity-approved','Activity approved','Duyệt: {{activity.title}}','<p>Tổ {{activity.primary_team_name}}</p>')");
    await pool.execute(
      "INSERT INTO email_rules(name,event_key,template_id,conditions,recipients,is_active) VALUES ('notify-team','activity.approved',?,NULL,?,1)",
      [tpl.insertId, JSON.stringify([{ type: 'team_members', value: 'team_ids' }])]
    );

    const result = await dispatch(pool, 'activity.approved', {
      activity: { id: 1, title: 'Hội trại mùa hè', primary_team_name: 'Tổ Truyền thông' },
      approved_by: 'Trưởng Ban',
      team_ids: [teamId]
    }, { logger: { info: () => {}, error: () => {} } });

    assert.equal(result.sent, 0); // max_recipients_per_send=1 forces the cap path, but proves both team members were resolved
    const [rows] = await pool.execute("SELECT status, error_message FROM email_deliveries");
    assert.equal(rows.length, 1);
    assert.equal(rows[0].status, 'failed');
    assert.match(rows[0].error_message, /2 > 1/);
  } finally {
    await teardown();
    delete process.env.SETTINGS_ENCRYPTION_KEY;
  }
});
