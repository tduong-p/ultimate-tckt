const express = require('express');

function createDirectiveRoutes(context) {
  const { db, asyncRoute } = context;
  const router = express.Router();

  const isBtv = (role) => ['btv_lead', 'btv_member'].includes(role);
  const isTcktAdmin = (role) => ['admin', 'vice_admin'].includes(role);
  const isDyc = (unit) => unit && unit.kind === 'platform_owner';

  async function calculateDirectiveProgress(directiveId) {
    const [rows] = await db.query(
      `SELECT 
         COUNT(*) as total_tasks,
         SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as done_tasks
       FROM tasks t
       JOIN activities a ON t.activity_id = a.id
       WHERE a.directive_id = ? AND t.status != 'cancelled'`,
      [directiveId]
    );
    const total = rows[0]?.total_tasks || 0;
    const done = rows[0]?.done_tasks || 0;
    if (total === 0) return 0;
    return Math.round((done / total) * 100);
  }

  router.get('/', asyncRoute(async (req, res) => {
    const unitId = req.unit?.id;
    const isGlobal = isDyc(req.unit);

    let sql = `
      SELECT d.*, 
             fu.name as from_unit_name, 
             tu.name as to_unit_name,
             u.name as creator_name,
             ou.name as owner_name
      FROM directives d
      LEFT JOIN org_units fu ON fu.id = d.from_unit_id
      LEFT JOIN org_units tu ON tu.id = d.to_unit_id
      LEFT JOIN users u ON u.id = d.created_by
      LEFT JOIN users ou ON ou.id = d.owner_user_id
    `;
    const params = [];

    if (!isGlobal) {
      sql += ' WHERE (d.from_unit_id = ? OR d.to_unit_id = ?)';
      params.push(unitId, unitId);
    }

    if (req.query.status) {
      sql += isGlobal ? ' WHERE d.status = ?' : ' AND d.status = ?';
      params.push(req.query.status);
    }

    sql += ' ORDER BY d.created_at DESC';

    const [directives] = await db.query(sql, params);

    for (const d of directives) {
      d.progress_percent = await calculateDirectiveProgress(d.id);
    }

    res.json({ data: directives });
  }));

  router.post('/', asyncRoute(async (req, res) => {
    const unitId = req.unit?.id;
    const unitRole = req.unitRole;

    if (!isBtv(unitRole) && !isDyc(req.unit)) {
      return res.status(403).json({ error: 'Chỉ BTV mới có quyền tạo chỉ đạo.' });
    }

    const { to_unit_id, title, body, deadline } = req.body;
    if (!to_unit_id || !title || !deadline) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc (đơn vị nhận, tiêu đề, thời hạn).' });
    }

    const [toUnit] = await db.query('SELECT id FROM org_units WHERE id = ? AND is_active = 1', [to_unit_id]);
    if (!toUnit.length) {
      return res.status(400).json({ error: 'Đơn vị nhận không hợp lệ hoặc đã bị khóa.' });
    }

    const [result] = await db.execute(
      `INSERT INTO directives (from_unit_id, to_unit_id, title, body, deadline, status, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'sent', ?, NOW(), NOW())`,
      [unitId, to_unit_id, title, body || null, deadline, req.user?.id]
    );

    const [created] = await db.query('SELECT * FROM directives WHERE id = ?', [result.insertId]);
    res.status(201).json(created