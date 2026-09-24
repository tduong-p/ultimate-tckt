'use strict';

// managed_by: 'platform' → chỉ DYC; 'unit' → admin đơn vị sửa được, DYC có thể khoá (setting_locks).
const SETTINGS = Object.freeze({
  'email.smtp': { managed_by: 'platform' },
  'cron.jobs': { managed_by: 'platform' },
  'email.templates': { managed_by: 'unit' },
  'email.rules': { managed_by: 'unit' },
  weight_presets: { managed_by: 'unit' }
});

module.exports = { SETTINGS };
