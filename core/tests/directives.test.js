const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('node:http');
const { createDirectiveRoutes } = require('../src/routes/directives');
const { createSubmissionRoutes } = require('../src/routes/submissions');
const { asyncRoute } = require('../src/routes/utils');

function createMockApp(dbMock, customMiddleware = (req, res, next) => next()) {
  const app = express();
  app.use(express.json());
  app.use(customMiddleware);
  
  const context = { asyncRoute, db: dbMock };
  app.use(createDirectiveRoutes(context));
  app.use(createSubmissionRoutes(context));
  return app;
}

function startTestServer(app) {
  const server = http.createServer(app);
  return new Promise(resolve => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      const baseUrl = `http://127.0.0.1:${port}`;
      resolve({
        baseUrl,
        client: {
          request: async (method, path, options = {}) => {
            const res = await fetch(`${baseUrl}${path}`, {
              method,
              headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
              body: options.body !== undefined ? JSON.stringify(options.body) : undefined
            });
            const json = await res.json().catch(() => ({}));
            return { status: res.status, body: json };
          }
        },
        close: () => new Promise(r => server.close(r))
      });
    });
  });
}

describe('Directives & Submissions API Tests', () => {
  test('GET /api/directives lấy danh sách chỉ đạo thành công', async () => {
    const dbMock = {
      execute: async (sql, params) => {
        if (sql.includes('SELECT * FROM directives')) {
          return [[{ id: 1, title: 'Test Directive', status: 'sent' }]];
        }
        return [[]];
      }
    };

    const app = createMockApp(dbMock, (req, res, next) => {
      req.unit = { id: 1, kind: 'standing_committee', modules: ['dieu-hanh'] };
      req.unitRole = 'btv_lead';
      next();
    });

    const server = await startTestServer(app);
    const res = await server.client.request('GET', '/api/directives');
    
    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].title, 'Test Directive');

    await server.close();
  });

  test('POST /api/directives tạo chỉ đạo thành công với btv_lead', async () => {
    const dbMock = {
      execute: async (sql, params) => {
        if (sql.includes('INSERT INTO directives')) {
          return [{ insertId: 10 }];
        }
        if (sql.includes('SELECT * FROM directives WHERE id = ?')) {
          return [[{ id: 10, title: 'Chỉ đạo mới', status: 'sent' }]];
        }
        return [[]];
      }
    };

    const app = createMockApp(dbMock, (req, res, next) => {
      req.unit = { id: 1, kind: 'standing_committee', modules: ['dieu-hanh'] };
      req.unitRole = 'btv_lead';
      req.user = { id: 99 };
      next();
    });

    const server = await startTestServer(app);
    const res = await server.client.request('POST', '/api/directives', {
      body: { to_unit_id: 2, title: 'Chỉ đạo mới', deadline: '2026-12-31' }
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.title, 'Chỉ đạo mới');

    await server.close();
  });

  test('POST /api/directives trả về 403 nếu không phải BTV', async () => {
    const dbMock = { execute: async () => [[]] };
    const app = createMockApp(dbMock, (req, res, next) => {
      req.unit = { id: 2, kind: 'department', modules: ['dieu-hanh'] };
      req.unitRole = 'member';
      next();
    });

    const server = await startTestServer(app);
    const res = await server.client.request('POST', '/api/directives', {
      body: { to_unit_id: 2, title: 'Sai quyền', deadline: '2026-12-31' }
    });

    assert.equal(res.status, 403);

    await server.close();
  });

  test('POST /api/directives/:id/acknowledge tiếp nhận thành công khi là TCKT admin', async () => {
    let callCount = 0;
    const dbMock = {
      execute: async (sql, params) => {
        if (sql.includes('SELECT * FROM directives WHERE id = ?')) {
          callCount++;
          if (callCount === 1) {
            return [[{ id: 1, status: 'sent' }]];
          } else {
            return [[{ id: 1, status: 'acknowledged' }]];
          }
        }
        if (sql.includes('UPDATE directives SET status = \'acknowledged\'')) {
          return [{ affectedRows: 1 }];
        }
        return [[]];
      }
    };

    const app = createMockApp(dbMock, (req, res, next) => {
      req.unit = { id: 2, kind: 'department', modules: ['dieu-hanh'] };
      req.unitRole = 'admin';
      next();
    });

    const server = await startTestServer(app);
    const res = await server.client.request('POST', '/api/directives/1/acknowledge', {
      body: {}
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'acknowledged');

    await server.close();
  });

  test('POST /api/directives/:id/link-activity liên kết hoạt động thành công', async () => {
    let callCount = 0;
    const dbMock = {
      execute: async (sql, params) => {
        if (sql.includes('SELECT * FROM directives WHERE id = ?')) {
          callCount++;
          if (callCount === 1) {
            return [[{ id: 1, status: 'acknowledged' }]];
          } else {
            return [[{ id: 1, status: 'in_progress' }]];
          }
        }
        if (sql.includes('UPDATE activities SET directive_id = ?')) {
          return [{ affectedRows: 1 }];
        }
        if (sql.includes('UPDATE directives SET status = \'in_progress\'')) {
          return [{ affectedRows: 1 }];
        }
        return [[]];
      }
    };

    const app = createMockApp(dbMock, (req, res, next) => {
      req.unit = { id: 2, kind: 'department', modules: ['dieu-hanh'] };
      req.unitRole = 'admin';
      next();
    });

    const server = await startTestServer(app);
    const res = await server.client.request('POST', '/api/directives/1/link-activity', {
      body: { activity_id: 5 }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'in_progress');

    await server.close();
  });

  test('POST /api/directives/:id/submit trình kết quả thành công', async () => {
    let callCount = 0;
    const dbMock = {
      execute: async (sql, params) => {
        if (sql.includes('SELECT * FROM directives WHERE id = ?')) {
          return [[{ id: 1, status: 'in_progress', to_unit_id: 2, from_unit_id: 1 }]];
        }
        if (sql.includes('INSERT INTO submissions')) {
          return [{ insertId: 20 }];
        }
        if (sql.includes('SELECT * FROM submissions WHERE id = ?')) {
          return [[{ id: 20, directive_id: 1, source_type: 'activity' }]];
        }
        return [[]];
      }
    };

    const app = createMockApp(dbMock, (req, res, next) => {
      req.unit = { id: 2, kind: 'department', modules: ['dieu-hanh'] };
      req.unitRole = 'admin';
      next();
    });

    const server = await startTestServer(app);
    const res = await server.client.request('POST', '/api/directives/1/submit', {
      body: { source_type: 'activity', source_id: 5, note: 'Báo cáo hoàn thành' }
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.directive_id, 1);

    await server.close();
  });

  test('POST /api/submissions/:id/respond phản hồi thành công', async () => {
    const dbMock = {
      execute: async (sql, params) => {
        if (sql.includes('SELECT * FROM submissions WHERE id = ?')) {
          return [[{ id: 20, response: null }]];
        }
        if (sql.includes('UPDATE submissions SET response = ?')) {
          return [{ affectedRows: 1 }];
        }
        if (sql.includes('SELECT * FROM submissions WHERE id = ?')) {
          return [[{ id: 20, response: 'accepted' }]];
        }
        return [[]];
      }
    };

    const app = createMockApp(dbMock, (req, res, next) => {
      req.unit = { id: 1, kind: 'standing_committee', modules: ['dieu-hanh'] };
      req.unitRole = 'btv_lead';
      next();
    });

    const server = await startTestServer(app);
    const res = await server.client.request('POST', '/api/submissions/20/respond', {
      body: { response: 'accepted' }
    });

    assert.equal(res.status, 200);
    
    await server.close();
  });

  test('SEC-01: chặn đọc chéo đơn vị (IDOR) trên GET /api/directives/:id và GET /api/submissions/:id', async () => {
    const dbMock = {
      execute: async (sql) => {
        if (sql.includes('SELECT * FROM directives WHERE id = ?')) {
          return [[{ id: 9, from_unit_id: 1, to_unit_id: 2, title: 'Mật' }]];
        }
        if (sql.includes('SELECT * FROM submissions WHERE id = ?')) {
          return [[{ id: 19, from_unit_id: 2, to_unit_id: 1, note: 'Mật' }]];
        }
        return [[]];
      }
    };

    const app = createMockApp(dbMock, (req, _res, next) => {
      req.unit = { id: 3, kind: 'department', modules: ['dieu-hanh'] };
      req.unitRole = 'admin';
      next();
    });

    const server = await startTestServer(app);
    const dirRes = await server.client.request('GET', '/api/directives/9');
    const subRes = await server.client.request('GET', '/api/submissions/19');
    assert.equal(dirRes.status, 404);
    assert.equal(subRes.status, 404);
    await server.close();
  });

  test('SEC-01: chặn member thường hoặc đơn vị khác gọi link-activity, submit, acknowledge, withdraw', async () => {
    const dbMock = {
      execute: async (sql) => {
        if (sql.includes('SELECT * FROM directives WHERE id = ?')) {
          return [[{ id: 1, status: 'acknowledged', from_unit_id: 1, to_unit_id: 2, owner_user_id: 50 }]];
        }
        if (sql.includes('SELECT * FROM submissions WHERE id = ?')) {
          return [[{ id: 20, from_unit_id: 2, to_unit_id: 1, response: null }]];
        }
        return [[]];
      }
    };

    // Member thường của đúng đơn vị nhưng không phải owner_user_id
    const memberApp = createMockApp(dbMock, (req, _res, next) => {
      req.unit = { id: 2, kind: 'department', modules: ['dieu-hanh'] };
      req.unitRole = 'member';
      req.actor = { id: 99 };
      next();
    });
    const s1 = await startTestServer(memberApp);
    assert.equal((await s1.client.request('POST', '/api/directives/1/link-activity', { body: { activity_id: 5 } })).status, 403);
    assert.equal((await s1.client.request('POST', '/api/directives/1/submit', { body: { source_type: 'activity', source_id: 5 } })).status, 403);
    await s1.close();

    // Admin của đơn vị khác (id=3) cố tình thao tác lên directive/submission của đơn vị 2
    const crossUnitApp = createMockApp(dbMock, (req, _res, next) => {
      req.unit = { id: 3, kind: 'department', modules: ['dieu-hanh'] };
      req.unitRole = 'admin';
      req.actor = { id: 50 };
      next();
    });
    const s2 = await startTestServer(crossUnitApp);
    assert.equal((await s2.client.request('POST', '/api/directives/1/acknowledge', { body: {} })).status, 403);
    assert.equal((await s2.client.request('POST', '/api/directives/1/link-activity', { body: { activity_id: 5 } })).status, 403);
    assert.equal((await s2.client.request('POST', '/api/submissions/20/withdraw', { body: {} })).status, 403);
    await s2.close();
  });

  test('SEC-01: DYC (platform_owner) chỉ có quyền đọc, bị chặn 403 khi gọi POST trên directives và submissions', async () => {
    const dbMock = { execute: async () => [[]] };
    const dycApp = createMockApp(dbMock, (req, _res, next) => {
      req.unit = { id: 99, kind: 'platform_owner', modules: [] };
      req.unitRole = 'dyc_admin';
      next();
    });
    const server = await startTestServer(dycApp);
    assert.equal((await server.client.request('POST', '/api/directives', { body: { to_unit_id: 2, title: 'X', deadline: '2026-12-31' } })).status, 403);
    assert.equal((await server.client.request('POST', '/api/submissions', { body: { to_unit_id: 1, source_type: 'activity', source_id: 1 } })).status, 403);
    await server.close();
  });
});
