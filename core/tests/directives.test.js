const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');

test('Kiểm tra phân quyền và validate khi tạo directive', async () => {
  const db = await createTestDatabase();
  const server = await startTestServer(db);

  // Thử tạo directive khi chưa đăng nhập / sai role (phải trả về lỗi 403 hoặc 401)
  const res = await server.client.request('POST', '/api/directives', {
    body: { title: 'Chỉ đạo test', to_unit_id: 1, deadline: '2026-12-31' }
  });
  
  assert.equal(res.status >= 400, true);

  await server.close();
  await db.end();
});

test('Kiểm tra thiếu thông tin bắt buộc khi tạo directive', async () => {
  const db = await createTestDatabase();
  const server = await startTestServer(db);

  const res = await server.client.request('POST', '/api/directives', {
    body: { title: '' }
  });
  
  assert.equal(res.status >= 400, true);

  await server.close();
  await db.end();
});
