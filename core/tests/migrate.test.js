'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { migrateDatabase, columnExists, tableExists } = require('../src/config/migrate');

test('migrateDatabase is idempotent and ensures all required tables and columns exist', async () => {
  const { pool, teardown } = await createTestDatabase();
  try {
    // 1. Run migration on fully seeded DB
    await migrateDatabase(pool, { logger: { info: () => {} } });

    assert.equal(await columnExists(pool, 'users', 'auth_provider'), true);
    assert.equal(await columnExists(pool, 'activities', 'event_lead_id'), true);
    assert.equal(await columnExists(pool, 'tasks', 'primary_assignee_id'), true);
    assert.equal(await columnExists(pool, 'tasks', 'submitted_for_review_at'), true);
    assert.equal(await columnExists(pool, 'tasks', 'reviewed_by'), true);
    assert.equal(await columnExists(pool, 'tasks', 'reviewed_at'), true);
    assert.equal(await columnExists(pool, 'tasks', 'review_feedback'), true);
    assert.equal(await columnExists(pool, 'task_assignees', 'is_primary'), true);
    assert.equal(await columnExists(pool, 'task_assignees', 'acknowledged_at'), true);
    assert.equal(await tableExists(pool, 'task_checklists'), true);
    assert.equal(await tableExists(pool, 'activity_proposals'), true);

    // New additions: vice_admin, is_self_logged, weight, weight_presets
    assert.equal(await columnExists(pool, 'tasks', 'is_self_logged'), true);
    assert.equal(await columnExists(pool, 'tasks', 'weight'), true);
    assert.equal(await tableExists(pool, 'weight_presets'), true);
    const [[presetCount]] = await pool.query('SELECT COUNT(*) c FROM weight_presets');
    assert.ok(presetCount.c >= 5);

    // 2. Run migration a second time to verify idempotency
    await migrateDatabase(pool, { logger: { info: () => {} } });
  } finally {
    await teardown();
  }
});
