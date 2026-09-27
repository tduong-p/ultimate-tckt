const express = require('express');

function createSubmissionRoutes(context) {
  const { db, asyncRoute } = context;
  const router = express.Router();

  const isDyc = (unit) => unit && unit.kind === 'platform_owner';

  // GET /api/submissions
  router.get('/', asyncRoute(async (req, res) => {
    const unitId = req.unit?.id;
    const isGlobal = isDyc(req.unit);

    let sql = `
      SELECT s.*,
             fu.name AS from_unit_name,
             tu.name AS to_unit_name,
             u.name AS submitter_name,
             ru.name AS responder_name
      FROM submissions s
      LEFT JOIN org_units fu ON fu.id = s.from_unit_id
      LEFT JOIN org_units tu ON tu.id = s.to_unit_id
      LEFT JOIN users u ON u.id = s.submitted_by
      LEFT JOIN users ru ON ru.id = s.responded_by
    `;
    const params = [];

    if (!isGlobal) {
      sql += ' WHERE (s.from_unit_id = ? OR s.to_unit_id = ?)';
      params.push(unitId, unitId);
    }

    if (req.query.directive_id) {
      sql += (sql.includes(' WHERE ') ? ' AND ' : ' WHERE ') + 's.directive_id = ?';
      params.push(req.query.directive_id);
    }

    if (req.query.source_type) {
      sql += (sql.includes(' WHERE ') ? ' AND ' : ' WHERE ') + 's.source_type = ?';
      params.push(req.query.source_type);
    }

    sql += ' ORDER BY s.created_at DESC';

    const [submissions] = await db.query(sql, params);
    res.json({ data: submissions });
  }));

  // POST /api/submissions
  router.post('/', asyncRoute(async (req, res) => {
    const unitId = req.unit?.id;
    const userId = req.user?.id;
    const { to_unit_id, source_type, source_id, directive_id, note } = req.body;

    if (!to_unit_id || !source_type || !source_id) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc (đơn vị nhận, loại tài nguyên, mã tài nguyên).' });
    }

    const validSourceTypes = ['activity', 'ops_log', 'report'];
    if (!validSourceTypes.includes(source_type)) {
      return res.status(400).json({ error: 'Loại tài nguyên không hợp lệ.' });
    }

    const [toUnit] = await db.query('SELECT id FROM org_units WHERE id = ? AND is_active = 1', [to_unit_id]);
    if (!toUnit.length) {
      return res.status(400).json({ error: 'Đơn vị nhận không tồn tại hoặc đã bị khóa.' });
    }

    if (directive_id) {
      const [directives] = await db.query('SELECT * FROM directives WHERE id = ?', [directive_id]);
      const directive = directives[0];
      if (!directive) {
        return res.status(404).json({ error: 'Không tìm thấy chỉ đạo được gắn.' });
      }
      if (directive.to_unit_id !== unitId || directive.from_unit_id !== Number(to_unit_id)) {
        return res.status(400).json({ error: 'Chỉ đạo không khớp đơn vị gửi và nhận.' });
      }
    }

    const [result] = await db.execute(
      `INSERT INTO submissions (from_unit_id, to_unit_id, source_type, source_id, directive_id, note, submitted_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [unitId, to_unit_id, source_type, source_id, directive_id || null, note || null, userId]
    );

    if (directive_id) {
      await db.execute(
        `UPDATE directives SET status = 'submitted', updated_at = NOW() WHERE id = ?`,
        [directive_id]
      );
    }

    const [created] = await db.query('SELECT * FROM submissions WHERE id = ?', [result.insertId]);
    res.status(201).json(created[0]);
  }));

  // GET /api/submissions/:id
  router.get('/:id', asyncRoute(async (req, res) => {
    const submissionId = req.params.id;
    const unitId = req.unit?.id;
    const isGlobal = isDyc(req.unit);

    const [rows] = await db.query(
      `SELECT s.*,
              fu.name AS from_unit_name,
              tu.name AS to_unit_name,
              u.name AS submitter_name,
              ru.name AS responder_name
       FROM submissions s
       LEFT JOIN org_units fu ON fu.id = s.from_unit_id
       LEFT JOIN org_units tu ON tu.id = s.to_unit_id
       LEFT JOIN users u ON u.id = s.submitted_by
       LEFT JOIN users ru ON ru.id = s.responded_by
       WHERE s.id = ?`,
      [submissionId]
    );

    const submission = rows[0];
    if (!submission) {
      return res.status(404).json({ error: 'Không tìm thấy bản trình.' });
    }

    if (!isGlobal && submission.from_unit_id !== unitId && submission.to_unit_id !== unitId) {
      return res.status(403).json({ error: 'Bạn không có quyền xem bản trình này.' });
    }

    res.json(submission);
  }));

  // POST /api/submissions/:id/respond
  router.post('/:id/respond', asyncRoute(async (req, res) => {
    const submissionId = req.params.id;
    const unitId = req.unit?.id;
    const userId = req.user?.id;
    const isGlobal = isDyc(req.unit);

    const [rows] = await db.query('SELECT * FROM submissions WHERE id = ?', [submissionId]);
    const submission = rows[0];
    if (!submission) {
      return res.status(404).json({ error: 'Không tìm thấy bản trình.' });
    }

    if (!isGlobal && submission.to_unit_id !== unitId) {
      return res.status(403).json({ error: 'Chỉ đơn vị nhận mới có quyền phản hồi bản trình này.' });
    }

    if (submission.withdrawn_at) {
      return res.status(400).json({ error: 'Bản trình đã bị rút lại, không thể phản hồi.' });
    }

    if (submission.response) {
      return res.status(400).json({ error: 'Bản trình này đã được phản hồi trước đó.' });
    }

    const { response, note } = req.body;
    const validResponses = ['seen', 'revision_requested', 'accepted'];
    if (!validResponses.includes(response)) {
      return res.status(400).json({ error: 'Giá trị phản hồi không hợp lệ.' });
    }

    if (['revision_requested', 'accepted'].includes(response) && !submission.directive_id) {
      return res.status(400).json({ error: 'Chỉ bản trình gắn với chỉ đạo mới có thể phản hồi accepted hoặc revision_requested.' });
    }

    if (response === 'revision_requested' && (!note || !note.trim())) {
      return res.status(400).json({ error: 'Bắt buộc nhập lý do khi yêu cầu sửa đổi (revision_requested).' });
    }

    await db.execute(
      `UPDATE submissions 
       SET response = ?, response_note = ?, responded_by = ?, responded_at = NOW()
       WHERE id = ?`,
      [response, note || null, userId, submissionId]
    );

    if (submission.directive_id) {
      if (response === 'accepted' || response === 'revision_requested') {
        await db.execute(
          `UPDATE directives SET status = ?, updated_at = NOW() WHERE id = ?`,
          [response, submission.directive_id]
        );
      }
    }

    const [updated] = await db.query('SELECT * FROM submissions WHERE id = ?', [submissionId]);
    res.json(updated[0]);
  }));

  // POST /api/submissions/:id/withdraw
  router.post('/:id/withdraw', asyncRoute(async (req, res) => {
    const submissionId = req.params.id;
    const unitId = req.unit?.id;
    const userId = req.user?.id;

    const [rows] = await db.query('SELECT * FROM submissions WHERE id = ?', [submissionId]);
    const submission = rows[0];
    if (!submission) {
      return res.status(404).json({ error: 'Không tìm thấy bản trình.' });
    }

    if (submission.from_unit_id !== unitId) {
      return res.status(403).json({ error: 'Chỉ đơn vị trình mới có quyền rút lại bản trình.' });
    }

    if (submission.withdrawn_at) {
      return res.status(400).json({ error: 'Bản trình đã được rút trước đó.' });
    }

    if (submission.response) {
      return res.status(400).json({ error: 'Bản trình đã có phản hồi từ đơn vị nhận, không thể rút lại.' });
    }

    await db.execute(
      `UPDATE submissions SET withdrawn_at = NOW() WHERE id = ?`,
      [submissionId]
    );

    if (submission.directive_id) {
      await db.execute(
        `UPDATE directives SET status = 'in_progress', updated_at = NOW() WHERE id = ? AND status = 'submitted'`,
        [submission.directive_id]
      );
    }

    const [updated] = await db.query('SELECT * FROM submissions WHERE id = ?', [submissionId]);
    res.json(updated[0]);
  }));

  return router;
}

module.exports = {
  createSubmissionRoutes
};
