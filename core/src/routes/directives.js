const express = require('express');

function createDirectiveRoutes(context) {
  const { asyncRoute, db, auth } = context;
  const router = express.Router();

  const authMiddleware = typeof auth === 'function' ? auth : (req, res, next) => next();
  const isPlatformOwner = (unit) => unit && unit.kind === 'platform_owner';

  router.use(authMiddleware, (req, res, next) => {
    const actor = req.actor || req.user || {};
    const unit = req.unit || actor.unit;

    if (isPlatformOwner(unit)) return next();

    if (unit) {
      const modules = unit.modules || [];
      const hasDieuHanh = Array.isArray(modules)
        ? modules.includes('dieu-hanh')
        : (typeof modules === 'string' && modules.includes('dieu-hanh'));

      if (!hasDieuHanh) {
        return res.status(403).json({ error: 'Đơn vị chưa kích hoạt module điều hành.' });
      }
    } else {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  });

  const isBtv = (role) => ['btv_lead', 'btv_member'].includes(role);
  const isTcktAdmin = (role) => ['admin', 'vice_admin'].includes(role);
  const isDyc = (unit) => unit && unit.kind === 'platform_owner';

  // GET /api/directives
  router.get('/', asyncRoute(async (req, res) => {
    const unitId = req.unit ? req.unit.id : null;
    const [rows] = await db.execute(
      `SELECT * FROM directives WHERE from_unit_id = ? OR to_unit_id = ? ORDER BY created_at DESC`,
      [unitId, unitId]
    );
    res.json({ data: rows });
  }));

  // POST /api/directives
  router.post('/', asyncRoute(async (req, res) => {
    const unitRole = req.unitRole;
    if (!isBtv(unitRole) && !isDyc(req.unit)) {
      return res.status(403).json({ error: 'Chỉ BTV mới có quyền tạo chỉ đạo.' });
    }
    const { to_unit_id, title, body, deadline } = req.body;
    if (!to_unit_id || !title || !deadline) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc.' });
    }
    const fromUnitId = req.unit ? req.unit.id : 1;
    const [result] = await db.execute(
      `INSERT INTO directives(from_unit_id, to_unit_id, title, body, deadline, status, created_by) VALUES (?, ?, ?, ?, ?, 'sent', ?)`,
      [fromUnitId, to_unit_id, title, body || null, deadline, req.user ? req.user.id : null]
    );
    const [created] = await db.execute(`SELECT * FROM directives WHERE id = ?`, [result.insertId]);
    res.status(201).json(created[0]);
  }));

  // GET /api/directives/:id
  router.get('/:id', asyncRoute(async (req, res) => {
    const [rows] = await db.execute(`SELECT * FROM directives WHERE id = ?`, [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy chỉ đạo.' });
    }
    const directive = rows[0];
    const [submissions] = await db.execute(`SELECT * FROM submissions WHERE directive_id = ?`, [directive.id]);
    const [activities] = await db.execute(`SELECT * FROM activities WHERE directive_id = ?`, [directive.id]);
    res.json({ ...directive, submissions, activities });
  }));

  // POST /api/directives/:id/acknowledge
  router.post('/:id/acknowledge', asyncRoute(async (req, res) => {
    const unitRole = req.unitRole;
    if (!isTcktAdmin(unitRole) && !isDyc(req.unit)) {
      return res.status(403).json({ error: 'Chỉ cán bộ quản trị đơn vị nhận mới có quyền tiếp nhận.' });
    }
    const [rows] = await db.execute(`SELECT * FROM directives WHERE id = ?`, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy chỉ đạo.' });
    const directive = rows[0];
    if (!['sent', 'pending'].includes(directive.status)) {
      return res.status(400).json({ error: 'Chỉ đạo không ở trạng thái chờ tiếp nhận.' });
    }
    const ownerUserId = req.body.owner_user_id || (req.user ? req.user.id : null);
    await db.execute(
      `UPDATE directives SET status = 'acknowledged', owner_user_id = ?, acknowledged_at = NOW(), updated_at = NOW() WHERE id = ?`,
      [ownerUserId, directive.id]
    );
    const [updated] = await db.execute(`SELECT * FROM directives WHERE id = ?`, [directive.id]);
    res.json(updated[0]);
  }));

  // POST /api/directives/:id/link-activity
  router.post('/:id/link-activity', asyncRoute(async (req, res) => {
    const { activity_id } = req.body;
    if (!activity_id) return res.status(400).json({ error: 'Thiếu activity_id.' });
    const [rows] = await db.execute(`SELECT * FROM directives WHERE id = ?`, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy chỉ đạo.' });
    const directive = rows[0];
    if (!['acknowledged', 'in_progress'].includes(directive.status)) {
      return res.status(400).json({ error: 'Trạng thái chỉ đạo không cho phép liên kết hoạt động.' });
    }
    await db.execute(`UPDATE activities SET directive_id = ? WHERE id = ?`, [directive.id, activity_id]);
    await db.execute(`UPDATE directives SET status = 'in_progress', updated_at = NOW() WHERE id = ?`, [directive.id]);
    const [updated] = await db.execute(`SELECT * FROM directives WHERE id = ?`, [directive.id]);
    res.json(updated[0]);
  }));

  // POST /api/directives/:id/submit
  router.post('/:id/submit', asyncRoute(async (req, res) => {
    const [rows] = await db.execute(`SELECT * FROM directives WHERE id = ?`, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy chỉ đạo.' });
    const directive = rows[0];
    if (!['acknowledged', 'in_progress', 'revision_requested'].includes(directive.status)) {
      return res.status(400).json({ error: 'Trạng thái chỉ đạo không cho phép nộp kết quả.' });
    }
    const { source_type, source_id, note } = req.body;
    if (!source_type || !source_id) {
      return res.status(400).json({ error: 'Thiếu thông tin source.' });
    }
    const [subResult] = await db.execute(
      `INSERT INTO submissions(from_unit_id, to_unit_id, source_type, source_id, directive_id, note, submitted_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [directive.to_unit_id, directive.from_unit_id, source_type, source_id, directive.id, note || null, req.user ? req.user.id : null]
    );
    await db.execute(`UPDATE directives SET status = 'submitted', updated_at = NOW() WHERE id = ?`, [directive.id]);
    const [createdSub] = await db.execute(`SELECT * FROM submissions WHERE id = ?`, [subResult.insertId]);
    res.status(201).json(createdSub[0]);
  }));

  // POST /api/directives/:id/respond
  router.post('/:id/respond', asyncRoute(async (req, res) => {
    const unitRole = req.unitRole;
    if (!isBtv(unitRole) && !isDyc(req.unit)) {
      return res.status(403).json({ error: 'Chỉ BTV hoặc DYC mới có quyền đánh giá kết quả.' });
    }
    const [rows] = await db.execute(`SELECT * FROM directives WHERE id = ?`, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy chỉ đạo.' });
    const directive = rows[0];
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
      [response, response_note || null, req.user ? req.user.id : null, directive.id]
    );
    const [updated] = await db.execute(`SELECT * FROM directives WHERE id = ?`, [directive.id]);
    res.json(updated[0]);
  }));

  return router;
}

module.exports = {
  createDirectiveRoutes
};
