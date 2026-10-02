'use strict';

const { SETTINGS } = require('../settings/catalog');
const { hasDycMembership, unitIdByCode } = require('../units/memberships');
const { TCKT_CODE, isUnitAdmin } = require('../units/catalog');

/**
 * Create setting guard middleware factory.
 * @param {import('mysql2/promise').Pool} db
 * @returns {Function} settingGuard(settingKey) middleware factory
 */
function createSettingGuard(db) {
  /**
   * Create middleware that checks permission for a specific setting.
   * @param {string} settingKey - Key from SETTINGS catalog
   * @returns {Function} Express middleware
   */
  return function settingGuard(settingKey) {
    return async function (req, res, next) {
      const setting = SETTINGS[settingKey];
      
      // Validate setting exists
      if (!setting) {
        return res.status(500).json({ 
          error: 'Cấu hình không tồn tại trong catalog.' 
        });
      }

      const user = req.session.user;
      const memberships = req.memberships || [];
      const isDyc = hasDycMembership(memberships);

      // Platform-level: chỉ DYC
      if (setting.managed_by === 'platform') {
        if (!isDyc) {
          return res.status(403).json({ 
            error: 'Chỉ DYC được thao tác cấu hình nền tảng.' 
          });
        }
        return next();
      }

      // Unit-level: DYC hoặc TCKT admin
      if (setting.managed_by === 'unit') {
        const tcktMembership = memberships.find(m => m.code === TCKT_CODE);
        const isTcktAdmin = tcktMembership && isUnitAdmin('department', tcktMembership.role);

        if (!isDyc && !isTcktAdmin) {
          return res.status(403).json({ 
            error: 'Bạn không có quyền với cấu hình này.' 
          });
        }

        // Check lock (skip for DYC, only for write operations)
        if (req.method !== 'GET' && req.method !== 'HEAD' && !isDyc) {
          // TODO: GĐ2 - Khi bảng settings có unit_id thật, lấy unit_id từ req.unit thay vì hardcode TCKT
          const tcktId = await unitIdByCode(db, TCKT_CODE);
          
          const [locks] = await db.execute(
            `SELECT l.reason, l.locked_by, l.created_at, u.name AS locked_by_name
             FROM setting_locks l
             LEFT JOIN users u ON u.id = l.locked_by
             WHERE l.setting_key = ? AND (l.unit_id IS NULL OR l.unit_id = ?)
             LIMIT 1`,
            [settingKey, tcktId]
          );
          
          if (locks.length) {
            const lock = locks[0];
            return res.status(403).json({
              error: 'Cấu hình này đang bị DYC khoá.',
              locked: true,
              reason: lock.reason,
              locked_by_name: lock.locked_by_name,
              locked_at: lock.created_at
            });
          }
        }

        return next();
      }

      // Fallback - should not happen if catalog is correct
      res.status(500).json({ error: 'managed_by không hợp lệ.' });
    };
  };
}

module.exports = { createSettingGuard };
