'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createAccessPolicies } = require('../src/policies/access');

test('scopeFor DYC returns 1=1', async () => {
  const mockDb = {
    execute: async () => [[]]
  };
  const policies = createAccessPolicies(mockDb, () => false, () => false, {
    recordAudit: async () => {}
  });

  const viewer = {
    id: 1,
    unit: { kind: 'platform_owner', id: 99 },
    unitRole: 'dyc_admin'
  };

  const scope = await policies.scopeFor(viewer, 'activities');
  assert.equal(scope.sql, '1=1');
  assert.deepEqual(scope.params, []);
});

test('scopeFor same unit returns unit_id = ?', async () => {
  const mockDb = {
    execute: async (sql, params) => {
      // Mock no visibility policies
      if (sql.includes('unit_visibility_policies')) return [[]];
      return [[]];
    }
  };
  const policies = createAccessPolicies(mockDb, () => false, () => false, {
    recordAudit: async () => {}
  });

  const viewer = {
    id: 2,
    unit: { kind: 'department', id: 1 },
    unitRole: 'member'
  };

  const scope = await policies.scopeFor(viewer, 'activities', { alias: 'a' });
  // By default, same unit
  assert.ok(scope.sql.includes('a.unit_id=?'));
  assert.equal(scope.params[0], 1);
});
