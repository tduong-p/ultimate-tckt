'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isSendingHour, deadlineWindow, isUnacknowledgedDue, sourceKeys, emailStatusFor
} = require('../src/services/reminder-rules');
const { hourInVietnam, addDaysVietnam } = require('../src/date-vn');

test('hourInVietnam and addDaysVietnam use Vietnam time', () => {
  assert.equal(hourInVietnam(new Date('2030-06-15T00:00:00Z')), 7);
  assert.equal(hourInVietnam(new Date('2030-06-14T17:00:00Z')), 0);
  assert.equal(addDaysVietnam(new Date('2030-06-15T02:00:00Z'), 1), '2030-06-16');
  assert.equal(addDaysVietnam(new Date('2030-06-30T20:00:00Z'), 0), '2030-07-01');
  assert.equal(addDaysVietnam(new Date('2030-06-30T02:00:00Z'), 1), '2030-07-01');
});

test('isSendingHour covers 07:00-21:59 Vietnam time', () => {
  assert.equal(isSendingHour(new Date('2030-06-14T23:59:00Z')), false);
  assert.equal(isSendingHour(new Date('2030-06-15T00:00:00Z')), true);
  assert.equal(isSendingHour(new Date('2030-06-15T14:59:00Z')), true);
  assert.equal(isSendingHour(new Date('2030-06-15T15:00:00Z')), false);
});

test('deadlineWindow is by Vietnam calendar day', () => {
  const now = new Date('2030-06-15T02:00:00Z');
  assert.deepEqual(deadlineWindow('2030-06-16', now), { code: '1d', label: '1 ngày' });
  assert.deepEqual(deadlineWindow('2030-06-15', now), { code: 'today', label: 'hôm nay' });
  assert.equal(deadlineWindow('2030-06-17', now), null);
  assert.equal(deadlineWindow('2030-06-14', now), null);
  assert.deepEqual(deadlineWindow('2030-06-15', new Date('2030-06-14T17:30:00Z')), { code: 'today', label: 'hôm nay' });
});

test('isUnacknowledgedDue is 24h <= age < 168h', () => {
  const now = new Date('2030-06-15T12:00:00Z');
  const ago = minutes => new Date(now.getTime() - minutes * 60000);
  assert.equal(isUnacknowledgedDue(ago(23 * 60 + 59), now), false);
  assert.equal(isUnacknowledgedDue(ago(24 * 60), now), true);
  assert.equal(isUnacknowledgedDue(ago(167 * 60 + 59), now), true);
  assert.equal(isUnacknowledgedDue(ago(168 * 60), now), false);
});

test('sourceKeys match the agreed patterns', () => {
  assert.equal(sourceKeys.unacknowledged(5, 8, new Date('2026-10-01T03:00:00Z')), 'task-unacknowledged:5:8:1790823600');
  assert.equal(sourceKeys.deadline('1d', 1, 2, '2030-06-16'), 'task-deadline-1d:1:2:2030-06-16');
  assert.equal(sourceKeys.deadline('today', 1, 2, '2030-06-15'), 'task-deadline-today:1:2:2030-06-15');
  assert.equal(sourceKeys.overdue(1, 2, '2030-06-15'), 'task-overdue:1:2:2030-06-15');
});

test('emailStatusFor maps notify results', () => {
  assert.equal(emailStatusFor({ delivered: true }), 'success');
  assert.equal(emailStatusFor({ delivered: false, reason: 'sender-error', retryable: true }), 'pending');
  assert.equal(emailStatusFor({ delivered: false, reason: 'no-sender' }), null);
  assert.equal(emailStatusFor({ delivered: false, reason: 'self' }), 'failed');
  assert.equal(emailStatusFor({ delivered: false, reason: 'invalid-email' }), 'failed');
});
