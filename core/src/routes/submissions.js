const express = require('express');
const { withSubmissionNames } = require('./dieu-hanh-names');

function createSubmissionRoutes(context) {
  const { asyncRoute, db, auth } = context;
  const router = express.Router();

  const authMiddleware = typeof auth === 'function' ? auth : (req, res, next) => next();
  router.use('/api/submissions', authMiddleware, (req, res, next) => {
    const actor = req.actor || req.user || {};
    const unit = req.unit || actor.unit;
    if (unit && unit.kind === 'platform_owner') return next();
    
    const modules = unit?.modules || [];
    const hasDieuHanh = Array.isArray(modules) ? modules.includes('dieu-hanh') : String(modules).includes('dieu-hanh');
    
    if (!unit || !hasDieuHanh) return res.status(403).json({ error: 'Forbidden' });
    next();
  });

  const isBtv = (role) => ['btv_lead', 'btv_member'].includes(role);
  const isTcktAdmin = (role) => ['admin', 'vice_admin'].includes(role);
  const isDyc = (unit) => unit && unit.kind === 'platform_owner';

  // GET /api/submissions
  router.get('/api/submissions', asyncRoute(async (req, res) => {
    const unitId = req.unit ? req.unit.id : null;
    const [rows] = await db.execute(
      `SELECT * FROM submissions WHERE from_unit_id = ? OR to_unit_id = ? ORDER BY created_at DESC`,
      [unitId, unitId]
    );
    res.json({ data: await withSubmissionNames(db, rows) });
  }));

  // POST /api/submissions
  router.post('/api/submissions', asyncRoute(async (req, res) => {
    const unitRole = req.unitRole;
    if (!isTcktAdmin(unitRole) && !isBtv(unitRole)) {
      return res.status(403).json({ error: 'Bạn không có quyền tạo submission.' });
    }
    const { to_unit_id, source_type, source_id, directive_id, note } = req.body;
    if (!to_unit_id || !source_type || !source_id) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc.' });
    }
    const fromUnitId = req.unit ? req.unit.id : 1;
    const [result] = await db.execute(
      `INSERT INTO submissions(from_unit_id, to_unit_id, source_type, source_id, directive_id, note, submitted_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [fromUnitId, to_unit_id, source_type, source_id, directive_id || null, note || null, req.user ? req.user.id : null]
    );
    const [created] = await db.execute(`SELECT * FROM submissions WHERE id = ?`, [result.insertId]);
    res.status(201).json(created[0]);
  }));

  // GET /api/submissions/:id
  router.get('/api/submissions/:id', asyncRoute(async (req, res) => {
    const [rows] = await db.execute(`SELECT * FROM submissions WHERE id = ?`, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy submission.' });
    res.json((await withSubmissionNames(db, [rows[0]]))[0]);
  }));

  // POST /api/submissions/:id/respond
  router.post('/api/submissions/:id/respond', asyncRoute(async (req, res) => {
    const unitRole = req.unitRole;
    if (!isBtv(unitRole) && !isDyc(req.unit)) {
      return res.status(403).json({ error: 'Chỉ BTV hoặc DYC mới có quyền phản hồi submission.' });
    }
    const { response, response_note } = req.body;
    if (!['seen', 'revision_requested', 'accepted'].includes(response)) {
      return res.status(400).json({ error: 'Trạng thái phản hồi không hợp lệ.' });
    }
    const [rows] = await db.execute(`SELECT * FROM submissions WHERE id = ?`, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy submission.' });
    await db.execute(
      `UPDATE submissions SET response = ?, response_note = ?, responded_by = ?, responded_at = NOW() WHERE id = ?`,
      [response, response_note || null, req.user ? req.user.id : null, req.params.id]
    );
    const [updated] = await db.execute(`SELECT * FROM submissions WHERE id = ?`, [req.params.id]);
    res.json(updated[0]);
  }));

  // POST /api/submissions/:id/withdraw
  router.post('/api/submissions/:id/withdraw', asyncRoute(async (req, res) => {
    const unitRole = req.unitRole;
    if (!isTcktAdmin(unitRole)) {
      return res.status(403).json({ error: 'Chỉ đơn vị gửi mới có quyền rút lại submission khi chưa phản hồi.' });
    }
    const [rows] = await db.execute(`SELECT * FROM submissions WHERE id = ?`, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy submission.' });
    const sub = rows[0];
    if (sub.response !== null) {
      return res.status(400).json({ error: 'Không thể rút lại submission đã có phản hồi.' });
    }
    await db.execute(`UPDATE submissions SET withdrawn_at = NOW() WHERE id = ?`, [req.params.id]);
    const [updated] = await db.execute(`SELECT * FROM submissions WHERE id = ?`, [req.params.id]);
    res.json(updated[0]);
  }));

  return router;
}

module.exports = {
  createSubmissionRoutes
};
