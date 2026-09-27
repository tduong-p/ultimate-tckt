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
      sql += (sql.includes(' WHERE ') ? ' AND ' : ' WHERE ') + 'd.status = ?';
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
    res.status(201).json(created[0]);
  }));

  router.get('/:id', asyncRoute(async (req, res) => {
    const directiveId = req.params.id;
    const unitId = req.unit?.id;
    const isGlobal = isDyc(req.unit);

    const [rows] = await db.query(
      `SELECT d.*, 
              fu.name as from_unit_name, 
              tu.name as to_unit_name,
              u.name as creator_name,
              ou.name as owner_name
       FROM directives d
       LEFT JOIN org_units fu ON fu.id = d.from_unit_id
       LEFT JOIN org_units tu ON tu.id = d.to_unit_id
       LEFT JOIN users u ON u.id = d.created_by
       LEFT JOIN users ou ON ou.id = d.owner_user_id
       WHERE d.id = ?`,
      [directiveId]
    );

    const directive = rows[0];
    if (!directive) {
      return res.status(404).json({ error: 'Không tìm thấy chỉ đạo.' });
    }

    if (!isGlobal && directive.from_unit_id !== unitId && directive.to_unit_id !== unitId) {
      return res.status(403).json({ error: 'Bạn không có quyền truy cập chỉ đạo này.' });
    }

    directive.progress_percent = await calculateDirectiveProgress(directive.id);

    const [activities] = await db.query(
      `SELECT id, title, status, priority, start_date, deadline, created_at 
       FROM activities 
       WHERE directive_id = ?`,
      [directiveId]
    );
    directive.activities = activities;

    const [submissions] = await db.query(
      `SELECT * FROM submissions WHERE directive_id = ? ORDER BY created_at DESC`,
      [directiveId]
    );
    directive.submissions = submissions;

    res.json(directive);
  }));

  router.post('/:id/acknowledge', asyncRoute(async (req, res) => {
    const directiveId = req.params.id;
    const unitId = req.unit?.id;
    const unitRole = req.unitRole;

    const [rows] = await db.query('SELECT * FROM directives WHERE id = ?', [directiveId]);
    const directive = rows[0];
    if (!directive) {
      return res.status(404).json({ error: 'Không tìm thấy chỉ đạo.' });
    }

    if (directive.to_unit_id !== unitId) {
      return res.status(403).json({ error: 'Chỉ đơn vị nhận mới có quyền tiếp nhận chỉ đạo.' });
    }

    if (!isTcktAdmin(unitRole)) {
      return res.status(403).json({ error: 'Chỉ cán bộ quản trị đơn vị nhận mới có quyền tiếp nhận.' });
    }

    if (directive.status !== 'sent') {
      return res.status(400).json({ error: 'Chỉ đạo không ở trạng thái chờ tiếp nhận (sent).' });
    }

    const { owner_user_id } = req.body;
    if (!owner_user_id) {
      return res.status(400).json({ error: 'Vui lòng cử người phụ trách (owner_user_id).' });
    }

    const [membership] = await db.query(
      'SELECT 1 FROM unit_memberships WHERE unit_id = ? AND user_id = ?',
      [unitId, owner_user_id]
    );
    if (!membership.length) {
      return res.status(400).json({ error: 'Người phụ trách phải thuộc đơn vị nhận.' });
    }

    const [result] = await db.execute(
      `UPDATE directives 
       SET status = 'acknowledged', 
           owner_user_id = ?, 
           acknowledged_at = NOW(), 
           updated_at = NOW() 
       WHERE id = ? AND status = 'sent'`,
      [owner_user_id, directiveId]
    );

    if (result.affectedRows === 0) {
      return res.status(409).json({ error: 'Trạng thái chỉ đạo đã bị thay đổi đồng thời.' });
    }

    const [updated] = await db.query('SELECT * FROM directives WHERE id = ?', [directiveId]);
    res.json(updated[0]);
  }));

  router.post('/:id/link-activity', asyncRoute(async (req, res) => {
    const directiveId = req.params.id;
    const unitId = req.unit?.id;
    const unitRole = req.unitRole;
    const userId = req.user?.id;

    const [rows] = await db.query('SELECT * FROM directives WHERE id = ?', [directiveId]);
    const directive = rows[0];
    if (!directive) {
      return res.status(404).json({ error: 'Không tìm thấy chỉ đạo.' });
    }

    if (directive.to_unit_id !== unitId) {
      return res.status(403).json({ error: 'Bạn không thuộc đơn vị thụ hưởng/thực hiện chỉ đạo.' });
    }

    const isOwner = directive.owner_user_id === userId;
    if (!isTcktAdmin(unitRole) && !isOwner) {
      return res.status(403).json({ error: 'Chỉ người phụ trách hoặc ban lãnh đạo đơn vị mới được gắn hoạt động.' });
    }

    if (!['acknowledged', 'in_progress', 'revision_requested'].includes(directive.status)) {
      return res.status(400).json({ error: 'Chỉ đạo không ở trạng thái cho phép gắn hoạt động.' });
    }

    const { activity_id } = req.body;
    if (!activity_id) {
      return res.status(400).json({ error: 'Thiếu activity_id.' });
    }

    const [activityRows] = await db.query('SELECT * FROM activities WHERE id = ?', [activity_id]);
    const activity = activityRows[0];
    if (!activity) {
      return res.status(404).json({ error: 'Không tìm thấy hoạt động.' });
    }

    if (activity.unit_id !== unitId) {
      return res.status(400).json({ error: 'Hoạt động không thuộc đơn vị hiện tại.' });
    }

    await db.execute('UPDATE activities SET directive_id = ? WHERE id = ?', [directiveId, activity_id]);

    await db.execute(
      `UPDATE directives SET status = 'in_progress', updated_at = NOW() WHERE id = ? AND status IN ('acknowledged', 'revision_requested')`,
      [directiveId]
    );

    const [updated] = await db.query('SELECT * FROM directives WHERE id = ?', [directiveId]);
    res.json(updated[0]);
  }));

  router.post('/:id/submit', asyncRoute(async (req, res) => {
    const directiveId = req.params.id;
    const unitId = req.unit?.id;
    const unitRole = req.unitRole;
    const userId = req.user?.id;

    const [rows] = await db.query('SELECT * FROM directives WHERE id = ?', [directiveId]);
    const directive = rows[0];
    if (!directive) {
      return res.status(404).json({ error: 'Không tìm thấy chỉ đạo.' });
    }

    if (directive.to_unit_id !== unitId) {
      return res.status(403).json({ error: 'Chỉ đơn vị nhận mới có quyền nộp báo cáo kết quả.' });
    }

    const isOwner = directive.owner_user_id === userId;
    if (!isTcktAdmin(unitRole) && !isOwner) {
      return res.status(403).json({ error: 'Chỉ người phụ trách hoặc ban lãnh đạo đơn vị mới được trình kết quả.' });
    }

    if (!['in_progress', 'revision_requested'].includes(directive.status)) {
      return res.status(400).json({ error: 'Chỉ đạo chưa ở trạng thái sẵn sàng để nộp kết quả.' });
    }

    const { source_type, source_id, note } = req.body;
    if (!source_type || !source_id) {
      return res.status(400).json({ error: 'Thiếu source_type hoặc source_id.' });
    }

    const validSourceTypes = ['activity', 'ops_log', 'report'];
    if (!validSourceTypes.includes(source_type)) {
      return res.status(400).json({ error: 'source_type không hợp lệ.' });
    }

    const [submissionResult] = await db.execute(
      `INSERT INTO submissions (from_unit_id, to_unit_id, source_type, source_id, directive_id, note, submitted_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [directive.to_unit_id, directive.from_unit_id, source_type, source_id, directiveId, note || null, userId]
    );

    await db.execute(
      `UPDATE directives SET status = 'submitted', updated_at = NOW() WHERE id = ?`,
      [directiveId]
    );

    const [createdSubmission] = await db.query('SELECT * FROM submissions WHERE id = ?', [submissionResult.insertId]);
    res.status(201).json(createdSubmission[0]);
  }));

  router.post('/:id/respond', asyncRoute(async (req, res) => {
    const directiveId = req.params.id;
    const unitId = req.unit?.id;
    const unitRole = req.unitRole;
    const userId = req.user?.id;

    const [rows] = await db.query('SELECT * FROM directives WHERE id = ?', [directiveId]);
    const directive = rows[0];
    if (!directive) {
      return res.status(404).json({ error: 'Không tìm thấy chỉ đạo.' });
    }

    if (directive.from_unit_id !== unitId && !isDyc(req.unit)) {
      return res.status(403).json({ error: 'Chỉ đơn vị giao chỉ đạo mới có quyền phản hồi.' });
    }

    if (!isBtv(unitRole) && !isDyc(req.unit)) {
      return res.status(403).json({ error: 'Chỉ BTV hoặc DYC mới có quyền đánh giá kết quả.' });
    }

    if (directive.status !== 'submitted') {
      return res.status(400).json({ error: 'Chỉ đạo không ở trạng thái đã trình (submitted).' });
    }

    const { decision, note } = req.body;
    if (!['accepted', 'revision_requested'].includes(decision)) {
      return res.status(400).json({ error: 'Quyết định phản hồi không hợp lệ (chỉ chấp nhận accepted hoặc revision_requested).' });
    }

    if (decision === 'revision_requested' && (!note || !note.trim())) {
      return res.status(400).json({ error: 'Bắt buộc phải nhập lý do khi yêu cầu sửa đổi (revision_requested).' });
    }

    const [submissions] = await db.query(
      `SELECT id FROM submissions 
       WHERE directive_id = ? AND response IS NULL AND withdrawn_at IS NULL 
       ORDER BY created_at DESC LIMIT 1`,
      [directiveId]
    );

    const latestSubmissionId = submissions[0]?.id;

    if (latestSubmissionId) {
      await db.execute(
        `UPDATE submissions 
         SET response = ?, response_note = ?, responded_by = ?, responded_at = NOW() 
         WHERE id = ?`,
        [decision, note || null, userId, latestSubmissionId]
      );
    }

    await db.execute(
      `UPDATE directives SET status = ?, updated_at = NOW() WHERE id = ? AND status = 'submitted'`,
      [decision, directiveId]
    );

    const [updated] = await db.query('SELECT * FROM directives WHERE id = ?', [directiveId]);
    res.json(updated[0]);
  }));

  return router;
}

module.exports = {
  createDirectiveRoutes
};
