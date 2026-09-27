'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { devopsEmailAllowlist, admin } = require('../src/middleware/auth');

test('devopsEmailAllowlist lowercases and trims DEVOPS_EMAILS', () => {
  const original = process.env.DEVOPS_EMAILS;
  process.env.DEVOPS_EMAILS = 'boss@hust.edu.vn, Other@Hust.Edu.Vn,,';
  try {
    assert.deepEqual(devopsEmailAllowlist(), ['boss@hust.edu.vn', 'other@hust.edu.vn']);
  } finally {
    if (original === undefined) delete process.env.DEVOPS_EMAILS; else process.env.DEVOPS_EMAILS = original;
  }
});

test('admin middleware reads the projected actor role, not the session row', () => {
  const res = () => { const r = {}; r.status = c => { r.statusCode = c; return r; }; r.json = b => { r.body = b; return r; }; return r; };
  let called = false;
  admin({ session: { user: { role: 'member' } }, actor: { role: 'admin' } }, res(), () => { called = true; });
  assert.equal(called, true);
  const r2 = res();
  admin({ session: { user: { role: 'admin' } }, actor: { role: 'member' } }, r2, () => assert.fail('must not pass'));
  assert.equal(r2.statusCode, 403);
});
