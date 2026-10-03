'use strict';

/**
 * Settings catalog - định nghĩa các cấu hình có trong hệ thống và ai quản lý.
 * 
 * managed_by:
 * - 'platform': Chỉ DYC (platform admin) có quyền sửa
 * - 'unit': DYC hoặc unit admin (trong GĐ1 là TCKT admin) có quyền sửa
 */
const SETTINGS = Object.freeze({
  // Platform-level: chỉ DYC
  'email.smtp': { managed_by: 'platform' },
  'cron.jobs': { managed_by: 'platform' },
  
  // Unit-level: DYC hoặc unit admin (TCKT admin trong GĐ1)
  'email.templates': { managed_by: 'unit' },
  'email.rules': { managed_by: 'unit' },
  'weight_presets': { managed_by: 'unit' }
});

module.exports = { SETTINGS };
