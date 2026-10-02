'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { devopsEmailAllowlist, isPlatformAdmin, platformAdmin } = require('../src/middleware/auth');
const { ensureDycAdmins } = require('../src/units/memberships');

test('Task 6 - DYC Bootstrap and platformAdmin', async (t) => {
  const originalEnv = process.env;

  t.afterEach(() => {
    process.env = { ...originalEnv };
  });

  t.after(() => {
    process.env = originalEnv;
  });

  await t.test('devopsEmailAllowlist', async (t2) => {
    await t2.test('returns empty array when no env vars are set', () => {
      delete process.env.DEVOPS_EMAILS;
      delete process.env.CORE_DEVOPS_EMAILS;
      assert.deepStrictEqual(devopsEmailAllowlist(), []);
    });

    await t2.test('parses DEVOPS_EMAILS properly', () => {
      process.env.DEVOPS_EMAILS = 'Admin@Test.com, user2@test.com , ';
      assert.deepStrictEqual(devopsEmailAllowlist(), ['admin@test.com', 'user2@test.com']);
    });

    await t2.test('parses CORE_DEVOPS_EMAILS properly', () => {
      process.env.CORE_DEVOPS_EMAILS = 'PROD@test.com,prod2@test.com';
      assert.deepStrictEqual(devopsEmailAllowlist(), ['prod@test.com', 'prod2@test.com']);
    });

    await t2.test('prioritizes DEVOPS_EMAILS over CORE_DEVOPS_EMAILS', () => {
      process.env.DEVOPS_EMAILS = 'dev@test.com';
      process.env.CORE_DEVOPS_EMAILS = 'prod@test.com';
      assert.deepStrictEqual(devopsEmailAllowlist(), ['dev@test.com']);
    });
  });

  await t.test('platformAdmin and isPlatformAdmin', async (t2) => {
    await t2.test('isPlatformAdmin returns true if user has platform_owner kind', () => {
      assert.strictEqual(isPlatformAdmin([{ kind: 'department' }]), false);
      assert.strictEqual(isPlatformAdmin([{ kind: 'platform_owner' }]), true);
    });

    await t2.test('platformAdmin middleware calls next if platform admin', () => {
      let called = false;
      const next = () => { called = true; };
      const req = { memberships: [{ kind: 'platform_owner' }] };
      const res = {};
      platformAdmin(req, res, next);
      assert.strictEqual(called, true);
    });

    await t2.test('platformAdmin middleware returns 403 if not platform admin', () => {
      let nextCalled = false;
      let statusCode = null;
      let responseBody = null;

      const next = () => { nextCalled = true; };
      const req = { memberships: [{ kind: 'department' }] };
      const res = {
        status: (code) => {
          statusCode = code;
          return {
            json: (body) => { responseBody = body; }
          };
        }
      };
      
      platformAdmin(req, res, next);
      assert.strictEqual(nextCalled, false);
      assert.strictEqual(statusCode, 403);
      assert.deepStrictEqual(responseBody, { error: 'Chỉ DYC được thao tác cấu hình nền tảng.' });
    });
  });

  await t.test('ensureDycAdmins', async (t2) => {
    await t2.test('does nothing if email list is empty', async () => {
      const db = {};
      const result = await ensureDycAdmins(db, []);
      assert.strictEqual(result, 0);
    });

    await t2.test('upserts membership for found users', async () => {
      const executeCalls = [];
      const queryCalls = [];
      
      const db = {
        execute: async (query, params) => {
          executeCalls.push({ query, params });
          if (query.includes('FROM org_units WHERE code = ?')) return [[{ id: 99 }]];
          if (query.includes('FROM org_units WHERE id = ?')) return [[{ id: 99, kind: 'platform_owner', is_active: 1 }]]; // For getUnit in upsertMembership
          if (query.includes('INSERT INTO unit_memberships')) return [[{ affectedRows: 1 }]];
          return [[]];
        },
        query: async (query, params) => {
          queryCalls.push({ query, params });
          if (query.includes('SELECT id FROM users')) return [[{ id: 1 }, { id: 2 }]];
          return [[]];
        }
      };

      const result = await ensureDycAdmins(db, ['a@b.com', 'c@d.com']);
      assert.strictEqual(result, 2);
      
      const queryCall = queryCalls.find(c => c.query.includes('SELECT id FROM users'));
      assert.deepStrictEqual(queryCall.params, [['a@b.com', 'c@d.com']]);
      
      const insertCalls = executeCalls.filter(c => c.query.includes('INSERT INTO unit_memberships'));
      assert.strictEqual(insertCalls.length, 2);
      assert.deepStrictEqual(insertCalls[0].params, [1, 99, 'dyc_admin']);
      assert.deepStrictEqual(insertCalls[1].params, [2, 99, 'dyc_admin']);
    });
  });
});
