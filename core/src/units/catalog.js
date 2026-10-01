'use strict';

/**
 * Đơn vị và role catalog — nguồn sự thật duy nhất
 * 
 * File này định nghĩa cấu trúc đơn vị, role hợp lệ và module được bật.
 * Migration, middleware authorization và test đều import từ đây.
 * 
 * Theo design spec §2 (Cơ cấu tổ chức) và §5.1 (Đơn vị seed).
 */

// Danh sách đơn vị seed — [code, name, kind]
const SEED_UNITS = [
  ['DYC', 'DYC — Chủ quản nền tảng', 'platform_owner'],
  ['BTV', 'Ban Thường vụ', 'standing_committee'],
  ['TCKT', 'Ban Tổ chức – Kiểm tra', 'department'],
  ['VPD', 'Văn phòng Đoàn', 'office'],
  ['CHIBO', 'Chi bộ', 'party_cell'],
  ['DEMO-DT-01', '[Dữ liệu giả] Đoàn trường mẫu 01', 'grassroots'],
  ['DEMO-LCD-01', '[Dữ liệu giả] Liên chi đoàn mẫu 01', 'grassroots']
];

// Module được bật cho từng đơn vị (design spec §8.2)
const SEED_UNIT_MODULES = {
  TCKT: ['dieu-hanh', 'ctd'],
  BTV: ['dieu-hanh', 'ctd'],
  VPD: ['ctd'],
  CHIBO: ['ctd'],
  'DEMO-DT-01': ['ctd'],
  'DEMO-LCD-01': ['ctd']
  // DYC không có module nào được bật
};

// Role hợp lệ cho mỗi kind (design spec §2)
const UNIT_ROLES = Object.freeze({
  platform_owner: ['dyc_admin', 'dyc_engineer'],
  standing_committee: ['btv_lead', 'btv_member'],
  department: ['admin', 'vice_admin', 'leader', 'vice_leader', 'member'],
  office: ['officer'],
  party_cell: ['observer'],
  grassroots: ['officer']
});

// Role có quyền quản lý membership của chính đơn vị mình
// Đơn vị không có admin → chỉ DYC quản lý
const UNIT_ADMIN_ROLES = Object.freeze({
  platform_owner: ['dyc_admin'],
  standing_committee: ['btv_lead'],
  department: ['admin', 'vice_admin'],
  office: [],
  party_cell: [],
  grassroots: []
});

const DYC_CODE = 'DYC';
const BTV_CODE = 'BTV';
const TCKT_CODE = 'TCKT';

/**
 * Kiểm tra role hợp lệ cho một unit kind
 * @param {string} kind - Unit kind (platform_owner, department, etc.)
 * @param {string} role - Role cần kiểm tra
 * @returns {boolean} true nếu role hợp lệ
 */
const isValidRole = (kind, role) => {
  const validRoles = UNIT_ROLES[kind];
  return validRoles && validRoles.includes(role);
};

/**
 * Kiểm tra role có quyền quản lý membership không
 * @param {string} kind - Unit kind
 * @param {string} role - Role cần kiểm tra
 * @returns {boolean} true nếu role là admin của đơn vị
 */
const isUnitAdmin = (kind, role) => {
  const adminRoles = UNIT_ADMIN_ROLES[kind];
  return adminRoles && adminRoles.includes(role);
};

module.exports = {
  SEED_UNITS,
  SEED_UNIT_MODULES,
  UNIT_ROLES,
  UNIT_ADMIN_ROLES,
  DYC_CODE,
  BTV_CODE,
  TCKT_CODE,
  isValidRole,
  isUnitAdmin
};
