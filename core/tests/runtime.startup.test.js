const test = require('node:test');
const assert = require('node:assert/strict');
const { migrateOnStartup } = require('../src/runtime');

test('a failed startup migration is rethrown, not swallowed', async () => {
  const failure = new Error('migration exploded');
  const application = { db: {}, config: { hasConfiguredDatabase: true } };
  await assert.rejects(
    migrateOnStartup(application, { migrateDatabase: async () => { throw failure; } }),
    failure
  );
});

test('startup migration is skipped without a configured database', async () => {
  let called = false;
  await migrateOnStartup({ db: {}, config: { hasConfiguredDatabase: false } }, { migrateDatabase: async () => { called = true; } });
  assert.equal(called, false);
});

test('startup migration can be disabled explicitly', async () => {
  let called = false;
  await migrateOnStartup({ db: {}, config: { hasConfiguredDatabase: true } }, { autoMigrate: false, migrateDatabase: async () => { called = true; } });
  assert.equal(called, false);
});
