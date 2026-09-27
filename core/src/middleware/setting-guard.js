'use strict';
const { SETTINGS } = require('../settings/catalog');
const { hasDycMembership, unitIdByCode } = require('../units/memberships');
const { isUnitAdmin, TCKT_CODE } = require('../units/catalog');

function createSettingGuard(db) {
  let tcktId = null;
  return function settingGuard(key) {
    const entry = SETTINGS[key];
    if (!entry) throw new Error(`Unknown setting key ${key}`);
    return async (req, res, next) => {
      try {
        const memberships = req.memberships || [];
        const isDyc = hasDycMembership(memberships);
        if (entry.managed_by === 'platform') {
          return isDyc ? next() : res.status(403).json({ error: 'Chỉ DYC được thao tác cấu hình nền tảng.' });
        }
        // GĐ1: setting "unit" nằm trong bảng chưa có unit_id → thuộc TCKT.
        const tckt = memberships.find(m => m.code === TCKT_CODE);
        if (!isDyc && !(tckt && isUnitAdmin(tckt.kind, tckt.role))) {
          return res.status(403).json({ error: 'Bạn không có quyền với cấu hình này.' });
        }
        if (isDyc || req.method === 'GET' || req.method === 'HEAD') return next();
        tcktId ??= await unitIdByCode(db, TCKT_CODE);
        const [locks] = await db.execute(
          'SELECT reason FROM setting_locks WHERE setting_key=? AND (unit_id IS NULL OR unit_id=?) ORDER BY id LIMIT 1',
          [key, tcktId]
        );
        if (locks.length) return res.status(403).json({ error: 'Cấu hình này đang bị DYC khoá.', locked: true, reason: locks[0].reason });
        next();
      } catch (error) {
        next(error);
      }
    };
  };
}

module.exports = { createSettingGuard };
