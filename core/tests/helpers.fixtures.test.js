const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { createUser } = require('./helpers/fixtures');

test('createUser without an email override returns the email actually stored in the database', async () => {
  const { pool, teardown } = await createTestDatabase();
  try {
    const user = await createUser(pool, { role: 'admin' });
    assert.equal(typeof user.email, 'string');
    assert.ok(user.email.length > 0);

    const [rows] = await pool.execute('SELECT email FROM users WHERE id = ?', [user.id]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].email, user.email);
  } finally {
    await teardown();
  }
});
