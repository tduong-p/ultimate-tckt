'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { getByPath, evaluateConditions, validateConditions } = require('../src/services/email-condition-evaluator');

test('getByPath reads nested values and returns undefined for missing paths', () => {
  const payload = { task: { priority: 'high', assignee: { email: 'a@b.com' } } };
  assert.equal(getByPath(payload, 'task.priority'), 'high');
  assert.equal(getByPath(payload, 'task.assignee.email'), 'a@b.com');
  assert.equal(getByPath(payload, 'task.missing.deep'), undefined);
});

test('evaluateConditions: null tree always matches', () => {
  assert.equal(evaluateConditions(null, {}), true);
});

test('evaluateConditions: leaf operators', () => {
  const payload = { task: { priority: 'high', title: 'Chuan bi hoi truong', score: 7 } };
  assert.equal(evaluateConditions({ field: 'task.priority', op: 'equals', value: 'high' }, payload), true);
  assert.equal(evaluateConditions({ field: 'task.priority', op: 'not_equals', value: 'high' }, payload), false);
  assert.equal(evaluateConditions({ field: 'task.priority', op: 'in', value: ['low', 'high'] }, payload), true);
  assert.equal(evaluateConditions({ field: 'task.title', op: 'contains', value: 'hoi truong' }, payload), true);
  assert.equal(evaluateConditions({ field: 'task.score', op: 'gte', value: 7 }, payload), true);
  assert.equal(evaluateConditions({ field: 'task.score', op: 'lt', value: 7 }, payload), false);
  assert.equal(evaluateConditions({ field: 'task.missing', op: 'is_empty' }, payload), true);
  assert.equal(evaluateConditions({ field: 'task.priority', op: 'is_not_empty' }, payload), true);
});

test('evaluateConditions: nested all/any groups', () => {
  const payload = { task: { priority: 'high', status: 'open' } };
  const tree = {
    all: [
      { field: 'task.priority', op: 'equals', value: 'high' },
      { any: [
        { field: 'task.status', op: 'equals', value: 'open' },
        { field: 'task.status', op: 'equals', value: 'in_progress' }
      ] }
    ]
  };
  assert.equal(evaluateConditions(tree, payload), true);
  assert.equal(evaluateConditions(tree, { task: { priority: 'low', status: 'open' } }), false);
});

test('validateConditions accepts null and well-formed trees', () => {
  assert.doesNotThrow(() => validateConditions(null, null));
  assert.doesNotThrow(() => validateConditions({ field: 'task.priority', op: 'equals', value: 'high' }, new Set(['task.priority'])));
});

test('validateConditions rejects unknown operators, unknown fields, and excessive depth', () => {
  assert.throws(() => validateConditions({ field: 'task.priority', op: 'regex', value: '.*' }, null), /operator/i);
  assert.throws(() => validateConditions({ field: 'not.allowed', op: 'equals', value: 'x' }, new Set(['task.priority'])), /field/i);
  let deep = { field: 'task.priority', op: 'equals', value: 'x' };
  for (let i = 0; i < 5; i += 1) deep = { all: [deep] };
  assert.throws(() => validateConditions(deep, null), /sâu|depth/i);
});
