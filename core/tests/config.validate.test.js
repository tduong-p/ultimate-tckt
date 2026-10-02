const test = require('node:test');
const assert = require('node:assert/strict');
const { warnAboutConfiguration } = require('../src/config/validate');

test('production startup needs no mailer or push service and never warns about them', () => {
  const warnings = [];
  const original = console.warn;
  console.warn = message => warnings.push(String(message));
  try {
    assert.doesNotThrow(() => warnAboutConfiguration({ isProduction: true, sessionSecret: 'x'.repeat(40) }));
  } finally { console.warn = original; }
  assert.equal(warnings.some(message => /email|gmail|push|onesignal/i.test(message)), false);
});
