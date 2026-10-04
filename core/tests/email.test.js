const test = require('node:test');
const assert = require('node:assert/strict');
const { isDeliverableEmail, emailDomain } = require('../src/email');

test('isDeliverableEmail accepts real-looking addresses', () => {
  for (const e of ['an@hust.edu.vn', '  An@HUST.edu.vn ', 'user123@example.com', 'a.b+c@sis.hust.edu.vn']) {
    assert.equal(isDeliverableEmail(e), true, e);
  }
});

test('isDeliverableEmail rejects malformed or reserved-domain addresses', () => {
  for (const e of ['', null, undefined, 'an', 'an@', '@hust.edu.vn', 'an@hust', 'an @hust.edu.vn', 'a@b@hust.edu.vn',
    'x@tckt.local', 'x@foo.localhost', 'x@a.test', 'x@a.invalid', 'x@a.example']) {
    assert.equal(isDeliverableEmail(e), false, String(e));
  }
});

test('emailDomain returns the lower-cased part after @', () => {
  assert.equal(emailDomain('An@Hust.edu.vn'), 'hust.edu.vn');
});
