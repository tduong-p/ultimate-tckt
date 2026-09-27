'use strict';

const UNIT_ROLES = Object.freeze({
  platform_owner: ['dyc_admin', 'dyc_engineer'],
  standing_committee: ['btv_lead', 'btv_member'],
  department: ['admin', 'vice_admin', 'leader', 'vice_leader', 'member'],
  office: ['officer'],
  party_cell: ['observer'],
  grassroots: ['officer']
});

// Role được quản lý membership của chính đơn vị mình. Đơn vị không có admin thì chỉ DYC quản lý.
const UNIT_ADMIN_ROLES = Object.freeze({
  platform_owner: ['dyc_admin'],
  standing_committee: ['btv_lead'],
  department: ['admin', 'vice_admin'],
  office: [],
  party_cell: [],
  grassroots: []
});

const DYC_CODE = 'DYC';
const TCKT_CODE = 'TCKT';

// ĐT/LCĐ là dữ liệu giả trong GĐ1 — thay bằng danh sách thật trước khi mở cho người dùng thật.
const SEED_UNITS = Object.freeze([
  { code: DYC_CODE, name: 'DYC — Chủ quản nền tảng', kind: 'platform_owner' },
  { code: 'BTV', name: 'Ban Thường vụ', kind: 'standing_committee' },
  { code: TCKT_CODE, name: 'Ban Tổ chức – Kiểm tra', kind: 'department' },
  { code: 'VPD', name: 'Văn phòng Đoàn', kind: 'office' },
  { code: 'CHIBO', name: 'Chi bộ', kind: 'party_cell' },
  { code: 'DEMO-DT-01', name: '[Dữ liệu giả] Đoàn trường mẫu 01', kind: 'grassroots' },
  { code: 'DEMO-LCD-01', name: '[Dữ liệu giả] Liên chi đoàn mẫu 01', kind: 'grassroots' }
]);

const SEED_UNIT_MODULES = Object.freeze({
  TCKT: ['dieu-hanh', 'ctd'],
  BTV: ['dieu-hanh', 'ctd'],
  VPD: ['ctd'],
  CHIBO: ['ctd'],
  'DEMO-DT-01': ['ctd'],
  'DEMO-LCD-01': ['ctd']
});

const isValidRole = (kind, role) => (UNIT_ROLES[kind] || []).includes(role);
const isUnitAdmin = (kind, role) => (UNIT_ADMIN_ROLES[kind] || []).includes(role);

module.exports = { UNIT_ROLES, UNIT_ADMIN_ROLES, DYC_CODE, TCKT_CODE, SEED_UNITS, SEED_UNIT_MODULES, isValidRole, isUnitAdmin };
