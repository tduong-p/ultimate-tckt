'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { toSummaryView } = require('../src/serializers/summary');

test('toSummaryView strips internal fields and calculates progress', () => {
  const activity = {
    id: 1,
    title: 'Test',
    status: 'active',
    priority: 'high',
    start_date: '2026-01-01',
    deadline: '2026-12-31',
    event_lead_name: 'John Doe',
    directive_id: 42,
    task_count: 10,
    done_count: 5,
    secret_field: 'should be removed'
  };

  const summary = toSummaryView(activity);
  
  assert.equal(summary.id, 1);
  assert.equal(summary.title, 'Test');
  assert.equal(summary.status, 'active');
  assert.equal(summary.priority, 'high');
  assert.equal(summary.start_date, '2026-01-01');
  assert.equal(summary.deadline, '2026-12-31');
  assert.equal(summary.event_lead_name, 'John Doe');
  assert.equal(summary.directive_id, 42);
  assert.equal(summary.progress_percent, 50);
  assert.equal(summary.secret_field, undefined);
  
  // Verify exactly the allowed keys
  const keys = Object.keys(summary).sort();
  assert.deepEqual(keys, ['deadline', 'directive_id', 'event_lead_name', 'id', 'priority', 'progress_percent', 'start_date', 'status', 'title']);
});

test('toSummaryView handles zero tasks', () => {
  const activity = { id: 2, task_count: 0, done_count: 0 };
  const summary = toSummaryView(activity);
  assert.equal(summary.progress_percent, 0);
});
