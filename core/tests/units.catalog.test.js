'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  SEED_UNITS,
  SEED_UNIT_MODULES,
  UNIT_ROLES,
  UNIT_ADMIN_ROLES,
  DYC_CODE,
  BTV_CODE,
  TCKT_CODE,
  isValidRole,
  isUnitAdmin
} = require('../src/units/catalog');

test('role validity is checked against the unit kind', () => {
  assert.equal(isValidRole('department', 'vice_leader'), true);
  assert.equal(isValidRole('department', 'btv_lead'), false);
  assert.equal(isValidRole('standing_committee', 'btv_member'), true);
  assert.equal(isValidRole('platform_owner', 'dyc_engineer'), true);
  assert.equal(isValidRole('party_cell', 'observer'), true);
  assert.equal(isValidRole('grassroots', 'officer'), true);
  assert.equal(isValidRole('nope', 'officer'), false);
  
  assert.deepEqual(UNIT_ROLES.department, ['admin', 'vice_admin', 'leader', 'vice_leader', 'member']);
});

test('unit admins are dyc_admin, btv_lead and TCKT admin/vice_admin only', () => {
  assert.equal(isUnitAdmin('platform_owner', 'dyc_admin'), true);
  assert.equal(isUnitAdmin('platform_owner', 'dyc_engineer'), false);
  assert.equal(isUnitAdmin('standing_committee', 'btv_lead'), true);
  assert.equal(isUnitAdmin('department', 'vice_admin'), true);
  assert.equal(isUnitAdmin('department', 'leader'), false);
  assert.equal(isUnitAdmin('office', 'officer'), false);
});

test('seed units cover every kind, codes are unique, grassroots are marked fake', () => {
  const codes = SEED_UNITS.map(u => u[0]);
  assert.equal(new Set(codes).size, codes.length, 'Unit codes must be unique');
  
  // Kiểm tra có đủ mọi kind
  for (const kind of Object.keys(UNIT_ROLES)) {
    assert.ok(SEED_UNITS.some(u => u[2] === kind), `Missing kind: ${kind}`);
  }
  
  // Kiểm tra có DYC, BTV, TCKT
  assert.ok(codes.includes(TCKT_CODE) && codes.includes(DYC_CODE) && codes.includes(BTV_CODE));
  
  // Grassroots phải đánh dấu giả
  for (const u of SEED_UNITS.filter(x => x[2] === 'grassroots')) {
    assert.match(u[1], /^\[Dữ liệu giả\]/, `Grassroots unit ${u[0]} must be marked fake`);
  }
});

test('SEED_UNIT_MODULES assigns modules correctly per spec', () => {
  // TCKT và BTV có cả điều hành và ctd
  assert.deepEqual(SEED_UNIT_MODULES.TCKT, ['dieu-hanh', 'ctd']);
  assert.deepEqual(SEED_UNIT_MODULES.BTV, ['dieu-hanh', 'ctd']);
  
  // Các đơn vị khác chỉ có ctd
  for (const code of Object.keys(SEED_UNIT_MODULES)) {
    if (!['TCKT', 'BTV', 'DYC'].includes(code)) {
      assert.deepEqual(SEED_UNIT_MODULES[code], ['ctd'], `Unit ${code} should only have ctd module`);
    }
  }
  
  // DYC không có module nào
  assert.equal(SEED_UNIT_MODULES.DYC, undefined);
});
