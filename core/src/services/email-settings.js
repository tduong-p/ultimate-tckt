'use strict';
const { encrypt, decrypt } = require('../config/settings-crypto');

const ALLOWED_KEYS = ['smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user', 'smtp_pass', 'from_name', 'from_email', 'enabled', 'max_recipients_per_send'];
const SECRET_KEYS = ['smtp_pass'];

async function getRawRows(db) {
  const [rows] = await db.execute('SELECT setting_key, setting_value, is_secret FROM email_settings');
  return rows;
}

async function getPublicSettings(db) {
  const rows = await getRawRows(db);
  const out = {};
  for (const key of ALLOWED_KEYS) out[key] = null;
  for (const row of rows) {
    if (SECRET_KEYS.includes(row.setting_key)) {
      out[row.setting_key] = null;
      out[`${row.setting_key}_set`] = Boolean(row.setting_value);
    } else {
      out[row.setting_key] = row.setting_value;
    }
  }
  for (const key of SECRET_KEYS) if (!(`${key}_set` in out)) out[`${key}_set`] = false;
  return out;
}

async function updateSettings(db, updates, userId) {
  const keys = Object.keys(updates || {});
  const unknown = keys.filter(key => !ALLOWED_KEYS.includes(key));
  if (unknown.length) throw Object.assign(new Error(`Unknown setting key(s): ${unknown.join(', ')}`), { status: 400 });
  for (const key of keys) {
    let value = updates[key];
    if (SECRET_KEYS.includes(key)) {
      if (value === '' || value === null || value === undefined) continue; // keep existing secret if not explicitly changed
      value = encrypt(String(value));
    } else {
      value = value === null || value === undefined ? null : String(value);
    }
    await db.execute(
      'INSERT INTO email_settings(setting_key, setting_value, is_secret, updated_by) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value), updated_by=VALUES(updated_by)',
      [key, value, SECRET_KEYS.includes(key) ? 1 : 0, userId || null]
    );
  }
}

async function getSmtpConfig(db) {
  const rows = await getRawRows(db);
  const map = Object.fromEntries(rows.map(row => [row.setting_key, row.setting_value]));
  return {
    host: map.smtp_host || '',
    port: Number(map.smtp_port || 587),
    secure: map.smtp_secure === 'true',
    user: map.smtp_user || '',
    pass: map.smtp_pass ? decrypt(map.smtp_pass) : '',
    fromName: map.from_name || 'TCKT Activity Hub',
    fromEmail: map.from_email || map.smtp_user || '',
    enabled: map.enabled === 'true',
    maxRecipientsPerSend: Number(map.max_recipients_per_send || 50)
  };
}

module.exports = { ALLOWED_KEYS, SECRET_KEYS, getPublicSettings, updateSettings, getSmtpConfig };
