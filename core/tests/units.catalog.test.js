'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { UNIT_ROLES, SEED_UNITS, SEED_UNIT_MODULES, isValidRole, isUnitAdmin, TCKT_CODE, DYC_CODE } = require('../src/units/catalog');

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
  const codes = SEED_UNITS.map(u => u.code);
  assert.equal(new Set(codes).size, codes.length);
  for (const kind of Object.keys(UNIT_ROLES)) assert.ok(SEED_UNITS.some(u => u.kind === kind), kind);
  assert.ok(codes.includes(TCKT_CODE) && codes.includes(DYC_CODE));
  for (const u of SEED_UNITS.filter(x => x.kind === 'grassroots')) assert.match(u.name, /^\[Dữ liệu giả\]/);
  assert.deepEqual(SEED_UNIT_MODULES.TCKT, ['dieu-hanh', 'ctd']);
  assert.deepEqual(SEED_UNIT_MODULES.BTV, ['dieu-hanh', 'ctd']);
  for (const code of codes.filter(c => !['TCKT', 'BTV', 'DYC'].includes(c))) assert.deepEqual(SEED_UNIT_MODULES[code], ['ctd'], code);
});
