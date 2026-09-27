'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { getPublicSettings, updateSettings, getSmtpConfig } = require('../src/services/email-settings');

test('email settings: update, mask secrets on read, decrypt for internal use', async () => {
  const original = process.env.SETTINGS_ENCRYPTION_KEY;
  process.env.SETTINGS_ENCRYPTION_KEY = 'test-key-for-unit-tests-only';
  const { pool, teardown } = await createTestDatabase();
  try {
    await updateSettings(pool, {
      smtp_host: 'smtp.office365.com',
      smtp_port: '587',
      smtp_secure: 'false',
      smtp_user: 'notify@hust.edu.vn',
      smtp_pass: 'super-secret',
      from_name: 'TCKT Activity Hub',
      from_email: 'notify@hust.edu.vn',
      enabled: 'true',
      max_recipients_per_send: '50'
    }, 1);

    const publicSettings = await getPublicSettings(pool);
    assert.equal(publicSettings.smtp_host, 'smtp.office365.com');
    assert.equal(publicSettings.smtp_pass, null);
    assert.equal(publicSettings.smtp_pass_set, true);

    const smtp = await getSmtpConfig(pool);
    assert.equal(smtp.host, 'smtp.office365.com');
    assert.equal(smtp.port, 587);
    assert.equal(smtp.secure, false);
    assert.equal(smtp.pass, 'super-secret');
    assert.equal(smtp.enabled, true);
    assert.equal(smtp.maxRecipientsPerSend, 50);
  } finally {
    await teardown();
    if (original === undefined) delete process.env.SETTINGS_ENCRYPTION_KEY; else process.env.SETTINGS_ENCRYPTION_KEY = original;
  }
});

test('updateSettings rejects unknown keys', async () => {
  const { pool, teardown } = await createTestDatabase();
  try {
    await assert.rejects(() => updateSettings(pool, { not_a_real_setting: 'x' }, 1), /not_a_real_setting/);
  } finally {
    await teardown();
  }
});

test('updateSettings without smtp_pass keeps the previously stored secret', async () => {
  process.env.SETTINGS_ENCRYPTION_KEY = 'test-key-for-unit-tests-only';
  const { pool, teardown } = await createTestDatabase();
  try {
    await updateSettings(pool, { smtp_pass: 'first-secret' }, 1);
    await updateSettings(pool, { smtp_host: 'smtp.office365.com' }, 1);
    const smtp = await getSmtpConfig(pool);
    assert.equal(smtp.pass, 'first-secret');
  } finally {
    await teardown();
    delete process.env.SETTINGS_ENCRYPTION_KEY;
  }
});
