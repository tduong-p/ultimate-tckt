const express = require('express');
const { withDirectiveNames, withSubmissionNames } = require('./dieu-hanh-names');

function createDirectiveRoutes(context) {
  const { asyncRoute, db, auth } = context;
  const router = express.Router();

  const authMiddleware = typeof auth === 'function' ? auth : (req, res, next) => next();
  router.use('/api/directives', authMiddleware, (req, res, next) => {
    const actor = req.actor || req.user || {};
    const unit = req.unit || actor.unit;
    if (unit && unit.kind === 'platform_owner') {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        return res.status(403).json({ error: 'DYC chỉ có quyền xem, không được phép chỉnh sửa dữ liệu.' });
      }
      return next();
    }
    
    const modules = unit?.modules || [];
    const hasDieuHanh = Array.isArray(modules) ? modules.includes('dieu-hanh') : String(modules).includes('dieu-hanh');
    
    if (!unit || !hasDieuHanh) return res.status(403).json({ error: 'Forbidden' });
    next();
  });

  const isBtv = (role) => ['btv_lead', 'btv_member'].includes(role);
  const isTcktAdmin = (role) => ['admin', 'vice_admin'].includes(role);
  const isDyc = (unit) => unit && unit.kind === 'platform_owner';
  const canAccessDirective = (unit, directive) => {
    if (isDyc(unit)) return true;
    if (!unit || unit.id == null) return false;
    if (directive.from_unit_id == null && directive.to_unit_id == null) return true;
    return Number(directive.from_unit_id) === Number(unit.id) || Number(directive.to_unit_id) === Number(unit.id);
  };
  const canActAsRecipientUnit = (req, directive) => {
    const unitId = req.unit?.id;
    if (directive.to_unit_id != null && Number(directive.to_unit_id) !== Number(unitId)) return false;
    const actorId = (req.actor || req.user)?.id;
    const isOwner = directive.owner_user_id != null && actorId != null && Number(directive.owner_user_id) === Number(actorId);
    return isTcktAdmin(req.unitRole) || isOwner;
  };

  // GET /api/directives
  router.get('/api/directives', asyncRoute(async (req, res) => {
    const unitId = req.unit ? req.unit.id : null;
    const [rows] = await db.execute(
      `SELECT * FROM directives WHERE from_unit_id = ? OR to_unit_id = ? ORDER BY created_at DESC`,
      [unitId, unitId]
    );
    res.json({ data: await withDirectiveNames(db, rows) });
  }));

  // GET /api/directives/units — đơn vị có module dieu-hanh (đích của Giao việc/Trình)
  router.get('/api/directives/units', asyncRoute(async (req, res) => {
    const [rows] = await db.execute(
      `SELECT u.id, u.code, u.name, u.kind
       FROM org_units u
       WHERE u.is_active = 1
         AND EXISTS (SELECT 1 FROM unit_modules m WHERE m.unit_id = u.id AND m.module_id = 'dieu-hanh')
       ORDER BY u.code`
    );
    res.json({ data: rows });
  }));

  // POST /api/directives
  router.post('/api/directives', asyncRoute(async (req, res) => {
    const unitRole = req.unitRole;
    if (!isBtv(unitRole)) {
      return res.status(403).json({ error: 'Chỉ BTV mới có quyền tạo chỉ đạo.' });
    }
    const { to_unit_id, title, body, deadline } = req.body;
    if (!to_unit_id || !title || !deadline) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc.' });
    }
    const fromUnitId = req.unit ? req.unit.id : 1;
    const [result] = await db.execute(
      `INSERT INTO directives(from_unit_id, to_unit_id, title, body, deadline, status, created_by) VALUES (?, ?, ?, ?, ?, 'sent', ?)`,
      [fromUnitId, to_unit_id, title, body || null, deadline, req.actor?.id ?? null]
    );
    const [created] = await db.execute(`SELECT * FROM directives WHERE id = ?`, [result.insertId]);
    res.status(201).json(created[0]);
  }));

  // GET /api/directives/:id
  router.get('/api/directives/:id', asyncRoute(async (req, res) => {
    const [rows] = await db.execute(`SELECT * FROM directives WHERE id = ?`, [req.params.id]);
    if (rows.length === 0 || !canAccessDirective(req.unit, rows[0])) {
      return res.status(404).json({ error: 'Không tìm thấy chỉ đạo.' });
    }
    const directive = rows[0];
    const [submissions] = await db.execute(`SELECT * FROM submissions WHERE directive_id = ?`, [directive.id]);
    const [activities] = await db.execute(`SELECT * FROM activities WHERE directive_id = ?`, [directive.id]);
    const [named] = await withDirectiveNames(db, [directive]);
    res.json({ ...named, submissions: await withSubmissionNames(db, submissions), activities });
  }));

  // POST /api/directives/:id/acknowledge
  router.post('/api/directives/:id/acknowledge', asyncRoute(async (req, res) => {
    const unitRole = req.unitRole;
    if (!isTcktAdmin(unitRole)) {
      return res.status(403).json({ error: 'Chỉ cán bộ quản trị đơn vị nhận mới có quyền tiếp nhận.' });
    }
    const [rows] = await db.execute(`SELECT * FROM directives WHERE id = ?`, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy chỉ đạo.' });
    const directive = rows[0];
    if (directive.to_unit_id != null && Number(directive.to_unit_id) !== Number(req.unit?.id)) {
      return res.status(403).json({ error: 'Chỉ cán bộ quản trị đơn vị nhận mới có quyền tiếp nhận.' });
    }
    if (!['sent', 'pending'].includes(directive.status)) {
      return res.status(400).json({ error: 'Chỉ đạo không ở trạng thái chờ tiếp nhận.' });
    }
    const ownerUserId = req.body.owner_user_id || req.actor?.id || null;
    await db.execute(
      `UPDATE directives SET status = 'acknowledged', owner_user_id = ?, acknowledged_at = NOW(), updated_at = NOW() WHERE id = ?`,
      [ownerUserId, directive.id]
    );
    const [updated] = await db.execute(`SELECT * FROM directives WHERE id = ?`, [directive.id]);
    res.json(updated[0]);
  }));

  // POST /api/directives/:id/link-activity
  router.post('/api/directives/:id/link-activity', asyncRoute(async (req, res) => {
    const { activity_id } = req.body;
    if (!activity_id) return res.status(400).json({ error: 'Thiếu activity_id.' });
    const [rows] = await db.execute(`SELECT * FROM directives WHERE id = ?`, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy chỉ đạo.' });
    const directive = rows[0];
    if (!canActAsRecipientUnit(req, directive)) {
      return res.status(403).json({ error: 'Chỉ cán bộ phụ trách của đơn vị nhận mới có quyền liên kết hoạt động.' });
    }
    if (!['acknowledged', 'in_progress'].includes(directive.status)) {
      return res.status(400).json({ error: 'Trạng thái chỉ đạo không cho phép liên kết hoạt động.' });
    }
    await db.execute(`UPDATE activities SET directive_id = ? WHERE id = ?`, [directive.id, activity_id]);
    await db.execute(`UPDATE directives SET status = 'in_progress', updated_at = NOW() WHERE id = ?`, [directive.id]);
    const [updated] = await db.execute(`SELECT * FROM directives WHERE id = ?`, [directive.id]);
    res.json(updated[0]);
  }));

  // POST /api/directives/:id/submit
  router.post('/api/directives/:id/submit', asyncRoute(async (req, res) => {
    const [rows] = await db.execute(`SELECT * FROM directives WHERE id = ?`, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy chỉ đạo.' });
    const directive = rows[0];
    if (!canActAsRecipientUnit(req, directive)) {
      return res.status(403).json({ error: 'Chỉ cán bộ phụ trách của đơn vị nhận mới có quyền nộp kết quả.' });
    }
    if (!['acknowledged', 'in_progress', 'revision_requested'].includes(directive.status)) {
      return res.status(400).json({ error: 'Trạng thái chỉ đạo không cho phép nộp kết quả.' });
    }
    const { source_type, source_id, note } = req.body;
    if (!source_type || !source_id) {
      return res.status(400).json({ error: 'Thiếu thông tin source.' });
    }
    const [subResult] = await db.execute(
      `INSERT INTO submissions(from_unit_id, to_unit_id, source_type, source_id, directive_id, note, submitted_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [directive.to_unit_id, directive.from_unit_id, source_type, source_id, directive.id, note || null, req.actor?.id ?? null]
    );
    await db.execute(`UPDATE directives SET status = 'submitted', updated_at = NOW() WHERE id = ?`, [directive.id]);
    const [createdSub] = await db.execute(`SELECT * FROM submissions WHERE id = ?`, [subResult.insertId]);
    res.status(201).json(createdSub[0]);
  }));

  // POST /api/directives/:id/respond
  router.post('/api/directives/:id/respond', asyncRoute(async (req, res) => {
    const unitRole = req.unitRole;
    if (!isBtv(unitRole)) {
      return res.status(403).json({ error: 'Chỉ BTV mới có quyền đánh giá kết quả.' });
    }
    const [rows] = await db.execute(`SELECT * FROM directives WHERE id = ?`, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy chỉ đạo.' });
    const directive = rows[0];
    if (directive.from_unit_id != null && Number(directive.from_unit_id) !== Number(req.unit?.id)) {
      return res.status(403).json({ error: 'Chỉ đơn vị giao việc mới có quyền đánh giá kết quả.' });
    }
    if (directive.status !== 'submitted') {
      return res.status(400).json({ error: 'Chỉ đạo không ở trạng thái chờ phản hồi.' });
    }
    const { response, response_note } = req.body;
    if (!['accepted', 'revision_requested'].includes(response)) {
      return res.status(400).json({ error: 'Phản hồi không hợp lệ.' });
    }
    if (response === 'revision_requested' && !response_note) {
      return res.status(400).json({ error: 'Bắt buộc phải có lý do khi yêu cầu sửa.' });
    }
    const newStatus = response === 'accepted' ? 'accepted' : 'revision_requested';
    await db.execute(
      `UPDATE directives SET status = ?, updated_at = NOW() WHERE id = ?`,
      [newStatus, directive.id]
    );
    await db.execute(
      `UPDATE submissions SET response = ?, response_note = ?, responded_by = ?, responded_at = NOW() WHERE directive_id = ? AND response IS NULL`,
      [response, response_note || null, req.actor?.id ?? null, directive.id]
    );
    const [updated] = await db.execute(`SELECT * FROM directives WHERE id = ?`, [directive.id]);
    res.json(updated[0]);
  }));

  return router;
}

module.exports = {
  createDirectiveRoutes
};
