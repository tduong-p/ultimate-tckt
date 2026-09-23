'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { encrypt, decrypt } = require('../src/config/settings-crypto');

test('encrypt/decrypt round-trips a secret using SETTINGS_ENCRYPTION_KEY', () => {
  const original = process.env.SETTINGS_ENCRYPTION_KEY;
  process.env.SETTINGS_ENCRYPTION_KEY = 'test-key-for-unit-tests-only';
  try {
    const cipher = encrypt('super-secret-app-password');
    assert.notEqual(cipher, 'super-secret-app-password');
    assert.equal(cipher.split(':').length, 3);
    assert.equal(decrypt(cipher), 'super-secret-app-password');
  } finally {
    if (original === undefined) delete process.env.SETTINGS_ENCRYPTION_KEY; else process.env.SETTINGS_ENCRYPTION_KEY = original;
  }
});

test('encrypt throws a clear error when SETTINGS_ENCRYPTION_KEY is not set', () => {
  const original = process.env.SETTINGS_ENCRYPTION_KEY;
  delete process.env.SETTINGS_ENCRYPTION_KEY;
  try {
    assert.throws(() => encrypt('anything'), /SETTINGS_ENCRYPTION_KEY/);
  } finally {
    if (original !== undefined) process.env.SETTINGS_ENCRYPTION_KEY = original;
  }
});
