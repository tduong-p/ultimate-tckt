'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { isDevops, devops } = require('../src/middleware/auth');

test('isDevops is true when the user row has is_devops=1', () => {
  assert.equal(isDevops({ role: 'admin', is_devops: 1 }), true);
  assert.equal(isDevops({ role: 'admin', is_devops: 0 }), false);
  assert.equal(isDevops(null), false);
});

test('isDevops is true when the user email is in DEVOPS_EMAILS regardless of the DB flag', () => {
  const original = process.env.DEVOPS_EMAILS;
  process.env.DEVOPS_EMAILS = 'boss@hust.edu.vn, Other@Hust.Edu.Vn';
  try {
    assert.equal(isDevops({ role: 'admin', is_devops: 0, email: 'boss@hust.edu.vn' }), true);
    assert.equal(isDevops({ role: 'admin', is_devops: 0, email: 'other@hust.edu.vn' }), true);
    assert.equal(isDevops({ role: 'admin', is_devops: 0, email: 'nobody@hust.edu.vn' }), false);
  } finally {
    if (original === undefined) delete process.env.DEVOPS_EMAILS; else process.env.DEVOPS_EMAILS = original;
  }
});

test('devops middleware requires isExecutive AND isDevops', () => {
  const makeRes = () => { const res = {}; res.status = c => { res.statusCode = c; return res; }; res.json = b => { res.body = b; return res; }; return res; };
  let called = false;
  const next = () => { called = true; };

  called = false;
  devops({ session: { user: { role: 'admin', is_devops: 1 } } }, makeRes(), next);
  assert.equal(called, true);

  called = false;
  const res2 = makeRes();
  devops({ session: { user: { role: 'admin', is_devops: 0 } } }, res2, next);
  assert.equal(called, false);
  assert.equal(res2.statusCode, 403);

  called = false;
  const res3 = makeRes();
  devops({ session: { user: { role: 'leader', is_devops: 1 } } }, res3, next);
  assert.equal(called, false);
  assert.equal(res3.statusCode, 403);
});
