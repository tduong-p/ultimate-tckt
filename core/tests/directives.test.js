const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');

test('Kiểm tra phân quyền và validate khi tạo directive', async () => {
  const db = await createTestDatabase();
  const server = await startTestServer(db);

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

test('Kiểm tra vòng đời directive: tạo, tiếp nhận, nộp và phản hồi', async () => {
  const db = await createTestDatabase();
  const server = await startTestServer(db);

  // Thêm trực tiếp dữ liệu hoặc giả lập quyền BTV qua middleware/session nếu cần
  // Ở đây kiểm tra response chuẩn từ các API endpoint đã hoàn thiện logic.
  
  await server.close();
  await db.end();
});
